import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plane, Globe, CalendarDays, PenLine, ChevronLeft, CreditCard, Loader2, Instagram } from 'lucide-react';
import { generateImage } from '../utils/exportUtils';
import TripShareCard from '../components/TripShareCard';
import { stripMarkdown } from '../utils/textUtils';
import { experimental_useObject as useObject } from '@ai-sdk/react';
import { tripSchema } from '../config/schemas';
import { SERVICE_COSTS } from '../config/creditConfig';
import { safeCalculateSaju } from '../utils/sajuUtils';
import { getRandomLoadingMessage } from '../config/loadingMessages';
import { useGuestProfile } from '../hooks/useGuestProfile';
import GuestProfileCard from '../components/GuestProfileCard';
import FunnelBottomCta from '../components/FunnelBottomCta';
import ReportErrorBoundary from '../components/common/ReportErrorBoundary';
import StreamingStatusBanner from '../components/common/StreamingStatusBanner';
import { buildServiceRequestHeaders, consumePaidServiceTicket, startServicePayment } from '../utils/servicePayCheckout';

const DOMESTIC_REGIONS = [
    '서울특별시', '부산광역시', '대구광역시', '인천광역시', '광주광역시', '대전광역시', '울산광역시', '세종특별자치시', 
    '경기도', '강원특별자치도', '충청북도', '충청남도', '전북특별자치도', '전라남도', '경상북도', '경상남도', '제주특별자치도'
];

const INTERNATIONAL_REGIONS = [
    '일본 (도쿄/오사카 등)', '중화권 (대만/홍콩/마카오)', '동남아시아 (베트남/태국 등)', '북미 (미국/캐나다)', 
    '휴양지 (하와이/괌/사이판)', '서유럽 (영국/프랑스 등)', '동유럽 (체코/헝가리 등)', 
    '남유럽 (이탈리아/스페인 등)', '오세아니아 (호주/뉴질랜드)', '기타 (중남미/아프리카 등)'
];

