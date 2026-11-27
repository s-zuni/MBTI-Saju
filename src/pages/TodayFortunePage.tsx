import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { stripMarkdown } from '../utils/textUtils';
import { getRandomLoadingMessage } from '../config/loadingMessages';
import { CreditCard, Loader2, ArrowRight } from 'lucide-react';
import { SERVICE_COSTS } from '../config/creditConfig';
import { experimental_useObject as useObject } from '@ai-sdk/react';
import { singleDayFortuneSchema } from '../config/schemas';
import { safeCalculateSaju } from '../utils/sajuUtils';
import { useGuestProfile } from '../hooks/useGuestProfile';
import GuestProfileCard from '../components/GuestProfileCard';
import FunnelBottomCta from '../components/FunnelBottomCta';
import ReportErrorBoundary from '../components/common/ReportErrorBoundary';
import StreamingStatusBanner from '../components/common/StreamingStatusBanner';
import { buildServiceRequestHeaders, consumePaidServiceTicket, startServicePayment } from '../utils/servicePayCheckout';

const TodayFortunePage: React.FC<{ isEmbedded?: boolean }> = ({ isEmbedded }) => {
    const navigate = useNavigate();
    const { profile, updateProfile } = useGuestProfile();

    const [tab, setTab] = useState<'today' | 'tomorrow'>('today');
    const [todayUnlocked, setTodayUnlocked] = useState(false);
    const [tomorrowUnlocked, setTomorrowUnlocked] = useState(false);
    const [isPaying, setIsPaying] = useState(false);
    const [todayError, setTodayError] = useState<string | null>(null);
    const [tomorrowError, setTomorrowError] = useState<string | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [currentLoadingMessage, setCurrentLoadingMessage] = useState('');
    const ticketCheckedRef = useRef(false);
    const receiptTokenRef = useRef<string | null>(null);
    const lastTodayPayloadRef = useRef<any>(null);
    const lastTomorrowPayloadRef = useRef<any>(null);

    const { object: fortune, submit: fetchFortune, isLoading: isFortuneLoading } = useObject({
        api: '/api/fortune?scope=today',
        schema: singleDayFortuneSchema,
        headers: () => buildServiceRequestHeaders(null),
        onFinish: ({ object }) => {
            if (!object) {
                setTodayError('오늘의 운세를 생성하지 못했습니다. 다시 시도해 주세요.');
            } else {
                setTodayError(null);
            }
        },
        onError: (error) => {
            console.error('[TodayFortunePage] Today fortune generation failed:', error);
            setTodayError('오늘의 운세를 불러오는 중 일시적인 오류가 발생했습니다. 다시 시도해 주세요.');
        }
    });

    const { object: tomorrowFortune, submit: fetchTomorrow, isLoading: isTomorrowLoading } = useObject({
        api: '/api/fortune?scope=tomorrow',
        schema: singleDayFortuneSchema,
        headers: () => buildServiceRequestHeaders(receiptTokenRef.current),
        onFinish: async ({ object }) => {
            if (!object) {
                console.error('[TodayFortunePage] Tomorrow fortune result validation failed');
                setTomorrowError('내일 운세를 생성하지 못했습니다. 아래 [다시 시도하기]를 눌러 주세요.');
            } else {
                setTomorrowError(null);
            }
        },
        onError: (error) => {
            console.error('[TodayFortunePage] Tomorrow fortune generation failed:', error);
            setTomorrowError('내일 운세를 불러오는 중 일시적인 오류가 발생했습니다. 아래 [다시 시도하기]를 눌러 주세요.');
        }
    });

    useEffect(() => {
        if (ticketCheckedRef.current) return;
        ticketCheckedRef.current = true;
        const ticket = consumePaidServiceTicket(['FORTUNE_TODAY', 'FORTUNE_TOMORROW']);
        if (ticket?.payload) {
            receiptTokenRef.current = ticket.receiptToken || null;
            if (ticket.serviceType === 'FORTUNE_TOMORROW') {
                lastTomorrowPayloadRef.current = ticket.payload;
                setTab('tomorrow');
                setTomorrowUnlocked(true);
                setTomorrowError(null);
                fetchTomorrow(ticket.payload);
            } else {
                lastTodayPayloadRef.current = ticket.payload;
                setTab('today');
                setTodayUnlocked(true);
                setTodayError(null);
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
    const activeLoading = tab === 'today' ? isFortuneLoading : isTomorrowLoading;
    const activeError = tab === 'today' ? todayError : tomorrowError;
    const activeUnlocked = tab === 'today' ? (todayUnlocked || !!fortune) : (tomorrowUnlocked || !!tomorrowFortune);
    const tomorrowPrice = SERVICE_COSTS.FORTUNE_TOMORROW;
    const currentYear = new Date().getFullYear();
    const formattedHeaderDate = (() => {
        if (activeDate && /^\d{4}-\d{2}-\d{2}$/.test(activeDate)) {
            const parsed = new Date(activeDate);
            if (!Number.isNaN(parsed.getTime())) {
                return parsed.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' });
            }
        }
        return new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' });
    })();

    const handleRetryCurrent = () => {
        if (tab === 'today') {
            setTodayError(null);
            if (lastTodayPayloadRef.current) {
                fetchFortune(lastTodayPayloadRef.current);
            } else {
                handleGenerateTodayFree();
            }
        } else if (lastTomorrowPayloadRef.current) {
            setTomorrowError(null);
            fetchTomorrow(lastTomorrowPayloadRef.current);
        }
    };

    const handleGenerateTodayFree = () => {
        if (!profile.birthDate) {
            setFormError('생년월일을 입력해주세요.');
            return;
        }
        const sajuData = safeCalculateSaju(profile.birthDate, profile.birthTime || null, profile.gender);
        if (!sajuData) {
            setFormError('유효한 생년월일(1900~2050년)을 입력해주세요.');
            return;
        }
        setFormError(null);
        setTodayError(null);
        const payload = {
            birthDate: profile.birthDate,
            birthTime: profile.birthTime || null,
            gender: profile.gender,
            mbti: profile.mbti || '미입력',
            sajuData,
            scope: 'today',
        };
        lastTodayPayloadRef.current = payload;
        setTodayUnlocked(true);
        fetchFortune(payload);
    };

    const handlePayTomorrow = async () => {
        if (!profile.birthDate) {
            setFormError('생년월일을 입력해주세요.');
            return;
        }
        const sajuData = safeCalculateSaju(profile.birthDate, profile.birthTime || null, profile.gender);
        if (!sajuData) {
            setFormError('유효한 생년월일(1900~2050년)을 입력해주세요.');
            return;
        }
        setFormError(null);
        setIsPaying(true);
        try {
            const res = await startServicePayment({
                serviceType: 'FORTUNE_TOMORROW',
                serviceName: '내일의 운세',
                returnPath: '/myluck?type=today',
                payload: {
                    birthDate: profile.birthDate,
                    birthTime: profile.birthTime || null,
                    gender: profile.gender,
                    mbti: profile.mbti || '미입력',
                    sajuData,
                    scope: 'tomorrow',
                },
                customerName: profile.name,
            });
            if (!res.success && res.error_msg) {
                setFormError(res.error_msg);
            }
        } finally {
            setIsPaying(false);
        }
    };

    const handleTomorrowTabClick = () => {
        setFormError(null);
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
                                {tab === 'today' ? '오늘의 행운 흐름 (무료 제공)' : '내일의 행운 예보'}
                            </p>
                            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                                {formattedHeaderDate}
                            </h2>
                        </div>
                    </div>

                    <div className="flex p-1 bg-slate-100 rounded-2xl">
                        <button
                            onClick={() => setTab('today')}
                            className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${tab === 'today'
                                ? 'bg-white text-emerald-700 shadow-md shadow-emerald-100/50'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            오늘의 운세
                            <span className="px-2 py-0.5 bg-emerald-500 text-white rounded-full text-[10px] font-black">
                                무료
                            </span>
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
                                        {tomorrowPrice.toLocaleString()}원
                                    </span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="space-y-6">
                    {!activeUnlocked ? (
                        <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-9 text-center space-y-6">
                            <div className="space-y-2">
                                <div>
                                    {tab === 'today' ? (
                                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold">
                                            회원가입 없이 100% 무료 제공
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-bold">
                                            내일 하루를 앞서 준비하는 단건 예보 ({tomorrowPrice.toLocaleString()}원)
                                        </span>
                                    )}
                                </div>
                                <h3 className="text-2xl font-bold text-slate-900">
                                    {tab === 'today' ? '오늘의 행운 흐름 무료로 확인하기' : '내일의 운세가 궁금하신가요?'}
                                </h3>
                                <p className="text-sm sm:text-[15px] text-slate-600 leading-relaxed">
                                    회원가입 없이 생년월일만 입력해도<br />
                                    {tab === 'today' ? '오늘 하루 나에게 맞는 기운과 행동 포인트를 결제 없이 즉시 확인해요.' : '내일의 기운과 현실적인 대처 포인트를 미리 준비할 수 있어요.'}
                                </p>
                            </div>

                            <GuestProfileCard profile={profile} onChange={(patch) => { updateProfile(patch); setFormError(null); }} />

                            {formError && (
                                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold">
                                    {formError}
                                </div>
                            )}

                            {tab === 'today' ? (
                                <button
                                    type="button"
                                    onClick={handleGenerateTodayFree}
                                    disabled={isFortuneLoading}
                                    className="w-full py-4.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-base rounded-2xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                                >
                                    <span>오늘의 운세 무료로 확인하기</span>
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handlePayTomorrow}
                                    disabled={isPaying}
                                    className="w-full py-4.5 bg-slate-950 text-white font-bold text-base rounded-2xl hover:bg-slate-800 transition-colors flex items-center justify-center gap-2.5 disabled:opacity-60"
                                >
                                    {isPaying ? <Loader2 className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5 text-amber-300" />}
                                    <span>내일의 운세 확인하기</span>
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <StreamingStatusBanner
                                isStreaming={activeLoading}
                                hasData={!!activeData}
                                error={!activeData ? (activeError || (!activeLoading ? '운세 정보를 불러올 수 없습니다.' : null)) : null}
                                onRetry={handleRetryCurrent}
                                isFree={tab === 'today'}
                                streamingTitle={
                                    tab === 'today'
                                        ? (currentLoadingMessage || '오늘의 운세를 실시간으로 작성하고 있습니다')
                                        : '결제가 완료되어 내일의 운세를 실시간으로 작성하고 있습니다'
                                }
                                streamingSubtitle="완성되는 문단부터 아래에 바로 표시됩니다."
                                completedText={tab === 'today' ? '오늘의 운세 풀이가 완료되었습니다.' : '내일의 운세 풀이가 완료되었습니다.'}
                            />

                            {activeData && (
                                <ReportErrorBoundary onRetry={handleRetryCurrent}>
                                    <div className="animate-fade-up space-y-6">
                                        {/* MISSION CARD */}
                                        {activeData.mission && (
                                            <div className="bg-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-800 text-white space-y-2.5">
                                                <h4 className="text-sm font-bold text-amber-300">
                                                    {tab === 'today' ? '오늘의 핵심 미션' : '내일의 핵심 미션'}
                                                </h4>
                                                <p className="text-lg sm:text-xl font-bold leading-relaxed break-keep">
                                                    {stripMarkdown(activeData.mission)}
                                                </p>
                                            </div>
                                        )}

                                        {/* MAIN FORTUNE */}
                                        {activeData.fortune && (
                                            <div className="bg-white p-6 sm:p-9 rounded-2xl border border-stone-200 space-y-3">
                                                <h4 className="text-xl sm:text-2xl font-bold text-slate-950 pb-2 border-b border-stone-200">
                                                    {tab === 'today' ? '오늘의 기운과 현실 조언' : '내일의 기운과 현실 조언'}
                                                </h4>
                                                <p className="text-[15px] sm:text-base text-slate-800 leading-[1.9] whitespace-pre-wrap break-keep">
                                                    {stripMarkdown(activeData.fortune)}
                                                </p>
                                            </div>
                                        )}

                                        {/* CHARM STATS */}
                                        {Array.isArray(activeData.charm_stats) && activeData.charm_stats.length > 0 && (
                                            <div className="bg-white border border-stone-200 p-6 sm:p-8 rounded-2xl space-y-5">
                                                <h4 className="text-lg sm:text-xl font-bold text-slate-950 pb-2 border-b border-stone-200">
                                                    {tab === 'today' ? '오늘의 에너지 지표' : '내일의 에너지 지표'}
                                                </h4>
                                                <div className="space-y-4">
                                                    {activeData.charm_stats.map((stat: any, idx: number) => {
                                                        if (!stat || !stat.label || typeof stat.value !== 'number') return null;
                                                        const pct = Math.min(100, Math.max(0, stat.value));
                                                        return (
                                                            <div key={idx} className="space-y-1.5">
                                                                <div className="flex justify-between items-baseline">
                                                                    <span className="text-base font-bold text-slate-800">{stat.label}</span>
                                                                    <span className="text-base font-bold text-amber-700">{pct}%</span>
                                                                </div>
                                                                <div className="h-2.5 bg-stone-100 rounded-full overflow-hidden">
                                                                    <div
                                                                        className="h-full bg-amber-600 rounded-full transition-all duration-700"
                                                                        style={{ width: `${pct}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* OOTD RECOMMENDATION */}
                                        {activeData.lucky_ootd && (
                                            <div className="bg-[#FAF7F0] border border-[#E6DFD1] p-6 sm:p-7 rounded-2xl space-y-2">
                                                <h4 className="text-base font-bold text-stone-600">추천 옷차림</h4>
                                                <p className="text-lg sm:text-xl font-bold text-slate-950 leading-relaxed break-keep">
                                                    {stripMarkdown(activeData.lucky_ootd)}
                                                </p>
                                            </div>
                                        )}

                                        {/* LUCKY ITEMS (그리드 제거 -> 정갈한 정의 목록) */}
                                        {activeData.lucky && (
                                            <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-7 divide-y divide-stone-200">
                                                {activeData.lucky.color && (
                                                    <div className="py-3.5 first:pt-0 space-y-1">
                                                        <h5 className="text-base font-bold text-slate-900">어울리는 색상</h5>
                                                        <p className="text-[15px] sm:text-base text-slate-800 leading-[1.85] break-keep">
                                                            {stripMarkdown(activeData.lucky.color)}
                                                        </p>
                                                    </div>
                                                )}
                                                {activeData.lucky.number && (
                                                    <div className="py-3.5 space-y-1">
                                                        <h5 className="text-base font-bold text-slate-900">행운의 숫자</h5>
                                                        <p className="text-[15px] sm:text-base text-slate-800 leading-[1.85] break-keep">
                                                            {stripMarkdown(activeData.lucky.number)}
                                                        </p>
                                                    </div>
                                                )}
                                                {activeData.lucky.direction && (
                                                    <div className="py-3.5 last:pb-0 space-y-1">
                                                        <h5 className="text-base font-bold text-slate-900">좋은 방향</h5>
                                                        <p className="text-[15px] sm:text-base text-slate-800 leading-[1.85] break-keep">
                                                            {stripMarkdown(activeData.lucky.direction)}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {!activeLoading && (
                                            <>
                                                {/* 퍼널 전환 브릿지 */}
                                                <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-7 space-y-4">
                                                    <p className="text-sm font-bold text-indigo-800">
                                                        나의 사주 원국 · 종합 운명 리포트 이어보기
                                                    </p>
                                                    <p className="text-[15px] sm:text-base text-slate-800 leading-[1.85]">
                                                        하루 운세만으로는 긴 흐름을 다 읽기 어렵습니다. 내 타고난 <strong>만세력 4주 8자 원국표</strong>와 <strong>{currentYear}년 재물·연애·커리어 종합 리포트</strong>를 지금 이어서 확인해 보세요.
                                                    </p>
                                                    <div className="space-y-3 pt-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => navigate('/?openService=freePreview')}
                                                            className="w-full py-4 px-5 rounded-xl bg-slate-950 hover:bg-indigo-950 text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-colors"
                                                        >
                                                            <span>무료 만세력 &amp; 사주 종합 분석 보기</span>
                                                            <ArrowRight className="w-4 h-4 shrink-0" />
                                                        </button>
                                                        {tab === 'today' && !tomorrowFortune && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setTab('tomorrow')}
                                                                className="w-full py-4 px-5 rounded-xl bg-[#FAF7F0] hover:bg-stone-200/70 text-slate-900 border border-[#E6DFD1] font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-colors"
                                                            >
                                                                <span>내일의 운세 미리 확인하기 ({tomorrowPrice.toLocaleString()}원)</span>
                                                                <ArrowRight className="w-4 h-4 shrink-0" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                <FunnelBottomCta from="today_fortune_result" />
                                            </>
                                        )}
                                    </div>
                                </ReportErrorBoundary>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TodayFortunePage;
