import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Loader2, Instagram, ChevronLeft, Coins, Check, Share2 } from 'lucide-react';
import { SERVICE_COSTS } from '../config/creditConfig';
import { calculateSaju } from '../utils/sajuUtils';
import { experimental_useObject as useObject } from '@ai-sdk/react';
import { compatibilitySchema } from '../config/schemas';
import { getRandomLoadingMessage } from '../config/loadingMessages';
import { generateImage } from '../utils/exportUtils';
import CompatibilityShareCard from '../components/CompatibilityShareCard';
import { stripMarkdown } from '../utils/textUtils';
import { useAuth } from '../hooks/useAuth';
import { useCredits } from '../hooks/useCredits';
import { useModalStore } from '../hooks/useModalStore';

const MBTI_LIST = [
    'ISTJ', 'ISFJ', 'INFJ', 'INTJ',
    'ISTP', 'ISFP', 'INFP', 'INTP',
    'ESTP', 'ESFP', 'ENFP', 'ENTP',
    'ESTJ', 'ESFJ', 'ENFJ', 'ENTJ',
];

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

const RelationshipPage: React.FC<{ session?: any }> = ({ session: propSession }) => {
    const navigate = useNavigate();
    const { session: authSession, loading: isAuthLoading } = useAuth();
    const session = propSession || authSession;
    const { credits, useCredits: consumeCredits } = useCredits(session);
    const { openModal } = useModalStore();

    // Mode: partner vs solo
    const [isPartnerMode, setIsPartnerMode] = useState<boolean>(true);
    const [relationshipType, setRelationshipType] = useState<string>('lover');

    // Partner Inputs
    const [targetName, setTargetName] = useState('');
    const [targetMbti, setTargetMbti] = useState('');
    const [targetBirthDate, setTargetBirthDate] = useState('');
    const [targetBirthTime, setTargetBirthTime] = useState('');

    const [formError, setFormError] = useState('');
    const [isFormSubmitted, setIsFormSubmitted] = useState(false);
    const [currentLoadingMessage, setCurrentLoadingMessage] = useState('');

    const shareRef = useRef<HTMLDivElement>(null);
    const [isSharing, setIsSharing] = useState(false);
    const [copied, setCopied] = useState(false);

    // Streaming Hook
    const { object: result, submit, isLoading, error: analysisError } = useObject({
        api: '/api/compatibility',
        schema: compatibilitySchema,
        headers: {
            'Authorization': `Bearer ${session?.access_token || ''}`
        },
        onFinish: async ({ object }) => {
            if (object) {
                await consumeCredits('COMPATIBILITY');
            }
        }
    });

    // Cycle loading messages
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

    const handleStartAnalysis = (e: React.FormEvent) => {
        e.preventDefault();
        setFormError('');

        if (isPartnerMode) {
            if (!targetName.trim()) {
                setFormError('상대방 이름을 입력해주세요.');
                return;
            }
            if (!targetMbti || targetMbti.length !== 4) {
                setFormError('상대방 MBTI를 선택해주세요.');
                return;
            }
            if (!targetBirthDate) {
                setFormError('상대방 생년월일을 입력해주세요.');
                return;
            }
        }

        const cost = SERVICE_COSTS.COMPATIBILITY;
        if (credits !== undefined && credits < cost) {
            openModal('creditPurchase', undefined, { requiredCredits: cost });
            return;
        }

        setIsFormSubmitted(true);
        runAnalysis();
    };

    const runAnalysis = async () => {
        try {
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
                targetName: isPartnerMode ? targetName : '',
                targetBirthDate: isPartnerMode ? targetBirthDate : '',
                targetBirthTime: isPartnerMode ? targetBirthTime : '',
                targetMbti: isPartnerMode ? targetMbti : '',
                userName: metadata.full_name,
                userBirthDate: metadata.birth_date,
                userBirthTime: metadata.birth_time,
                userMbti: metadata.mbti,
                userGender: metadata.gender,
                sajuData: userSajuData,
                targetSajuData
            });
        } catch (e: any) {
            setFormError(e.message);
            setIsFormSubmitted(false);
        }
    };

    const handleShareInstagram = async () => {
        if (!shareRef.current || !result) return;
        setIsSharing(true);
        try {
            const fileName = `MBTIJU_Compatibility_Story_${new Date().getTime()}`;
            await generateImage(shareRef.current, fileName);
            alert('인스타그램 스토리용 이미지가 다운로드되었습니다.');
        } catch (err) {
            alert('이미지 생성 중 오류가 발생했습니다.');
        } finally {
            setIsSharing(false);
        }
    };

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

    const handleReset = () => {
        setIsFormSubmitted(false);
        setTargetName('');
        setTargetMbti('');
        setTargetBirthDate('');
        setTargetBirthTime('');
        setFormError('');
    };

    if (isAuthLoading) return null;
    if (!session) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
                <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mb-6">
                    <Heart className="w-10 h-10 text-rose-500 fill-rose-500/20" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-4">로그인이 필요합니다</h2>
                <p className="text-slate-500 mb-8">심층 궁합 분석 서비스를 이용하시려면 로그인이 필요합니다.</p>
                <button
                    onClick={() => {
                        navigate('/');
                        setTimeout(() => openModal('analysis', 'login'), 100);
                    }}
                    className="px-8 py-4 bg-slate-950 text-white font-bold rounded-2xl shadow-xl hover:bg-rose-600 transition-all active:scale-95 animate-bounce"
                >
                    로그인하고 시작하기
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-32 pt-20 animate-fade-in">
            <div className="max-w-2xl mx-auto px-4">
                {/* Header Navigation */}
                <div className="flex items-center justify-between mb-8 px-4">
                    <button 
                        onClick={() => isFormSubmitted ? setIsFormSubmitted(false) : navigate('/fortune')}
                        className="p-2 hover:bg-white rounded-full transition-colors"
                    >
                        <ChevronLeft className="w-6 h-6 text-slate-600" />
                    </button>
                    <div className="flex items-center gap-1 px-3 py-1.5 bg-rose-100 text-rose-600 rounded-full text-sm font-bold">
                        <Coins className="w-4 h-4" />
                        {credits}
                    </div>
                </div>

                <div className="bg-white rounded-[48px] shadow-2xl shadow-rose-100/50 overflow-hidden border border-white flex flex-col">
                    <div className="p-10 pb-4 border-b border-slate-50">
                        <div className="flex justify-between items-end">
                            <div className="flex items-center gap-2 text-rose-500 font-black tracking-widest text-[10px] uppercase mb-2">
                                <Heart className="w-4 h-4 text-rose-400 fill-rose-400" /> Destiny Harmony
                            </div>
                        </div>
                        <h1 className="text-4xl font-black text-slate-950 tracking-tighter leading-none">심층 궁합 분석</h1>
                    </div>

                    <div className="p-10">
                        {!isFormSubmitted ? (
                            <form onSubmit={handleStartAnalysis} className="space-y-8 animate-fade-in">
                                {/* Mode Selection */}
                                <div className="space-y-4">
                                    <div className="flex p-1.5 bg-slate-100 rounded-2xl w-full">
                                        <button
                                            type="button"
                                            onClick={() => setIsPartnerMode(true)}
                                            className={`flex-1 py-4 text-sm font-bold rounded-xl transition-all ${isPartnerMode ? 'bg-white shadow-md text-rose-600' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            상대와 궁합 분석
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setIsPartnerMode(false)}
                                            className={`flex-1 py-4 text-sm font-bold rounded-xl transition-all ${!isPartnerMode ? 'bg-white shadow-md text-rose-600' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            내 이상형 찾기 (솔로)
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest block pl-1">관계 유형</label>
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
                                                className={`py-4 rounded-2xl text-sm font-bold transition-all border ${
                                                    relationshipType === type.id 
                                                    ? 'bg-slate-950 text-white border-slate-950 shadow-md' 
                                                    : 'bg-white text-slate-400 border-slate-150 hover:border-slate-300'
                                                }`}
                                            >
                                                {type.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {isPartnerMode ? (
                                    <div className="space-y-8 animate-fade-in">
                                        {/* Name */}
                                        <div className="space-y-4">
                                            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest block">상대방 이름</label>
                                            <input
                                                type="text"
                                                value={targetName}
                                                onChange={(e) => setTargetName(e.target.value)}
                                                placeholder="이름을 입력하세요"
                                                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-300 transition-all"
                                                maxLength={10}
                                            />
                                        </div>

                                        {/* MBTI Grid */}
                                        <div className="space-y-4">
                                            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest block">상대방 MBTI</label>
                                            <div className="grid grid-cols-4 gap-2">
                                                {MBTI_LIST.map((m) => (
                                                    <button
                                                        key={m}
                                                        type="button"
                                                        onClick={() => setTargetMbti(m)}
                                                        className={`py-3 rounded-xl text-xs font-black transition-all ${
                                                            targetMbti === m
                                                                ? 'bg-rose-500 text-white shadow-lg shadow-rose-200 scale-105'
                                                                : 'bg-slate-50 text-slate-600 hover:bg-rose-50 hover:text-rose-600'
                                                        }`}
                                                    >
                                                        {m}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* BirthDate & Time */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-4">
                                                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest block">상대방 생년월일</label>
                                                <input
                                                    type="date"
                                                    value={targetBirthDate}
                                                    onChange={(e) => setTargetBirthDate(e.target.value)}
                                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-300 transition-all"
                                                />
                                            </div>
                                            <div className="space-y-4">
                                                <label className="text-[11px] font-black text-slate-500 tracking-widest block">태어난 시간 <span className="text-slate-300">(선택)</span></label>
                                                <select
                                                    value={targetBirthTime}
                                                    onChange={(e) => setTargetBirthTime(e.target.value)}
                                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold appearance-none text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-300 transition-all"
                                                >
                                                    {BIRTH_TIME_SLOTS.map((slot) => (
                                                        <option key={slot.value} value={slot.value}>{slot.label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-6 bg-rose-50/50 rounded-2xl border border-rose-100 animate-fade-in">
                                        <p className="text-sm font-medium text-rose-600 leading-relaxed break-keep">
                                            상대방 정보를 입력하지 않으셨습니다.<br/>
                                            <span className="font-bold">당신의 MBTI와 사주에 기반한 '최고의 이상형'</span>과 운명적 관계 특징을 분석해 드립니다.
                                        </p>
                                    </div>
                                )}

                                {formError && (
                                    <div className="p-4 bg-red-50 border border-red-100 rounded-2xl">
                                        <p className="text-red-600 text-sm font-bold">{formError}</p>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    className="w-full py-6 bg-slate-950 text-white rounded-[32px] font-black text-xl shadow-2xl hover:bg-rose-600 transition-all active:scale-[0.98] flex flex-col items-center justify-center gap-2"
                                >
                                    <span>궁합 분석 시작하기</span>
                                    <span className="text-xs text-rose-400 font-bold tracking-widest">{SERVICE_COSTS.COMPATIBILITY} 크레딧 차감</span>
                                </button>
                            </form>
                        ) : (
                            <div className="animate-fade-in">
                                {isLoading && !result ? (
                                    <div className="flex flex-col justify-center items-center py-20 px-6 text-center">
                                        <div className="relative mb-12">
                                            <div className="w-20 h-20 border-4 border-rose-100 rounded-full"></div>
                                            <div className="absolute top-0 left-0 w-20 h-20 border-4 border-t-rose-500 rounded-full animate-spin"></div>
                                        </div>
                                        <div className="space-y-4">
                                            <p className="text-slate-950 font-black text-2xl tracking-tight">
                                                {currentLoadingMessage || '두 사람의 에너지를 읽는 중...'}
                                            </p>
                                            <p className="text-slate-400 font-bold text-xs tracking-widest uppercase">
                                                정밀 궁합 매칭 중
                                            </p>
                                        </div>
                                    </div>
                                ) : (analysisError || formError) ? (
                                    <div className="text-center py-20 bg-red-50 rounded-[40px] px-6">
                                        <p className="text-red-600 font-black text-lg mb-6">
                                            {(analysisError?.message || formError) || "궁합 분석 중 오류가 발생했습니다."}
                                        </p>
                                        <button 
                                            onClick={handleReset} 
                                            className="px-10 py-4 bg-slate-950 text-white rounded-2xl font-bold hover:bg-slate-800 transition-colors"
                                        >
                                            다시 설정하기
                                        </button>
                                    </div>
                                ) : result ? (
                                    <div className="space-y-12 animate-fade-up">
                                        {/* Score Circle */}
                                        <div className="flex flex-col items-center py-10">
                                            <div className="relative w-40 h-40">
                                                <div className="absolute inset-0 rounded-full border-[8px] border-rose-50"></div>
                                                <div
                                                    className="absolute inset-0 rounded-full border-[8px] border-rose-400 transition-all duration-1000"
                                                    style={{ clipPath: `inset(0 0 0 ${100 - (result?.score || 0)}%)` }}
                                                ></div>
                                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                    <span className="text-4xl font-black text-slate-900">{(result?.score ?? 0)}</span>
                                                    <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">궁합 점수</span>
                                                </div>
                                            </div>
                                            <h4 className="mt-8 text-xl font-black text-slate-900 tracking-tight text-center leading-tight max-w-sm px-4 break-keep">
                                                {stripMarkdown(result?.summary || '')}
                                            </h4>
                                        </div>

                                        {/* Keywords */}
                                        <div className="flex justify-center gap-2 flex-wrap pb-10 border-b border-slate-100">
                                            {result?.keywords?.filter((k: any): k is string => !!k).map((k, i) => (
                                                <span key={i} className="px-4 py-2 bg-rose-50 text-rose-600 rounded-lg text-xs font-bold border border-rose-100 shadow-sm">
                                                    #{k.trim()}
                                                </span>
                                            ))}
                                        </div>

                                        {/* Details Layout */}
                                        <div className="grid gap-6">
                                            <section className="space-y-8">
                                                <h4 className="text-xl font-black text-slate-900 flex items-center gap-2 mb-4">
                                                    <div className="w-8 h-8 bg-rose-50 rounded-lg flex items-center justify-center">
                                                        <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                                                    </div>
                                                    심층 궁합 융합 분석
                                                </h4>
                                                
                                                <div className="space-y-6">
                                                    <div className="p-6 rounded-3xl border border-rose-100 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all">
                                                        <div className="flex items-center gap-2 text-rose-500 mb-3">
                                                            <div className="w-1.5 h-4 bg-rose-400 rounded-full"></div>
                                                            <h5 className="font-black text-lg">나의 MBTI와 어울리는 이상형</h5>
                                                        </div>
                                                        <p className="text-[15px] font-medium text-slate-700 leading-relaxed whitespace-pre-wrap break-keep">
                                                            {stripMarkdown(result?.details?.ideal_mbti || '')}
                                                        </p>
                                                    </div>

                                                    <div className="p-6 rounded-3xl border border-rose-100 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all">
                                                        <div className="flex items-center gap-2 text-rose-500 mb-3">
                                                            <div className="w-1.5 h-4 bg-rose-400 rounded-full"></div>
                                                            <h5 className="font-black text-lg">나의 사주와 어울리는 인연</h5>
                                                        </div>
                                                        <p className="text-[15px] font-medium text-slate-700 leading-relaxed whitespace-pre-wrap break-keep">
                                                            {stripMarkdown(result?.details?.ideal_saju || '')}
                                                        </p>
                                                    </div>

                                                    <div className="p-8 rounded-[40px] bg-slate-950 text-white shadow-2xl relative overflow-hidden group">
                                                        <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-rose-500/20 transition-colors"></div>
                                                        <div className="flex items-center gap-2 text-rose-300 mb-6 relative z-10">
                                                            <div className="w-1.5 h-4 bg-rose-400 rounded-full"></div>
                                                            <h5 className="font-black text-lg">종합 궁합 분석 및 조언</h5>
                                                        </div>
                                                        <p className="text-[15px] font-medium text-slate-300 leading-relaxed relative z-10 whitespace-pre-wrap break-keep">
                                                            {stripMarkdown(result?.details?.overall_compatibility || '')}
                                                        </p>
                                                    </div>
                                                </div>
                                            </section>
                                        </div>

                                        {/* Hidden Share Card */}
                                        <div className="fixed left-[-9999px] top-[-9999px]">
                                            {result && (
                                                <CompatibilityShareCard
                                                    ref={shareRef}
                                                    result={result as any}
                                                    isPartnerMode={isPartnerMode}
                                                    userName={session?.user?.user_metadata?.full_name || '사용자'}
                                                    targetName={targetName || '상대방'}
                                                />
                                            )}
                                        </div>

                                        {/* Action buttons */}
                                        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8 border-t border-slate-100">
                                            <button
                                                onClick={handleShareInstagram}
                                                disabled={isSharing}
                                                className="px-8 py-5 bg-rose-500 text-white rounded-full font-black shadow-2xl flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all flex-1 disabled:opacity-75"
                                            >
                                                {isSharing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Instagram className="w-5 h-5" />}
                                                결과 이미지 저장 (인스타 공유)
                                            </button>
                                            <button
                                                onClick={handleShareLink}
                                                className="px-8 py-5 bg-slate-100 text-slate-950 rounded-full font-black flex items-center justify-center gap-3 hover:bg-slate-200 transition-all flex-1"
                                            >
                                                {copied ? <Check className="w-5 h-5" /> : <Share2 className="w-5 h-5" />}
                                                {copied ? '링크 복사됨!' : '친구와 결과 공유'}
                                            </button>
                                        </div>

                                        <div className="text-center">
                                            <button
                                                onClick={handleReset}
                                                className="text-slate-400 text-xs font-bold hover:text-rose-500 transition-colors underline underline-offset-4 mt-2"
                                            >
                                                다른 인연 분석하기
                                            </button>
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RelationshipPage;
