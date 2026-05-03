import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { stripMarkdown } from '../utils/textUtils';
import { getRandomLoadingMessage } from '../config/loadingMessages';
import { Coins, Lock, ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import { SERVICE_COSTS } from '../config/creditConfig';
import { useAuth } from '../hooks/useAuth';
import { useCredits } from '../hooks/useCredits';
import { useModalStore } from '../hooks/useModalStore';
import { experimental_useObject as useObject } from '@ai-sdk/react';
import { singleDayFortuneSchema } from '../config/schemas';
import { calculateSaju } from '../utils/sajuUtils';

const TodayFortunePage: React.FC = () => {
    const navigate = useNavigate();
    const { session, loading: isAuthLoading } = useAuth();
    const { credits, useCredits: consumeCredits } = useCredits(session);
    const { openModal, closeAllModals } = useModalStore();

    const [tab, setTab] = useState<'today' | 'tomorrow'>('today');
    const [tomorrowUnlocked, setTomorrowUnlocked] = useState(false);
    const [currentLoadingMessage, setCurrentLoadingMessage] = useState('');

    // Streaming today's fortune
    const { object: fortune, submit: fetchFortune, isLoading: isFortuneLoading } = useObject({
        api: '/api/fortune?scope=today',
        schema: singleDayFortuneSchema,
        headers: {
            'Authorization': `Bearer ${session?.access_token || ''}`,
        },
    });

    // Streaming tomorrow's fortune
    const { object: tomorrowFortune, submit: fetchTomorrow, isLoading: isTomorrowLoading } = useObject({
        api: '/api/fortune?scope=tomorrow',
        schema: singleDayFortuneSchema,
        headers: {
            'Authorization': `Bearer ${session?.access_token || ''}`,
        },
        onFinish: async () => {
            await consumeCredits('FORTUNE_TOMORROW');
        },
        onError: (error) => {
            console.error('[TodayFortunePage] Tomorrow fortune generation failed:', error);
            alert('내일 운세를 불러오는 중 오류가 발생했습니다. 크레딧은 차감되지 않았습니다.');
        }
    });

    useEffect(() => {
        closeAllModals();
        if (session?.user && !isFortuneLoading && !fortune) {
            const sajuData = calculateSaju(session.user.user_metadata.birth_date, session.user.user_metadata.birth_time);
            fetchFortune({
                birthDate: session.user.user_metadata.birth_date,
                mbti: session.user.user_metadata.mbti,
                sajuData,
                scope: 'today'
            });
        }
    }, [session, fetchFortune, closeAllModals, fortune, isFortuneLoading]);

    // 로딩 메시지 순환 효과
    useEffect(() => {
        let interval: NodeJS.Timeout;
        const isLoading = tab === 'today' ? (isFortuneLoading && !fortune) : (isTomorrowLoading && !tomorrowFortune);

        if (isLoading) {
            setCurrentLoadingMessage(getRandomLoadingMessage('fortune'));
            interval = setInterval(() => {
                setCurrentLoadingMessage(getRandomLoadingMessage('fortune'));
            }, 5000);
        }
        return () => clearInterval(interval);
    }, [isFortuneLoading, isTomorrowLoading, fortune, tomorrowFortune, tab]);

    if (isAuthLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
            </div>
        );
    }

    if (!session) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
                <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mb-6">
                    <Lock className="w-10 h-10 text-amber-600" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-4">로그인이 필요합니다</h2>
                <p className="text-slate-500 mb-8">운세를 확인하시려면 로그인이 필요합니다.</p>
                <button
                    onClick={() => navigate('/')}
                    className="px-8 py-4 bg-slate-950 text-white font-bold rounded-2xl shadow-xl hover:bg-slate-800 transition-all"
                >
                    홈으로 가기
                </button>
            </div>
        );
    }

    const activeData = tab === 'today' ? fortune?.fortune : tomorrowFortune?.fortune;
    const activeDate = tab === 'today' ? fortune?.date : tomorrowFortune?.date;
    const tomorrowCost = SERVICE_COSTS.FORTUNE_TOMORROW;

    const handleTomorrowClick = async () => {
        if (tomorrowUnlocked) {
            setTab('tomorrow');
            return;
        }

        if (credits < tomorrowCost) {
            openModal('creditPurchase', undefined, { requiredCredits: tomorrowCost });
            return;
        }

        if (!window.confirm(`내일의 운세를 확인하시겠습니까? ${tomorrowCost}크레딧이 사용됩니다.`)) {
            return;
        }

        const sajuData = calculateSaju(session.user.user_metadata.birth_date, session.user.user_metadata.birth_time);
        fetchTomorrow({
            birthDate: session.user.user_metadata.birth_date,
            mbti: session.user.user_metadata.mbti,
            sajuData,
            scope: 'tomorrow'
        });
        setTomorrowUnlocked(true);
        setTab('tomorrow');
    };

    return (
        <div className="min-h-screen bg-[#faf8fe] pb-32">
            {/* Header */}
            <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-100">
                <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
                    <button 
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <ArrowLeft className="w-6 h-6 text-slate-600" />
                    </button>
                    <h1 className="text-lg font-black text-slate-900">당신의 운세</h1>
                    <div className="flex items-center gap-1 px-3 py-1.5 bg-amber-100 text-amber-600 rounded-full text-xs font-bold">
                        <Coins className="w-4 h-4" />
                        {credits}
                    </div>
                </div>
            </div>

            <div className="max-w-2xl mx-auto px-4 pt-8">
                {/* Date and Tabs */}
                <div className="mb-8">
                    <div className="flex justify-between items-end mb-6">
                        <div>
                            <p className="text-amber-600 font-bold text-sm mb-1">
                                {tab === 'today' ? '오늘의 행운 흐름' : '내일의 행운 예보'}
                            </p>
                            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                                {activeDate ? new Date(activeDate).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' }) : 
                                 new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })}
                            </h2>
                        </div>
                    </div>

                    <div className="flex p-1 bg-slate-100 rounded-2xl">
                        <button
                            onClick={() => setTab('today')}
                            className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${tab === 'today'
                                ? 'bg-white text-amber-600 shadow-md shadow-amber-100/50'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            오늘의 운세
                        </button>
                        <button
                            onClick={handleTomorrowClick}
                            disabled={isTomorrowLoading}
                            className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${tab === 'tomorrow'
                                ? 'bg-white text-amber-600 shadow-md shadow-amber-100/50'
                                : 'text-slate-500 hover:text-slate-700'
                                } ${isTomorrowLoading ? 'opacity-50' : ''}`}
                        >
                            {isTomorrowLoading && !tomorrowFortune ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : tomorrowUnlocked ? (
                                '내일의 운세'
                            ) : (
                                <>
                                    내일의 운세
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-100 text-amber-600 rounded text-[10px]">
                                        <Coins className="w-3 h-3" />
                                        {tomorrowCost}
                                    </span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="space-y-6">
                    {((tab === 'today' && isFortuneLoading && !fortune) || (tab === 'tomorrow' && isTomorrowLoading && !tomorrowFortune)) ? (
                        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                            <div className="relative mb-8">
                                <div className="w-20 h-20 border-4 border-amber-100 rounded-full"></div>
                                <div className="absolute top-0 left-0 w-20 h-20 border-4 border-t-amber-500 rounded-full animate-spin"></div>
                                <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-amber-500 animate-pulse" />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 mb-2">
                                {currentLoadingMessage || '운명의 흐름을 읽는 중...'}
                            </h3>
                            <p className="text-slate-400 font-bold text-xs tracking-widest uppercase">
                                Please wait a moment
                            </p>
                        </div>
                    ) : tab === 'tomorrow' && !tomorrowUnlocked ? (
                        <div className="bg-white border border-slate-100 rounded-[32px] p-12 text-center shadow-xl shadow-slate-200/50">
                            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Lock className="w-12 h-12 text-slate-300" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 mb-3">내일의 운세가 궁금하신가요?</h3>
                            <p className="text-slate-500 mb-8 leading-relaxed">
                                잠들기 전 미리 내일의 기운을 확인하고<br />
                                완벽한 하루를 준비해 보세요.
                            </p>
                            <button
                                onClick={handleTomorrowClick}
                                className="w-full py-5 bg-slate-950 text-white font-bold rounded-2xl shadow-xl hover:bg-amber-600 transition-all flex items-center justify-center gap-3 active:scale-95"
                            >
                                <Coins className="w-6 h-6 text-amber-400" />
                                {credits >= tomorrowCost ? `${tomorrowCost}크레딧으로 확인하기` : '크레딧 충전하러 가기'}
                            </button>
                        </div>
                    ) : activeData ? (
                        <div className="animate-fade-up">
                            {/* MISSION CARD */}
                            {activeData.mission && (
                                <div className="bg-slate-950 p-6 rounded-[32px] shadow-2xl mb-8 text-white relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-6 opacity-20 transform translate-x-4 -translate-y-4 text-amber-500 scale-150">
                                        <Sparkles className="w-24 h-24" />
                                    </div>
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-2 h-2 bg-amber-500 rounded-full animate-ping" />
                                            <h4 className="text-amber-500 text-xs font-black uppercase tracking-[0.2em]">Daily Mission</h4>
                                        </div>
                                        <p className="text-xl font-bold leading-tight">
                                            {stripMarkdown(activeData.mission)}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* MAIN FORTUNE */}
                            <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/40 mb-8 relative">
                                <div className="absolute -top-4 -left-4 w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg shadow-amber-100 rotate-[-12deg]">
                                    ✨
                                </div>
                                <p className="text-slate-800 leading-relaxed font-semibold whitespace-pre-wrap text-lg">
                                    {stripMarkdown(activeData.fortune)}
                                </p>
                            </div>

                            {/* CHARM STATS */}
                            {activeData.charm_stats && (
                                <div className="mb-8 bg-white border border-slate-100 p-8 rounded-[32px] shadow-sm">
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                        오늘의 에너지 스탯
                                    </h4>
                                    <div className="grid grid-cols-1 gap-6">
                                        {activeData.charm_stats.map((stat: any, idx: number) => {
                                            if (!stat || !stat.label || stat.value === undefined) return null;
                                            return (
                                            <div key={idx} className="space-y-2">
                                                <div className="flex justify-between items-end">
                                                    <span className="text-sm font-black text-slate-700">{stat.label}</span>
                                                    <span className="text-xl font-black text-amber-500 italic">{stat.value}%</span>
                                                </div>
                                                <div className="h-3 bg-slate-50 rounded-full overflow-hidden p-0.5">
                                                    <div 
                                                        className="h-full bg-gradient-to-r from-amber-300 via-amber-500 to-amber-600 rounded-full shadow-inner transition-all duration-1000 ease-out"
                                                        style={{ width: `${stat.value}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* OOTD RECOMMENDATION */}
                            {activeData.lucky_ootd && (
                                <div className="mb-8 bg-amber-50 border border-amber-100 p-8 rounded-[32px] relative overflow-hidden group hover:bg-white transition-all duration-500">
                                    <div className="absolute top-0 right-0 p-6 opacity-10 text-amber-600 group-hover:scale-125 transition-transform duration-700">
                                        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M20 12V8H16V12H20Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                            <path d="M4 12V8H8V12H4Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                            <path d="M12 21C16.9706 21 21 16.9706 21 12H3C3 16.9706 7.02944 21 12 21Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                    </div>
                                    <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em] mb-3">Lucky Outfit of the Day</h4>
                                    <p className="text-slate-900 font-bold text-2xl leading-snug relative z-10">
                                        {activeData.lucky_ootd}
                                    </p>
                                </div>
                            )}

                            {/* LUCKY ITEMS */}
                            {activeData.lucky && (
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="bg-white p-5 rounded-[24px] border border-slate-100 text-center shadow-sm hover:shadow-md transition-shadow">
                                        <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-3 rotate-3">🎨</div>
                                        <div className="text-[10px] text-slate-400 font-black mb-1 uppercase tracking-wider">Color</div>
                                        <div className="text-slate-900 font-black text-sm">{activeData.lucky.color}</div>
                                    </div>
                                    <div className="bg-white p-5 rounded-[24px] border border-slate-100 text-center shadow-sm hover:shadow-md transition-shadow">
                                        <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-3 -rotate-3">🔢</div>
                                        <div className="text-[10px] text-slate-400 font-black mb-1 uppercase tracking-wider">Number</div>
                                        <div className="text-slate-900 font-black text-sm">{activeData.lucky.number}</div>
                                    </div>
                                    <div className="bg-white p-5 rounded-[24px] border border-slate-100 text-center shadow-sm hover:shadow-md transition-shadow">
                                        <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-3 rotate-6">🧭</div>
                                        <div className="text-[10px] text-slate-400 font-black mb-1 uppercase tracking-wider">Direction</div>
                                        <div className="text-slate-900 font-black text-sm">{activeData.lucky.direction}</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-20 bg-white rounded-[32px] border border-dashed border-slate-200">
                            <p className="text-slate-400 font-bold">운세 정보를 가져올 수 없습니다.</p>
                            <button 
                                onClick={() => window.location.reload()}
                                className="mt-4 text-amber-600 font-bold underline"
                            >
                                다시 시도하기
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TodayFortunePage;
