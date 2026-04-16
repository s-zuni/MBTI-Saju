import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Download, Share2, Check, UserPlus, User, Heart } from 'lucide-react';
import { stripMarkdown } from '../utils/textUtils';
import { generatePDF } from '../utils/pdfGenerator';
import ServiceNavigation, { ServiceType } from './ServiceNavigation';
import { experimental_useObject as useObject } from '@ai-sdk/react';
import { compatibilitySchema } from '../config/schemas';
import { SERVICE_COSTS } from '../config/creditConfig';
import { calculateSaju } from '../utils/sajuUtils';

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
    credits?: number | undefined;
    session: any;
    onReset: () => void;
    prefillData?: PrefillData | undefined;
    autoStart?: boolean | undefined;
}

const CompatibilityModalContent: React.FC<CompatibilityContentProps> = ({
    onUseCredit,
    credits,
    session,
    onReset,
    prefillData,
    autoStart = false,
}) => {
    const reportRef = useRef<HTMLDivElement>(null);
    const [localError, setLocalError] = useState<string | null>(null);
    const [isPartnerMode, setIsPartnerMode] = useState<boolean>(true);
    const [relationshipType, setRelationshipType] = useState<string>('lover');
    
    const [targetName, setTargetName] = useState(prefillData?.targetName || '');
    const [targetBirthDate, setTargetBirthDate] = useState(prefillData?.targetBirthDate || '');
    const [targetBirthTime, setTargetBirthTime] = useState(prefillData?.targetBirthTime || '');
    const [targetMbti, setTargetMbti] = useState(prefillData?.targetMbti || '');
    const hasAutoStarted = useRef(false);

    // Streaming Hook
    const { object: result, submit, isLoading, error: analysisError } = useObject({
        api: '/api/compatibility',
        schema: compatibilitySchema,
        headers: {
            'Authorization': `Bearer ${session?.access_token || ''}`
        },
        onFinish: ({ object }) => {
            if (object && onUseCredit) {
                onUseCredit();
            }
        }
    });

    const runAnalysis = async () => {
        // Validation for Partner Mode only if it's explicitly turned on
        if (isPartnerMode && (!targetName || !targetBirthDate || !targetMbti)) {
            setLocalError('상대방 정보를 모두 입력해주세요.');
            return;
        }

        const cost = SERVICE_COSTS.COMPATIBILITY;
        if (credits !== undefined && credits < cost) {
            setLocalError('크레딧이 부족합니다.');
            return;
        }

        try {
            setLocalError(null);
            const metadata = session?.user?.user_metadata;
            if (!metadata) throw new Error('로그인이 필요합니다.');

            const userSajuData = calculateSaju(metadata.birth_date, metadata.birth_time);
            
            let targetSajuData = null;
            if (isPartnerMode) {
                targetSajuData = calculateSaju(targetBirthDate, targetBirthTime);
            }

            submit({
                isPartnerMode,
                relationshipType,
                targetName,
                targetBirthDate,
                targetBirthTime,
                targetMbti,
                userName: metadata.full_name,
                userBirthDate: metadata.birth_date,
                userBirthTime: metadata.birth_time,
                userMbti: metadata.mbti,
                userGender: metadata.gender,
                sajuData: userSajuData,
                targetSajuData
            });
        } catch (e: any) {
            setLocalError(e.message);
        }
    };

    // 자동 분석 로직 고도화
    useEffect(() => {
        if (
            autoStart &&
            !hasAutoStarted.current &&
            prefillData?.targetName &&
            prefillData?.targetBirthDate &&
            prefillData?.targetMbti
        ) {
            hasAutoStarted.current = true;
            setIsPartnerMode(true);
            runAnalysis();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoStart, prefillData]);

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
        if (!userId) {
            alert('공유를 위해 로그인이 필요합니다.');
            return;
        }
        const shareUrl = `${window.location.origin}/share/compatibility/${userId}`;
        navigator.clipboard.writeText(shareUrl).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <div className="px-8 sm:p-12 pb-12 pt-4 overflow-y-auto custom-scrollbar grow bg-white">
            {/* 분석 전 폼 */}
            {!result && !isLoading && (
                <form onSubmit={handleFetchCompatibility} className="space-y-6 animate-fade-up">
                    
                    {/* 분석 모드 선택: 통합된 인터페이스 */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isPartnerMode ? 'bg-pink-100 text-pink-600' : 'bg-slate-200 text-slate-500'}`}>
                                    <Heart className={`w-5 h-5 ${isPartnerMode ? 'fill-pink-600' : ''}`} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-900">상대방 정보 입력</p>
                                    <p className="text-[10px] text-slate-500 font-medium">분석 대상이 있다면 켜주세요</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsPartnerMode(!isPartnerMode)}
                                className={`w-12 h-6 rounded-full transition-colors relative ${isPartnerMode ? 'bg-pink-400' : 'bg-slate-300'}`}
                            >
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isPartnerMode ? 'left-7' : 'left-1'}`} />
                            </button>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">관계 유형</label>
                            <div className="grid grid-cols-3 gap-2">
                                {['lover', 'friend', 'colleague'].map((type) => (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => setRelationshipType(type)}
                                        className={`py-3 rounded-xl text-xs font-bold transition-all border ${
                                            relationshipType === type 
                                            ? 'bg-slate-950 text-white border-slate-950 shadow-md' 
                                            : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'
                                        }`}
                                    >
                                        {type === 'lover' ? '연인' : type === 'friend' ? '친구' : '동료'}
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
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">상대방 MBTI</label>
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
                        disabled={isLoading}
                        className="w-full py-5 bg-slate-950 text-white rounded-full font-black text-lg shadow-2xl hover:scale-[1.02] active:scale-95 transition-all mt-4 flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Heart className="w-5 h-5 fill-white" />}
                        {isPartnerMode ? '심층 궁합 분석하기' : '나의 이상 궁합 찾기'} ({SERVICE_COSTS.COMPATIBILITY} 크레딧)
                    </button>
                    <p className="text-center text-[10px] text-slate-400 font-bold tracking-tight">상담 결과는 마이페이지에 저장됩니다</p>
                </form>
            )}

            {(isLoading || result) && (
                <div ref={reportRef} className="bg-white">
                    {isLoading && !result ? (
                        <div className="flex flex-col justify-center items-center h-80">
                            <Loader2 className="w-12 h-12 text-pink-300 animate-spin mb-6 stroke-[1px]" />
                            <p className="text-slate-500 font-bold text-[10px] tracking-widest uppercase">당신의 인연을 분석하는 중입니다...</p>
                        </div>
                    ) : (analysisError || localError) ? (
                        <div className="flex flex-col items-center justify-center py-20 px-6 text-center animate-fade-up">
                            <div className="w-16 h-16 bg-pink-50 rounded-full flex items-center justify-center mb-6">
                                <Heart className="w-8 h-8 text-pink-400 fill-pink-400" />
                            </div>
                            <h3 className="text-xl font-black text-slate-950 mb-2">분석 중 오류가 발생했습니다</h3>
                            <p className="text-slate-600 text-sm mb-4 leading-relaxed font-bold">
                                {(analysisError?.message || localError) || "원인을 알 수 없는 오류가 발생했습니다."}
                            </p>
                            <button onClick={onReset} className="px-10 py-4 bg-slate-950 text-white rounded-full font-black">
                                다시 시도하기
                            </button>
                        </div>
                    ) : result ? (
                        <div className="space-y-12 animate-fade-up">
                            {/* 점수 원형 - 핑크 악센트 스타일 */}
                            <div className="flex flex-col items-center py-10">
                                <div className="relative w-40 h-40">
                                    <div className="absolute inset-0 rounded-full border-[8px] border-pink-50"></div>
                                    <div
                                        className="absolute inset-0 rounded-full border-[8px] border-pink-400 transition-all duration-1000"
                                        style={{ clipPath: `inset(0 0 0 ${100 - (result?.score || 0)}%)` }}
                                    ></div>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-4xl font-black text-slate-900">{(result?.score ?? 0)}</span>
                                        <span className="text-[10px] font-black text-pink-400 uppercase tracking-widest">Points</span>
                                    </div>
                                </div>
                                <h4 className="mt-8 text-xl font-black text-slate-900 tracking-tight text-center leading-tight max-w-sm px-4">
                                    {stripMarkdown(result?.summary || '')}
                                </h4>
                            </div>

                            {/* 키워드 */}
                            <div className="flex justify-center gap-2 flex-wrap pb-10 border-b border-slate-100">
                                {result?.keywords?.filter((k: any): k is string => !!k).map((k, i) => (
                                    <span key={i} className="px-4 py-2 bg-pink-50 text-pink-600 rounded-lg text-xs font-bold border border-pink-100 shadow-sm">
                                        #{k.trim()}
                                    </span>
                                ))}
                            </div>

                            {/* 상세 분석 (3 color constraint - White/Slate/Black) */}
                            <div className="grid gap-6">
                                <section className="report-section">
                                    <h4 className="report-section-title text-slate-900 flex items-center gap-2 mb-8">
                                        <div className="w-8 h-8 bg-pink-50 rounded-lg flex items-center justify-center">
                                            <Heart className="w-4 h-4 text-pink-500 fill-pink-500" />
                                        </div>
                                        심층 궁합 융합 분석
                                    </h4>
                                    <div className="space-y-6">
                                        <div className="report-card !border-pink-100 hover:border-pink-200 transition-colors">
                                            <div className="flex items-center gap-2 text-pink-500 mb-3">
                                                <div className="w-1.5 h-4 bg-pink-400 rounded-full"></div>
                                                <h5 className="font-black text-lg">나의 MBTI와 어울리는 이상형</h5>
                                            </div>
                                            <p className="text-[15px] font-medium text-slate-700 leading-relaxed">{stripMarkdown(result?.details?.ideal_mbti || '')}</p>
                                        </div>
                                        <div className="report-card !border-pink-100 hover:border-pink-200 transition-colors">
                                            <div className="flex items-center gap-2 text-pink-500 mb-3">
                                                <div className="w-1.5 h-4 bg-pink-400 rounded-full"></div>
                                                <h5 className="font-black text-lg">나의 사주와 어울리는 인연</h5>
                                            </div>
                                            <p className="text-[15px] font-medium text-slate-700 leading-relaxed">{stripMarkdown(result?.details?.ideal_saju || '')}</p>
                                        </div>
                                        <div className="report-card bg-slate-950 text-white !border-none !shadow-2xl relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-pink-500/20 transition-colors"></div>
                                            <div className="flex items-center gap-2 text-pink-300 mb-3 relative z-10">
                                                <div className="w-1.5 h-4 bg-pink-400 rounded-full"></div>
                                                <h5 className="font-black text-lg">종합 궁합 분석 및 조언</h5>
                                            </div>
                                            <p className="text-[15px] font-medium text-slate-300 leading-relaxed relative z-10">{stripMarkdown(result?.details?.overall_compatibility || '')}</p>
                                        </div>
                                    </div>
                                </section>
                            </div>

                            <div className="flex flex-col items-center pt-10 border-t border-slate-100 gap-4">
                                <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
                                    <button
                                        onClick={handleDownloadPDF}
                                        className="px-8 py-5 bg-slate-100 text-slate-950 rounded-full font-black flex items-center justify-center gap-3 hover:bg-slate-200 transition-all flex-1"
                                    >
                                        <Download className="w-5 h-5" /> PDF 저장
                                    </button>
                                    <button
                                        onClick={handleShareLink}
                                        className="px-8 py-5 bg-pink-500 text-white rounded-full font-black shadow-2xl flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all flex-1"
                                    >
                                        {copied ? <Check className="w-5 h-5" /> : <Share2 className="w-5 h-5" />}
                                        {copied ? '링크 복사됨!' : '친구와 결과 공유'}
                                    </button>
                                </div>
                                <button
                                    onClick={onReset}
                                    className="text-slate-500 text-xs font-bold hover:text-slate-950 transition-colors underline underline-offset-4 mt-2"
                                >
                                    다른 인연 분석하기
                                </button>
                            </div>
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    );
};

const CompatibilityModal: React.FC<CompatibilityModalProps> = ({ isOpen, onClose, onNavigate, onUseCredit, credits, session, prefillData }) => {
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