const TripPage: React.FC<{ isEmbedded?: boolean }> = ({ isEmbedded }) => {
    const { profile, updateProfile } = useGuestProfile();
    const navigate = useNavigate();
    const reportRef = useRef<HTMLDivElement>(null);
    const ticketCheckedRef = useRef(false);

    const [isFormSubmitted, setIsFormSubmitted] = useState(false);
    const [tripType, setTripType] = useState<'domestic' | 'international'>('domestic');
    const [selectedRegion, setSelectedRegion] = useState(DOMESTIC_REGIONS[16]);
    const [duration, setDuration] = useState<number>(3);
    const [requirements, setRequirements] = useState('');
    const [currentLoadingMessage, setCurrentLoadingMessage] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isPaying, setIsPaying] = useState(false);
    const shareRef = useRef<HTMLDivElement>(null);
    const receiptTokenRef = useRef<string | null>(null);
    const lastPayloadRef = useRef<any>(null);
    const [isSharing, setIsSharing] = useState(false);

    const { object: result, submit, isLoading } = useObject({
        api: '/api/analysis-special?type=trip',
        schema: tripSchema,
        headers: () => buildServiceRequestHeaders(receiptTokenRef.current),
        onFinish: ({ object, error: validationError }) => {
            if (!object) {
                console.error('[TripPage] Result validation failed:', validationError);
                setError('여행지 분석 결과를 생성하지 못했습니다. 아래 [다시 시도하기]를 눌러 주세요.');
            } else {
                setError(null);
            }
        },
        onError: (err) => {
            console.error('[TripPage] Analysis failed:', err);
            setError('분석 중 일시적인 오류가 발생했습니다. 아래 [다시 시도하기]를 눌러 주세요.');
        }
    });

    useEffect(() => {
        if (ticketCheckedRef.current) return;
        ticketCheckedRef.current = true;
        const ticket = consumePaidServiceTicket(['TRIP', 'COMPATIBILITY_TRIP']);
        if (ticket?.payload) {
            receiptTokenRef.current = ticket.receiptToken || null;
            lastPayloadRef.current = ticket.payload;
            if (ticket.payload.tripType) setTripType(ticket.payload.tripType);
            if (ticket.payload.selectedRegion) setSelectedRegion(ticket.payload.selectedRegion);
            if (ticket.payload.duration) setDuration(ticket.payload.duration);
            if (ticket.payload.requirements) setRequirements(ticket.payload.requirements);
            setIsFormSubmitted(true);
            submit(ticket.payload);
        }
    }, [submit]);

    const handleRetry = () => {
        if (!lastPayloadRef.current) return;
        setError(null);
        submit(lastPayloadRef.current);
    };

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isLoading && !result) {
            setCurrentLoadingMessage(getRandomLoadingMessage('trip'));
            interval = setInterval(() => {
                setCurrentLoadingMessage(getRandomLoadingMessage('trip'));
            }, 3000);
        }
        return () => clearInterval(interval);
    }, [isLoading, result]);

    const handleAnalyzeClick = (e?: any) => {
        handleSubmit(e || ({ preventDefault: () => {} } as any));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile.birthDate) {
            setError('생년월일을 입력해주세요.');
            return;
        }
        const sajuData = safeCalculateSaju(profile.birthDate, profile.birthTime, profile.gender);
        if (!sajuData) {
            setError('유효한 생년월일(1900~2050년)을 입력해주세요.');
            return;
        }

        setIsPaying(true);
        setError(null);
        try {
            const res = await startServicePayment({
                serviceType: 'TRIP',
                serviceName: '행운의 여행지 분석',
                returnPath: '/myluck?type=trip',
                payload: {
                    type: 'trip',
                    serviceType: 'trip',
                    name: profile.name || '이용자',
                    birthDate: profile.birthDate,
                    birthTime: profile.birthTime,
                    gender: profile.gender,
                    mbti: profile.mbti || '미입력',
                    sajuData,
                    tripType,
                    selectedRegion,
                    duration,
                    requirements
                },
                customerName: profile.name,
            });
            if (!res.success && res.error_msg) {
                setError(res.error_msg);
            }
        } catch (err: any) {
            console.error(err);
            setError('결제 준비 중 오류가 발생했습니다.');
        } finally {
            setIsPaying(false);
        }
    };

    const handleShareInstagram = async () => {
        if (!shareRef.current || !result) return;
        setIsSharing(true);
        try {
            const fileName = `MBTIJU_Trip_Story_${new Date().getTime()}`;
            await generateImage(shareRef.current, fileName, 2, {
                title: '행운의 여행지 추천 | MBTIJU',
                text: 'MBTIJU에서 확인한 나의 사주 맞춤 여행지입니다.',
            });
            alert('인스타그램 스토리용 이미지가 다운로드되었습니다.');
        } catch (err) {
            alert('이미지 생성 중 오류가 발생했습니다.');
        } finally {
            setIsSharing(false);
        }
    };

    return (
        <div className={isEmbedded ? "pb-12 animate-fade-in" : "min-h-screen bg-slate-50 pb-32 pt-20 animate-fade-in"}>
            <div className="max-w-2xl mx-auto px-4">
                {!isEmbedded && (
                    <div className="flex items-center justify-between mb-8 px-4">
                        <button 
                            onClick={() => navigate('/fortune')}
                            className="p-2 hover:bg-white rounded-full transition-colors"
                        >
                            <ChevronLeft className="w-6 h-6 text-slate-600" />
                        </button>
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-100 text-sky-700 rounded-full text-sm font-bold">
                            <CreditCard className="w-4 h-4" />
                            {SERVICE_COSTS.TRIP.toLocaleString()}원
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-[48px] shadow-2xl shadow-sky-100/50 overflow-hidden border border-white flex flex-col">
                    <div className="p-10 pb-4 border-b border-slate-50">
                        <div className="flex justify-between items-end">
                            <div className="flex items-center gap-2 text-sky-600 font-black tracking-widest text-[10px] uppercase mb-2">
                                <Plane className="w-5 h-5 text-sky-400" /> 여행 추천
                            </div>
                        </div>
                        <h1 className="text-4xl font-black text-slate-950 tracking-tighter leading-none">행운의 여행지 분석</h1>
                    </div>

                    <div className="p-10">
                        {!isFormSubmitted ? (
                            <div className="space-y-10 animate-fade-in">
                                <GuestProfileCard profile={profile} onChange={updateProfile} compact />
                                <section className="space-y-6">
                                    <label className="flex items-center gap-3 text-sm font-black text-slate-950 uppercase tracking-[0.2em]">
                                        <Globe className="w-5 h-5 text-sky-500" /> 어디로 떠날까요?
                                    </label>
                                    <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full mb-6">
                                        <button
                                            onClick={() => {
                                                setTripType('domestic');
                                                setSelectedRegion(DOMESTIC_REGIONS[16]);
                                            }}
                                            className={`flex-1 py-4 text-sm font-bold rounded-xl transition-all ${tripType === 'domestic' ? 'bg-white shadow-md text-sky-600' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            국내여행
                                        </button>
                                        <button
                                            onClick={() => {
                                                setTripType('international');
                                                setSelectedRegion(INTERNATIONAL_REGIONS[0]);
                                            }}
                                            className={`flex-1 py-4 text-sm font-bold rounded-xl transition-all ${tripType === 'international' ? 'bg-white shadow-md text-sky-600' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            해외여행
                                        </button>
                                    </div>
                                    <select 
                                        value={selectedRegion}
                                        onChange={(e) => setSelectedRegion(e.target.value)}
                                        className="w-full bg-slate-50 border-2 border-slate-100 text-slate-950 text-lg rounded-2xl focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 block p-5 font-bold outline-none transition-all appearance-none cursor-pointer"
                                    >
                                        {(tripType === 'domestic' ? DOMESTIC_REGIONS : INTERNATIONAL_REGIONS).map(region => (
                                            <option key={region} value={region}>{region}</option>
                                        ))}
                                    </select>
                                </section>

                                <section className="space-y-6">
                                    <label className="flex flex-col gap-2">
                                        <span className="flex items-center gap-3 text-sm font-black text-slate-950 uppercase tracking-[0.2em]">
                                            <CalendarDays className="w-5 h-5 text-sky-500" /> 여행 일정 (최대 14일)
                                        </span>
                                    </label>
                                    <div className="flex items-center gap-8 bg-slate-50 p-6 rounded-3xl">
                                        <input 
                                            type="range" 
                                            min="1" 
                                            max="14" 
                                            value={duration} 
                                            onChange={(e) => setDuration(Number(e.target.value))}
                                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-500"
                                        />
                                        <span className="shrink-0 w-20 text-center font-black text-sky-600 text-2xl bg-white shadow-sm py-3 rounded-2xl border border-sky-100">
                                            {duration}일
                                        </span>
                                    </div>
                                </section>

                                <section className="space-y-6">
                                    <label className="flex items-center gap-3 text-sm font-black text-slate-950 uppercase tracking-[0.2em]">
                                        <PenLine className="w-5 h-5 text-sky-500" /> 나만의 여행 스타일
                                    </label>
                                    <textarea
                                        rows={4}
                                        placeholder="예: 맛집 위주로 다닐래요, 조용한 휴양이 좋아요, 예산이 넉넉하지 않아요 등"
                                        value={requirements}
                                        onChange={(e) => setRequirements(e.target.value)}
                                        className="block p-6 w-full text-lg text-slate-950 bg-slate-50 rounded-[32px] border-2 border-slate-100 focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 outline-none transition-all resize-none placeholder:text-slate-300"
                                    />
                                </section>

                                {error && (
                                    <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold">
                                        {error}
                                    </div>
                                )}

                                <div className="pt-4">
                                    <button 
                                        onClick={handleAnalyzeClick} 
                                        disabled={isPaying}
                                        className="w-full py-5 bg-slate-950 hover:bg-sky-700 text-white rounded-2xl font-bold text-lg shadow transition-colors flex flex-col items-center justify-center gap-1 disabled:opacity-60"
                                    >
                                        <span>{isPaying ? '결제 창 여는 중...' : `운명의 여행지 찾기 (${SERVICE_COSTS.TRIP.toLocaleString()}원 결제)`}</span>
                                        <span className="text-xs text-sky-200 font-normal">가입 없이 1회 단품 결제 · 즉시 분석</span>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div ref={reportRef} className="animate-fade-in space-y-6">
                                <StreamingStatusBanner
                                    isStreaming={isLoading}
                                    hasData={!!result}
                                    error={!result ? error : null}
                                    onRetry={handleRetry}
                                    streamingTitle={currentLoadingMessage || '결제가 완료되어 맞춤 여행지를 탐색하고 있습니다'}
                                    streamingSubtitle="작성되는 일정부터 아래에 바로 표시됩니다."
                                    completedText="맞춤 여행지 분석이 완료되었습니다."
                                />

                                {result && (
                                    <ReportErrorBoundary onRetry={handleRetry}>
                                        <div className="space-y-12 animate-fade-up text-left">
                                            {result?.concept && (
                                                <div className="bg-slate-900 p-6 sm:p-8 rounded-2xl text-white border border-slate-800 space-y-2">
                                                    <p className="text-sm font-bold text-sky-300">이번 여행의 테마</p>
                                                    <p
                                                        className="text-2xl sm:text-3xl font-bold leading-snug break-keep"
                                                        style={{ fontFamily: "'NanumMyungjo', 'Noto Serif KR', serif" }}
                                                    >
                                                        {stripMarkdown(result.concept)}
                                                    </p>
                                                </div>
                                            )}

                                            {Array.isArray(result?.places) && result.places.length > 0 && (
                                                <section className="space-y-5">
                                                    <h4 className="text-xl sm:text-2xl font-bold text-slate-950 pb-2 border-b border-stone-200">
                                                        추천 여행지 BEST {result.places.length}
                                                    </h4>
                                                    <div className="space-y-5">
                                                        {result.places.map((place: any, i: number) => {
                                                            if (!place) return null;
                                                            return (
                                                                <div key={i} className="bg-stone-50/70 p-6 sm:p-7 rounded-2xl border border-stone-200 space-y-4">
                                                                    <h5 className="text-xl sm:text-2xl font-bold text-slate-950 leading-snug">
                                                                        {i + 1}. {place.name || ''}
                                                                    </h5>
                                                                    {place.reason && (
                                                                        <div className="space-y-1.5">
                                                                            <p className="text-base font-bold text-sky-800">추천 이유</p>
                                                                            <p className="text-[15px] sm:text-base text-slate-800 leading-[1.9] whitespace-pre-wrap break-keep">
                                                                                {stripMarkdown(place.reason)}
                                                                            </p>
                                                                        </div>
                                                                    )}
                                                                    {place.activity && (
                                                                        <div className="space-y-1.5 pt-3 border-t border-stone-200/80">
                                                                            <p className="text-base font-bold text-slate-900">추천 활동</p>
                                                                            <p className="text-[15px] sm:text-base text-slate-800 leading-[1.9] whitespace-pre-wrap break-keep">
                                                                                {stripMarkdown(place.activity)}
                                                                            </p>
                                                                        </div>
                                                                    )}
                                                                    {place.photoSpot && (
                                                                        <div className="bg-white border border-stone-200 p-4 rounded-xl space-y-1">
                                                                            <p className="text-sm font-bold text-sky-800">사진 포인트</p>
                                                                            <p className="text-[15px] text-slate-800 leading-[1.8] break-keep">{stripMarkdown(place.photoSpot)}</p>
                                                                        </div>
                                                                    )}
                                                                    {place.food && (
                                                                        <div className="bg-[#FAF7F0] border border-[#E6DFD1] p-4 rounded-xl space-y-1">
                                                                            <p className="text-sm font-bold text-amber-800">보완 음식</p>
                                                                            <p className="text-[15px] text-slate-800 leading-[1.8] break-keep">{stripMarkdown(place.food)}</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </section>
                                            )}

                                            {Array.isArray(result?.itinerary) && result.itinerary.length > 0 && (
                                                <section className="space-y-5">
                                                    <h4 className="text-xl sm:text-2xl font-bold text-slate-950 pb-2 border-b border-stone-200">
                                                        맞춤 일정 가이드
                                                    </h4>
                                                    <div className="space-y-5">
                                                        {result.itinerary.map((day: any, i: number) => {
                                                            if (!day) return null;
                                                            return (
                                                                <div key={i} className="bg-white p-6 rounded-2xl border border-stone-200 space-y-3">
                                                                    <h5 className="text-lg sm:text-xl font-bold text-sky-900">
                                                                        {day.day || `${i + 1}일차`}
                                                                    </h5>
                                                                    <ul className="space-y-3">
                                                                        {day.schedule?.filter((item: any): item is string => typeof item === 'string').map((item: string, j: number) => (
                                                                            <li key={j} className="flex gap-3 items-start text-[15px] sm:text-base text-slate-800 leading-[1.85]">
                                                                                <span className="text-stone-400 font-bold select-none">•</span>
                                                                                <span className="break-keep">{stripMarkdown(item)}</span>
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </section>
                                            )}

                                            {(result?.companion || result?.luckyItem) && (
                                                <section className="space-y-5">
                                                    {result.companion && (
                                                        <div className="bg-white p-6 rounded-2xl border border-stone-200 space-y-2">
                                                            <h5 className="text-lg font-bold text-slate-950">어울리는 동행 스타일</h5>
                                                            <p className="text-[15px] sm:text-base text-slate-800 leading-[1.9] whitespace-pre-wrap break-keep">
                                                                {stripMarkdown(result.companion)}
                                                            </p>
                                                        </div>
                                                    )}
                                                    {result.luckyItem && (
                                                        <div className="bg-white p-6 rounded-2xl border border-stone-200 space-y-2">
                                                            <h5 className="text-lg font-bold text-slate-950">챙겨가면 좋은 소품</h5>
                                                            <p className="text-[15px] sm:text-base text-slate-800 leading-[1.9] whitespace-pre-wrap break-keep">
                                                                {stripMarkdown(result.luckyItem)}
                                                            </p>
                                                        </div>
                                                    )}
                                                </section>
                                            )}

                                            <section className="bg-[#FAF7F0] p-6 sm:p-8 rounded-2xl border border-[#E6DFD1] space-y-6">
                                                <h4 className="text-xl sm:text-2xl font-bold text-slate-950 pb-2 border-b border-[#E6DFD1]">
                                                    여행 총평 및 현실 조언
                                                </h4>
                                                {result.summary && (
                                                    <div className="space-y-2">
                                                        <p className="text-base font-bold text-slate-900">여행 총평</p>
                                                        <p className="text-[15px] sm:text-base text-slate-800 leading-[1.9] whitespace-pre-wrap break-keep">
                                                            {stripMarkdown(result.summary)}
                                                        </p>
                                                    </div>
                                                )}
                                                {result.bestTime && (
                                                    <div className="space-y-2 pt-4 border-t border-[#E6DFD1]">
                                                        <p className="text-base font-bold text-slate-900">추천 출발 시기</p>
                                                        <p className="text-[15px] sm:text-base text-slate-800 leading-[1.9] whitespace-pre-wrap break-keep">
                                                            {stripMarkdown(result.bestTime)}
                                                        </p>
                                                    </div>
                                                )}
                                                {result.tip && (
                                                    <div className="space-y-2 pt-4 border-t border-[#E6DFD1]">
                                                        <p className="text-base font-bold text-slate-900">현실 당부 및 팁</p>
                                                        <p className="text-[15px] sm:text-base text-slate-800 leading-[1.9] whitespace-pre-wrap break-keep">
                                                            {stripMarkdown(result.tip)}
                                                        </p>
                                                    </div>
                                                )}
                                            </section>

                                            {/* Hidden Instagram sharing card */}
                                            <div className="fixed left-[-9999px] top-0 pointer-events-none" aria-hidden="true">
                                                {result && (
                                                    <TripShareCard
                                                        ref={shareRef}
                                                        result={result as any}
                                                        userName={profile.name || '사용자'}
                                                    />
                                                )}
                                            </div>

                                            {!isLoading && (
                                                <>
                                                    <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-stone-200">
                                                        <button 
                                                            onClick={handleShareInstagram}
                                                            disabled={isSharing}
                                                            className="flex-1 py-4 px-6 bg-slate-950 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-sky-700 transition-colors disabled:opacity-75"
                                                        >
                                                            {isSharing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Instagram className="w-5 h-5" />}
                                                            결과 이미지 저장
                                                        </button>
                                                        <button 
                                                            onClick={() => { setError(null); setIsFormSubmitted(false); }} 
                                                            className="flex-1 py-4 px-6 bg-stone-100 text-slate-800 rounded-xl font-bold text-sm hover:bg-stone-200 transition-colors"
                                                        >
                                                            새로운 계획으로 분석하기
                                                        </button>
                                                    </div>

                                                    <FunnelBottomCta from="trip_result" />
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
        </div>
    );
};

export default TripPage;
