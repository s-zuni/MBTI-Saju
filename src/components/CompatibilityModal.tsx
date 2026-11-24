import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Download, Share2, Check, Heart } from 'lucide-react';
import { stripMarkdown } from '../utils/textUtils';
import { generatePDF } from '../utils/pdfGenerator';
import ServiceNavigation, { ServiceType } from './ServiceNavigation';
import { experimental_useObject as useObject } from '@ai-sdk/react';
import { compatibilitySchema } from '../config/schemas';
import { SERVICE_COSTS } from '../config/creditConfig';
import { safeCalculateSaju } from '../utils/sajuUtils';
import { getRandomLoadingMessage } from '../config/loadingMessages';
import { useGuestProfile } from '../hooks/useGuestProfile';
import GuestProfileCard from './GuestProfileCard';
import FunnelBottomCta from './FunnelBottomCta';
import ReportErrorBoundary from './common/ReportErrorBoundary';
import StreamingStatusBanner from './common/StreamingStatusBanner';
import { buildServiceRequestHeaders, consumePaidServiceTicket, startServicePayment } from '../utils/servicePayCheckout';

interface PrefillData {
    targetName: string;
    targetMbti: string;
    targetBirthDate: string;
    targetBirthTime: string;
}

interface CompatibilityModalProps {
    isOpen: boolean;
    onClose: () => void;
    onNavigate: (service: ServiceType) => void;
    onUseCredit?: (() => Promise<boolean>) | undefined;
    refreshCredits?: (() => Promise<void> | void) | undefined;
    onSuccess?: (() => void) | undefined;
    credits?: number | undefined;
    session: any;
    prefillData?: PrefillData | undefined;
}

const BIRTH_TIME_SLOTS = [
    { value: '', label: '시간 모름' },
    { value: '23:00-01:00', label: '자시 (23:00~01:00)' },
    { value: '01:00-03:00', label: '축시 (01:00~03:00)' },
    { value: '03:00-05:00', label: '인시 (03:00~05:00)' },
    { value: '05:00-07:00', label: '묘시 (05:00~07:00)' },
    { value: '07:00-09:00', label: '진시 (07:00~09:00)' },
    { value: '09:00-11:00', label: '사시 (09:00~11:00)' },
    { value: '11:00-13:00', label: '오시 (11:00~13:00)' },
    { value: '13:00-15:00', label: '미시 (13:00~15:00)' },
    { value: '15:00-17:00', label: '신시 (15:00~17:00)' },
    { value: '17:00-19:00', label: '유시 (17:00~19:00)' },
    { value: '19:00-21:00', label: '술시 (19:00~21:00)' },
    { value: '21:00-23:00', label: '해시 (21:00~23:00)' },
];

interface CompatibilityContentProps {
    onUseCredit?: (() => Promise<boolean>) | undefined;
    refreshCredits?: (() => Promise<void> | void) | undefined;
    onSuccess?: (() => void) | undefined;
    credits?: number | undefined;
    session: any;
    onReset: () => void;
    prefillData?: PrefillData | undefined;
    autoStart?: boolean | undefined;
}

