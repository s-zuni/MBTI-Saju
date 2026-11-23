import React, { useState, useEffect, useRef } from 'react';
import { stripMarkdown } from '../utils/textUtils';
import { getRandomLoadingMessage } from '../config/loadingMessages';
import { CreditCard, Loader2, Sparkles, Palette, Hash, Compass } from 'lucide-react';
import { SERVICE_COSTS } from '../config/creditConfig';
import { experimental_useObject as useObject } from '@ai-sdk/react';
import { singleDayFortuneSchema } from '../config/schemas';
import { calculateSaju } from '../utils/sajuUtils';
import { useGuestProfile } from '../hooks/useGuestProfile';
import GuestProfileCard from '../components/GuestProfileCard';
import { consumePaidServiceTicket, startServicePayment } from '../utils/servicePayCheckout';

const TodayFortunePage: React.FC<{ isEmbedded?: boolean }> = ({ isEmbedded }) => {
    const { profile, updateProfile } = useGuestProfile();

    const [tab, setTab] = useState<'today' | 'tomorrow'>('today');
    const [todayUnlocked, setTodayUnlocked] = useState(false);
    const [tomorrowUnlocked, setTomorrowUnlocked] = useState(false);
    const [isPaying, setIsPaying] = useState(false);
    const [currentLoadingMessage, setCurrentLoadingMessage] = useState('');
    const ticketCheckedRef = useRef(false);

    const { object: fortune, submit: fetchFortune, isLoading: isFortuneLoading } = useObject({
        api: '/api/fortune?scope=today',
        schema: singleDayFortuneSchema,
        onError: (error) => {
            console.error('[TodayFortunePage] Today fortune generation failed:', error);
            alert('오늘의 운세를 불러오는 중 오류가 발생했습니다. 다시 시도해 주세요.');
        }
    });

    const { object: tomorrowFortune, submit: fetchTomorrow, isLoading: isTomorrowLoading } = useObject({
        api: '/api/fortune?scope=tomorrow',
        schema: singleDayFortuneSchema,
        onFinish: async ({ object }) => {
            if (!object) {
                console.error('[TodayFortunePage] Tomorrow fortune result validation failed');
                alert('내일 운세를 만들지 못했습니다. 다시 시도해 주세요.');
            }
        },
        onError: (error) => {
            console.error('[TodayFortunePage] Tomorrow fortune generation failed:', error);
            alert('내일 운세를 불러오는 중 오류가 발생했습니다. 다시 시도해 주세요.');
        }
    });

    useEffect(() => {
        if (ticketCheckedRef.current) return;
        ticketCheckedRef.current = true;
        const ticket = consumePaidServiceTicket(['FORTUNE_TODAY', 'FORTUNE_TOMORROW']);
        if (ticket?.payload) {
            if (ticket.serviceType === 'FORTUNE_TOMORROW') {
                setTab('tomorrow');
                setTomorrowUnlocked(true);
                fetchTomorrow(ticket.payload);
            } else {
                setTab('today');
                setTodayUnlocked(true);
                fetchFortune(ticket.payload);
            }
        }
    }, [fetchFortune, fetchTomorrow]);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if ((isFortuneLoading && !fortune) || (isTomorrowLoading && !tomorrowFortune)) {
            setCurrentLoadingMessage(getRandomLoadingMessage('fortune'));
            interval = setInterval(() => {
                setCurrentLoadingMessage(getRandomLoadingMessage('fortune'));
            }, 3000);
        }
        return () => clearInterval(interval);
    }, [isFortuneLoading, fortune, isTomorrowLoading, tomorrowFortune]);

    const activeData = tab === 'today' ? fortune?.fortune : tomorrowFortune?.fortune;
    const activeDate = tab === 'today' ? fortune?.date : tomorrowFortune?.date;
    const todayPrice = SERVICE_COSTS.FORTUNE_TODAY;
    const tomorrowPrice = SERVICE_COSTS.FORTUNE_TOMORROW;

    const handlePayAndGenerate = async (targetTab: 'today' | 'tomorrow') => {
        if (!profile.birthDate) {
            alert('생년월일을 입력해주세요.');
            return;
        }
        setIsPaying(true);
        try {
            const sajuData = calculateSaju(profile.birthDate, profile.birthTime);
            const res = await startServicePayment({
                serviceType: targetTab === 'today' ? 'FORTUNE_TODAY' : 'FORTUNE_TOMORROW',
                serviceName: targetTab === 'today' ? '오늘의 운세' : '내일의 운세',
                returnPath: '/myluck?type=today',
                payload: {
                    birthDate: profile.birthDate,
                    mbti: profile.mbti,
                    sajuData,
                    scope: targetTab,
                },
                customerName: profile.name,
            });
            if (!res.success && res.error_msg) {
                alert(res.error_msg);
            }
        } finally {
            setIsPaying(false);
        }
    };

    const handleTomorrowTabClick = () => {
        setTab('tomorrow');
    };

    return (
        <div className={isEmbedded ? "pb-12" : "min-h-screen bg-[#faf8fe] pb-32"}>
            {/* Header */}
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
                            className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${tab === 'today'
                                ? 'bg-white text-amber-600 shadow-md shadow-amber-100/50'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            오늘의 운세
                            {!todayUnlocked && !fortune && (
                                <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-black">
                                    {todayPrice}원
                                </span>
                            )}
                        </button>
                        <button
                            onClick={handleTomorrowTabClick}
                            disabled={isTomorrowLoading}
                            className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${tab === 'tomorrow'
                                ? 'bg-white text-amber-600 shadow-md shadow-amber-100/50'
                                : 'text-slate-500 hover:text-slate-700'
                                } ${isTomorrowLoading ? 'opacity-50' : ''}`}
                        >
                            {isTomorrowLoading && !tomorrowFortune ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : tomorrowUnlocked || tomorrowFortune ? (
                                '내일의 운세'
                            ) : (
                                <>
                                    내일의 운세
                                    <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-black">
                                        {tomorrowPrice}원
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
                    ) : ((tab === 'today' && !todayUnlocked && !fortune) || (tab === 'tomorrow' && !tomorrowUnlocked && !tomorrowFortune)) ? (
                        <div className="bg-white border border-slate-100 rounded-[32px] p-6 sm:p-10 text-center shadow-xl shadow-slate-200/40 space-y-6">
                            <div>
                                <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <Sparkles className="w-8 h-8 text-amber-500" />
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 mb-2">
                                    {tab === 'today' ? '오늘의 행운 흐름 확인하기' : '내일의 운세가 궁금하신가요?'}
                                </h3>
                                <p className="text-sm text-slate-500 leading-relaxed">
                                    회원가입 없이 사주와 MBTI만 입력하면<br />
                                    {tab === 'today' ? '오늘 하루 나에게 맞는 기운과 럭키 포인트를 바로 확인해요.' : '내일의 기운과 핵심 미션을 미리 준비할 수 있어요.'}
                                </p>
                            </div>

                            <GuestProfileCard profile={profile} onChange={updateProfile} />

                            <button
                                onClick={() => handlePayAndGenerate(tab)}
                                disabled={isPaying}
                                className="w-full py-5 bg-slate-950 text-white font-black rounded-2xl shadow-xl hover:bg-amber-600 transition-all flex items-center justify-center gap-2.5 active:scale-95 disabled:opacity-60"
                            >
                                {isPaying ? <Loader2 className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5 text-amber-400" />}
                                <span>
                                    {tab === 'today'
                                        ? `오늘의 운세 확인하기 (${todayPrice.toLocaleString()}원 결제)`
                                        : `내일의 운세 확인하기 (${tomorrowPrice.toLocaleString()}원 결제)`}
                                </span>
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
                                <div className="absolute -top-4 -left-4 w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-amber-100/30 rotate-[-12deg]">
                                    <Sparkles className="w-5 h-5 text-white" />
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
                                        <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-3 rotate-3">
                                            <Palette className="w-5 h-5 text-rose-500" />
                                        </div>
                                        <div className="text-[10px] text-slate-400 font-black mb-1 uppercase tracking-wider">Color</div>
                                        <div className="text-slate-900 font-black text-sm">{activeData.lucky.color}</div>
                                    </div>
                                    <div className="bg-white p-5 rounded-[24px] border border-slate-100 text-center shadow-sm hover:shadow-md transition-shadow">
                                        <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-3 -rotate-3">
                                            <Hash className="w-5 h-5 text-blue-500" />
                                        </div>
                                        <div className="text-[10px] text-slate-400 font-black mb-1 uppercase tracking-wider">Number</div>
                                        <div className="text-slate-900 font-black text-sm">{activeData.lucky.number}</div>
                                    </div>
                                    <div className="bg-white p-5 rounded-[24px] border border-slate-100 text-center shadow-sm hover:shadow-md transition-shadow">
                                        <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-3 rotate-6">
                                            <Compass className="w-5 h-5 text-emerald-500" />
                                        </div>
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