const CompatibilityModalContent: React.FC<CompatibilityContentProps> = ({
    refreshCredits,
    onSuccess,
    session,
    onReset,
    prefillData,
}) => {
    const { profile, updateProfile } = useGuestProfile();
    const reportRef = useRef<HTMLDivElement>(null);
    const ticketCheckedRef = useRef(false);
    const receiptTokenRef = useRef<string | null>(null);
    const lastPayloadRef = useRef<any>(null);
    const [hasStarted, setHasStarted] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);
    const [isPaying, setIsPaying] = useState<boolean>(false);
    const [isPartnerMode, setIsPartnerMode] = useState<boolean>(true);
    const [relationshipType, setRelationshipType] = useState<string>('lover');
    
    const [targetName, setTargetName] = useState(prefillData?.targetName || '');
    const [targetBirthDate, setTargetBirthDate] = useState(prefillData?.targetBirthDate || '');
    const [targetBirthTime, setTargetBirthTime] = useState(prefillData?.targetBirthTime || '');
    const [targetMbti, setTargetMbti] = useState(prefillData?.targetMbti || '');
    const [currentLoadingMessage, setCurrentLoadingMessage] = useState('');


    // Streaming Hook
    const { object: result, submit, isLoading, error: analysisError } = useObject({
        api: '/api/compatibility',
        schema: compatibilitySchema,
        headers: () => buildServiceRequestHeaders(receiptTokenRef.current),
        onFinish: ({ object, error: validationError }) => {
            if (object) {
                setLocalError(null);
                if (refreshCredits) {
                    refreshCredits();
                }
                if (onSuccess) {
                    onSuccess();
                }
            } else {
                console.error('[CompatibilityModal] Result validation failed:', validationError);
                setLocalError('분석 결과를 생성하지 못했습니다. 아래 [다시 시도하기]를 눌러 주세요.');
            }
        },
        onError: (err) => {
            console.error('[CompatibilityModal] Analysis failed:', err);
            setLocalError('분석 중 일시적인 오류가 발생했습니다. 아래 [다시 시도하기]를 눌러 주세요.');
        }
    });

    useEffect(() => {
        if (ticketCheckedRef.current) return;
        ticketCheckedRef.current = true;
        const ticket = consumePaidServiceTicket('COMPATIBILITY');
        if (ticket?.payload) {
            receiptTokenRef.current = ticket.receiptToken || null;
            lastPayloadRef.current = ticket.payload;
            setHasStarted(true);
            const p = ticket.payload;
            if (typeof p.isPartnerMode === 'boolean') setIsPartnerMode(p.isPartnerMode);
            if (p.relationshipType) setRelationshipType(p.relationshipType);
            if (p.targetName) setTargetName(p.targetName);
            if (p.targetBirthDate) setTargetBirthDate(p.targetBirthDate);
            if (p.targetBirthTime) setTargetBirthTime(p.targetBirthTime);
            if (p.targetMbti && p.targetMbti !== '미입력') setTargetMbti(p.targetMbti);
            submit(p);
        }
    }, [submit]);

    const handleRetry = () => {
        if (!lastPayloadRef.current) return;
        setLocalError(null);
        submit(lastPayloadRef.current);
    };

    // 로딩 메시지 순환 효과
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isLoading && !result) {
            setCurrentLoadingMessage(getRandomLoadingMessage('compatibility'));
            interval = setInterval(() => {
                setCurrentLoadingMessage(getRandomLoadingMessage('compatibility'));
            }, 5000);
        }
        return () => clearInterval(interval);
    }, [isLoading, result]);

    const runAnalysis = async () => {
        if (!profile.birthDate) {
            setLocalError('내 생년월일을 입력해주세요.');
            return;
        }
        // Validation for Partner Mode only if it's explicitly turned on
        if (isPartnerMode && (!targetName || !targetBirthDate)) {
            setLocalError('상대방 이름과 생년월일을 입력해주세요.');
            return;
        }

        const userSajuData = safeCalculateSaju(profile.birthDate, profile.birthTime, profile.gender);
        if (!userSajuData) {
            setLocalError('본인의 유효한 생년월일(1900~2050년)을 입력해주세요.');
            return;
        }

        let targetSajuData = null;
        if (isPartnerMode) {
            targetSajuData = safeCalculateSaju(targetBirthDate, targetBirthTime);
            if (!targetSajuData) {
                setLocalError('상대방의 유효한 생년월일(1900~2050년)을 입력해주세요.');
                return;
            }
        }

        setIsPaying(true);
        try {
            setLocalError(null);

            const res = await startServicePayment({
                serviceType: 'COMPATIBILITY',
                serviceName: isPartnerMode ? 'MBTI × 사주 심층 궁합' : '나의 이상 궁합 찾기',
                returnPath: '/?openService=compatibility',
                payload: {
                    isPartnerMode,
                    relationshipType,
                    targetName,
                    targetBirthDate,
                    targetBirthTime,
                    targetMbti: targetMbti || '미입력',
                    userName: profile.name || '이용자',
                    userBirthDate: profile.birthDate,
                    userBirthTime: profile.birthTime,
                    userMbti: profile.mbti || '미입력',
                    userGender: profile.gender,
                    sajuData: userSajuData,
                    targetSajuData,
                },
                customerName: profile.name || '비회원',
            });
            if (!res.success && res.error_msg) {
                setLocalError(res.error_msg);
            }
        } catch (e: any) {
            setLocalError(e.message || '결제 요청 중 오류가 발생했습니다.');
        } finally {
            setIsPaying(false);
        }
    };

    const handleFetchCompatibility = async (e: React.FormEvent) => {
        e.preventDefault();
        await runAnalysis();
    };

    const handleDownloadPDF = async () => {
        if (!reportRef.current || !result) return;
        try {
            await generatePDF(reportRef.current, `Compatibility_Report_${targetName || 'Ideal'}`);
        } catch (err) {
            alert('PDF 생성 중 오류가 발생했습니다.');
        }
    };

    const [copied, setCopied] = useState(false);
    const handleShareLink = () => {
        const userId = session?.user?.id;
        const shareUrl = userId
            ? `${window.location.origin}/share/compatibility/${userId}`
            : `${window.location.origin}/?openService=compatibility`;
        navigator.clipboard.writeText(shareUrl).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <div className="px-6 sm:p-10 pb-12 pt-4 overflow-y-auto custom-scrollbar grow bg-white">
            {/* 분석 전 폼 */}
            {!result && !isLoading && !hasStarted && (
                <form onSubmit={handleFetchCompatibility} className="space-y-6 animate-fade-up">
                    <GuestProfileCard
                        profile={profile}
                        onChange={updateProfile}
                        showName
                        compact
                        title="내 정보 (사주 · MBTI)"
                    />
                    
                    {/* 분석 모드 선택: 탭 스타일 */}
                    <div className="space-y-6">
                        <div className="flex p-1 bg-slate-100 rounded-2xl">
                            <button
                                type="button"
                                onClick={() => setIsPartnerMode(true)}
                                className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${isPartnerMode ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <Heart className={`w-3.5 h-3.5 ${isPartnerMode ? 'fill-pink-500 text-pink-500' : ''}`} />
                                상대와 궁합 분석
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsPartnerMode(false)}
                                className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${!isPartnerMode ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <Heart className={`w-3.5 h-3.5 ${!isPartnerMode ? 'fill-pink-500 text-pink-500' : ''}`} />
                                내 이상형 찾기 (솔로)
                            </button>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">관계 유형</label>
                            <div className="grid grid-cols-4 gap-2">
                                {[
                                    { id: 'lover', label: '연인' },
                                    { id: 'friend', label: '친구' },
                                    { id: 'boss', label: '상사' },
                                    { id: 'colleague', label: '동료' }
                                ].map((type) => (
                                    <button
                                        key={type.id}
                                        type="button"
                                        onClick={() => setRelationshipType(type.id)}
                                        className={`py-3 rounded-xl text-[11px] font-bold transition-all border ${
                                            relationshipType === type.id 
                                            ? 'bg-slate-950 text-white border-slate-950 shadow-md' 
                                            : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'
                                        }`}
                                    >
                                        {type.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {isPartnerMode ? (
                        <div className="space-y-4 animate-fade-in">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">상대방 이름</label>
                                    <input
                                        type="text"
                                        value={targetName}
                                        onChange={(e) => setTargetName(e.target.value)}
                                        className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 placeholder:text-slate-300 focus:ring-2 focus:ring-pink-100"
                                        placeholder="이름 입력"
                                        readOnly={!!prefillData?.targetName}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">상대방 MBTI (선택)</label>
                                    <input
                                        type="text"
                                        value={targetMbti}
                                        onChange={(e) => setTargetMbti(e.target.value.toUpperCase())}
                                        className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 placeholder:text-slate-300 focus:ring-2 focus:ring-pink-100"
                                        placeholder="예: ENFP"
                                        maxLength={4}
                                        readOnly={!!prefillData?.targetMbti}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">상대방 생년월일</label>
                                    <input
                                        type="date"
                                        value={targetBirthDate}
                                        onChange={(e) => setTargetBirthDate(e.target.value)}
                                        className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-pink-100"
                                        readOnly={!!prefillData?.targetBirthDate}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">태어난 시간</label>
                                    <select
                                        value={targetBirthTime}
                                        onChange={(e) => setTargetBirthTime(e.target.value)}
                                        className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-bold appearance-none text-slate-900 focus:ring-2 focus:ring-pink-100"
                                    >
                                        {BIRTH_TIME_SLOTS.map((slot) => (
                                            <option key={slot.value} value={slot.value}>{slot.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="p-6 bg-pink-50/50 rounded-2xl border border-pink-100 animate-fade-in">
                            <p className="text-sm font-medium text-pink-600 leading-relaxed">
                                상대방 정보를 입력하지 않으셨습니다.<br/>
                                <span className="font-bold">당신의 MBTI와 사주에 기반한 '최고의 이상형'</span>을 분석해 드립니다.
                            </p>
                        </div>
                    )}

                    {localError && (
                        <div className="p-4 bg-red-50 text-red-600 rounded-xl text-xs font-bold flex items-center gap-2 animate-shake">
                            <div className="w-1 h-1 bg-red-600 rounded-full" />
                            {localError}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading || isPaying}
                        className="w-full py-5 bg-slate-950 text-white rounded-full font-black text-lg shadow-2xl hover:scale-[1.02] active:scale-95 transition-all mt-4 flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                        {isLoading || isPaying ? <Loader2 className="w-5 h-5 animate-spin" /> : <Heart className="w-5 h-5 fill-white" />}
                        {isPaying
                            ? '결제 창 여는 중...'
                            : `${isPartnerMode ? '심층 궁합 분석하기' : '나의 이상 궁합 찾기'} (${SERVICE_COSTS.COMPATIBILITY.toLocaleString()}원 결제)`}
                    </button>
                    <p className="text-center text-[10px] text-slate-400 font-bold tracking-tight">결제 직후 현재 화면에서 바로 분석 결과를 확인하실 수 있습니다</p>
                </form>
            )}

            {(isLoading || result || hasStarted) && (
                <div ref={reportRef} className="bg-white space-y-6">
                    <StreamingStatusBanner
                        isStreaming={isLoading}
                        hasData={!!result}
                        error={!result ? (localError || analysisError?.message || null) : null}
                        onRetry={handleRetry}
                        streamingTitle={currentLoadingMessage || '결제가 완료되어 궁합 풀이를 실시간으로 작성하고 있습니다'}
                        streamingSubtitle="완성되는 항목부터 아래에 바로 표시됩니다."
                        completedText="심층 궁합 풀이가 완료되었습니다."
                    />

                    {result && (
                        <ReportErrorBoundary onRetry={handleRetry}>
                            <div className="space-y-10 animate-fade-up text-left">
                                {/* 점수 원형 */}
                                <div className="flex flex-col items-center py-6">
                                    <div className="relative w-36 h-36 flex items-center justify-center">
                                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 144 144">
                                            <circle cx="72" cy="72" r="60" stroke="#fce7f3" strokeWidth="10" fill="transparent" />
                                            <circle
                                                cx="72"
                                                cy="72"
                                                r="60"
                                                stroke="#ec4899"
                                                strokeWidth="10"
                                                fill="transparent"
                                                strokeDasharray={377}
                                                strokeDashoffset={377 - (377 * Math.min(100, Math.max(0, result?.score || 0))) / 100}
                                                strokeLinecap="round"
                                                className="transition-all duration-1000 ease-out"
                                            />
                                        </svg>
                                        <div className="absolute flex flex-col items-center justify-center">
                                            <span className="text-3xl font-bold text-slate-950 leading-none">{result?.score ?? 0}</span>
                                            <span className="text-xs font-bold text-pink-600 mt-1.5">궁합점수</span>
                                        </div>
                                    </div>
                                    {result?.summary && (
                                        <h4 className="mt-6 text-lg sm:text-xl font-bold text-slate-900 tracking-tight text-center leading-relaxed max-w-md px-2 break-keep">
                                            {stripMarkdown(result.summary)}
                                        </h4>
                                    )}
                                </div>

                                {/* 키워드 */}
                                {Array.isArray(result?.keywords) && result.keywords.length > 0 && (
                                    <div className="flex justify-center gap-2 flex-wrap pb-8 border-b border-stone-200">
                                        {result.keywords.filter((k: any): k is string => !!k).map((k, i) => (
                                            <span key={i} className="px-3.5 py-1.5 bg-pink-50 text-pink-700 rounded-full text-sm font-semibold border border-pink-200">
                                                #{k.replace(/^#/, '').trim()}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* 상세 분석 */}
                                <section className="report-section space-y-6">
                                    <h4 className="report-section-title">심층 궁합 융합 분석</h4>
                                    <div className="space-y-5">
                                        {result?.details?.ideal_mbti && (
                                            <div className="report-card border-pink-200/80 space-y-2">
                                                <h5 className="font-bold text-lg sm:text-xl text-pink-700">성향과 일상 호흡 분석</h5>
                                                <p className="text-[15px] sm:text-base text-slate-800 leading-[1.9] whitespace-pre-wrap break-keep">
                                                    {stripMarkdown(result.details.ideal_mbti)}
                                                </p>
                                            </div>
                                        )}
                                        {result?.details?.ideal_saju && (
                                            <div className="report-card border-pink-200/80 space-y-2">
                                                <h5 className="font-bold text-lg sm:text-xl text-pink-700">사주 원국과 오행 궁합</h5>
                                                <p className="text-[15px] sm:text-base text-slate-800 leading-[1.9] whitespace-pre-wrap break-keep">
                                                    {stripMarkdown(result.details.ideal_saju)}
                                                </p>
                                            </div>
                                        )}
                                        {result?.details?.overall_compatibility && (
                                            <div className="report-card bg-slate-900 text-white border-slate-800 space-y-3">
                                                <h5 className="font-bold text-lg sm:text-xl text-pink-200">종합 궁합 분석 및 현실 조언</h5>
                                                <p className="text-[15px] sm:text-base text-slate-100 leading-[1.95] whitespace-pre-wrap break-keep">
                                                    {stripMarkdown(result.details.overall_compatibility)}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </section>

                                {!isLoading && (
                                    <>
                                        <div className="flex flex-col items-center pt-8 border-t border-stone-200 gap-4">
                                            <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
                                                <button
                                                    onClick={handleDownloadPDF}
                                                    className="px-6 py-4 bg-stone-100 text-slate-950 rounded-full font-bold text-sm flex items-center justify-center gap-2 hover:bg-stone-200 transition-colors flex-1"
                                                >
                                                    <Download className="w-4 h-4" /> PDF 저장
                                                </button>
                                                <button
                                                    onClick={handleShareLink}
                                                    className="px-6 py-4 bg-pink-600 text-white rounded-full font-bold text-sm flex items-center justify-center gap-2 hover:bg-pink-700 transition-colors flex-1"
                                                >
                                                    {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                                                    {copied ? '링크 복사됨!' : '친구와 결과 공유'}
                                                </button>
                                            </div>
                                            <button
                                                onClick={onReset}
                                                className="text-stone-600 text-sm font-semibold hover:text-slate-950 transition-colors underline underline-offset-4 mt-2"
                                            >
                                                다른 인연 분석하기
                                            </button>
                                        </div>

                                        <FunnelBottomCta from="compatibility_modal_result" />
                                    </>
                                )}
                            </div>
                        </ReportErrorBoundary>
                    )}
                </div>
            )}
        </div>
    );
};

const CompatibilityModal: React.FC<CompatibilityModalProps> = ({ isOpen, onClose, onNavigate, onUseCredit, refreshCredits, onSuccess, credits, session, prefillData }) => {
    const [resetKey, setResetKey] = useState(0);

    useEffect(() => {
        if (isOpen) {
            setResetKey(prev => prev + 1);
        }
    }, [isOpen]);

    // ESC 키로 닫기
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            window.addEventListener('keydown', handleEsc);
        }
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    // prefillData가 있으면 자동 시작
    const hasAllPrefill = !!(
        prefillData?.targetName &&
        prefillData?.targetBirthDate &&
        prefillData?.targetMbti
    );

    return (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl overflow-y-auto h-full w-full flex justify-center items-center z-[1000] p-4">
            <div className="relative w-full max-w-2xl bg-white rounded-[48px] max-h-[94vh] overflow-hidden flex flex-col shadow-2xl">
                <ServiceNavigation currentService="compatibility" onNavigate={onNavigate} onClose={onClose} />

                <div className="p-8 sm:p-12 pb-4 shrink-0 bg-white">
                    <div className="flex justify-between items-end">
                        <div>
                            <div className="flex items-center gap-2 text-pink-500 font-black tracking-widest text-[10px] uppercase mb-1.5">
                                <Heart className="w-4 h-4 text-pink-400 fill-pink-400" /> Destiny Harmony
                            </div>
                            <h3 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tighter uppercase">심층 궁합 분석</h3>
                        </div>
                    </div>
                    <div className="h-[2px] w-full bg-slate-950 mt-8"></div>
                </div>

                <CompatibilityModalContent
                    key={resetKey}
                    onReset={() => setResetKey(prev => prev + 1)}
                    onUseCredit={onUseCredit}
                    refreshCredits={refreshCredits}
                    onSuccess={onSuccess}
                    credits={credits}
                    session={session}
                    prefillData={prefillData}
                    autoStart={hasAllPrefill}
                />
            </div>
        </div>
    );
};

export default CompatibilityModal;
