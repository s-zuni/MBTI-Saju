import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { MapPin, Plane, Calendar, Globe, CalendarDays, PenLine, ChevronLeft, Coins, Lock, Camera, Coffee, Users, Sparkles, Lightbulb, Clock, Heart, Loader2, Instagram } from 'lucide-react';
import { generateImage } from '../utils/exportUtils';
import TripShareCard from '../components/TripShareCard';
import { stripMarkdown } from '../utils/textUtils';
import { useAuth } from '../hooks/useAuth';
import { useCredits } from '../hooks/useCredits';
import { useModalStore } from '../hooks/useModalStore';
import { experimental_useObject as useObject } from '@ai-sdk/react';
import { tripSchema } from '../config/schemas';
import { SERVICE_COSTS } from '../config/creditConfig';
import { calculateSaju } from '../utils/sajuUtils';
import { getRandomLoadingMessage } from '../config/loadingMessages';

const DOMESTIC_REGIONS = [
    '서울특별시', '부산광역시', '대구광역시', '인천광역시', '광주광역시', '대전광역시', '울산광역시', '세종특별자치시', 
    '경기도', '강원특별자치도', '충청북도', '충청남도', '전북특별자치도', '전라남도', '경상북도', '경상남도', '제주특별자치도'
];

const INTERNATIONAL_REGIONS = [
    '일본 (도쿄/오사카 등)', '중화권 (대만/홍콩/마카오)', '동남아시아 (베트남/태국 등)', '북미 (미국/캐나다)', 
    '휴양지 (하와이/괌/사이판)', '서유럽 (영국/프랑스 등)', '동유럽 (체코/헝가리 등)', 
    '남유럽 (이탈리아/스페인 등)', '오세아니아 (호주/뉴질랜드)', '기타 (중남미/아프리카 등)'
];

const TripPage: React.FC = () => {
    const { session, loading: isAuthLoading } = useAuth();
    const { credits, useCredits: consumeCredits } = useCredits(session);
    const { openModal } = useModalStore();
    const navigate = useNavigate();
    const reportRef = useRef<HTMLDivElement>(null);

    const [isFormSubmitted, setIsFormSubmitted] = useState(false);
    const [tripType, setTripType] = useState<'domestic' | 'international'>('domestic');
    const [selectedRegion, setSelectedRegion] = useState(DOMESTIC_REGIONS[16]);
    const [duration, setDuration] = useState<number>(3);
    const [requirements, setRequirements] = useState('');
    const [currentLoadingMessage, setCurrentLoadingMessage] = useState('');
    const [error, setError] = useState<string | null>(null);
    const shareRef = useRef<HTMLDivElement>(null);
    const [isSharing, setIsSharing] = useState(false);

    // Streaming Hook
    const { object: result, submit, isLoading } = useObject({
        api: '/api/analysis-special',
        schema: tripSchema,
        headers: {
            'Authorization': `Bearer ${session?.access_token || ''}`
        }
    });

    useEffect(() => {
        setSelectedRegion(tripType === 'domestic' ? DOMESTIC_REGIONS[16] : INTERNATIONAL_REGIONS[0]);
    }, [tripType]);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isLoading && !result) {
            setCurrentLoadingMessage(getRandomLoadingMessage('trip'));
            interval = setInterval(() => {
                setCurrentLoadingMessage(getRandomLoadingMessage('trip'));
            }, 5000);
        }
        return () => clearInterval(interval);
    }, [isLoading, result]);

    const fetchRecommendation = useCallback(async () => {
        const cost = SERVICE_COSTS.TRIP;
        if (credits !== undefined && credits < cost) {
            openModal('creditPurchase', undefined, { requiredCredits: cost });
            return;
        }

        try {
            const { data: { session: fetchedSession } } = await supabase.auth.getSession();
            const activeSession = fetchedSession || session;
            
            const metadata = activeSession?.user?.user_metadata;
            if (!metadata) throw new Error('로그인이 필요합니다.');
            if (!metadata.birth_date || !metadata.mbti) {
                throw new Error('프로필 정보(생년월일, MBTI)가 설정되지 않았습니다.');
            }

            setError(null);
            
            const sajuData = calculateSaju(metadata.birth_date, metadata.birth_time);
            submit({
                type: 'trip',
                name: metadata.full_name || '사용자',
                mbti: metadata.mbti,
                birthDate: metadata.birth_date,
                birthTime: metadata.birth_time,
                sajuData,
                region: selectedRegion,
                startDate: '1일차',
                endDate: `${duration}일차 (총 ${duration}일)`,
                requirements: requirements || '특별한 요청사항 없음'
            });

            await consumeCredits('TRIP');
        } catch (e: any) {
            setError(e.message);
        }
    }, [credits, session, submit, consumeCredits, selectedRegion, duration, requirements, openModal]);

    const handleAnalyzeClick = () => {
        setIsFormSubmitted(true);
        fetchRecommendation();
    };

    const handleShareInstagram = async () => {
        if (!shareRef.current || !result) return;
        setIsSharing(true);
        try {
            const fileName = `MBTIJU_Trip_Story_${new Date().getTime()}`;
            await generateImage(shareRef.current, fileName);
            alert('인스타그램 스토리용 이미지가 다운로드되었습니다.');
        } catch (err) {
            alert('이미지 생성 중 오류가 발생했습니다.');
        } finally {
            setIsSharing(false);
        }
    };

    if (isAuthLoading) return null;
    if (!session) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
                <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mb-6">
                    <Lock className="w-10 h-10 text-indigo-600" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-4">로그인이 필요합니다</h2>
                <p className="text-slate-500 mb-8">여행 운세 서비스를 이용하시려면 로그인이 필요합니다.</p>
                <button
                    onClick={() => {
                        navigate('/');
                        setTimeout(() => openModal('analysis', 'login'), 100);
                    }}
                    className="px-8 py-4 bg-slate-950 text-white font-bold rounded-2xl shadow-xl hover:bg-indigo-600 transition-all active:scale-95 animate-bounce"
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
                        onClick={() => navigate('/fortune')}
                        className="p-2 hover:bg-white rounded-full transition-colors"
                    >
                        <ChevronLeft className="w-6 h-6 text-slate-600" />
                    </button>
                    <div className="flex items-center gap-1 px-3 py-1.5 bg-sky-100 text-sky-600 rounded-full text-sm font-bold">
                        <Coins className="w-4 h-4" />
                        {credits}
                    </div>
                </div>

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
                                <section className="space-y-6">
                                    <label className="flex items-center gap-3 text-sm font-black text-slate-950 uppercase tracking-[0.2em]">
                                        <Globe className="w-5 h-5 text-sky-500" /> 어디로 떠날까요?
                                    </label>
                                    <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full mb-6">
                                        <button
                                            onClick={() => setTripType('domestic')}
                                            className={`flex-1 py-4 text-sm font-bold rounded-xl transition-all ${tripType === 'domestic' ? 'bg-white shadow-md text-sky-600' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            국내여행
                                        </button>
                                        <button
                                            onClick={() => setTripType('international')}
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

                                <div className="pt-8">
                                    <button 
                                        onClick={handleAnalyzeClick} 
                                        className="w-full py-6 bg-slate-950 hover:bg-sky-600 text-white rounded-[32px] font-black text-xl shadow-2xl hover:shadow-sky-200/50 active:scale-[0.98] transition-all flex flex-col items-center justify-center gap-2"
                                    >
                                        <span>운명의 여행지 찾기</span>
                                        <span className="text-xs text-sky-400 font-bold tracking-widest">{SERVICE_COSTS.TRIP} 크레딧</span>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div ref={reportRef} className="animate-fade-in">
                                {isLoading && !result ? (
                                    <div className="flex flex-col justify-center items-center py-20 px-6 text-center">
                                        <div className="relative mb-12">
                                            <div className="w-20 h-20 border-4 border-sky-100 rounded-full"></div>
                                            <div className="absolute top-0 left-0 w-20 h-20 border-4 border-t-sky-500 rounded-full animate-spin"></div>
                                        </div>
                                        <div className="space-y-4">
                                            <p className="text-slate-950 font-black text-2xl tracking-tight">
                                                {currentLoadingMessage || '여행지를 탐색하는 중입니다...'}
                                            </p>
                                            <p className="text-slate-400 font-bold text-xs tracking-widest uppercase">
                                                데이터 정밀 분석 중
                                            </p>
                                        </div>
                                    </div>
                                ) : error ? (
                                    <div className="text-center py-20 bg-red-50 rounded-[40px]">
                                        <p className="text-red-600 font-black text-lg mb-6">{error}</p>
                                        <button 
                                            onClick={() => setIsFormSubmitted(false)} 
                                            className="px-10 py-4 bg-slate-950 text-white rounded-2xl font-bold hover:bg-slate-800 transition-colors"
                                        >
                                            다시 설정하기
                                        </button>
                                    </div>
                                ) : result ? (
                                    <div className="space-y-16 animate-fade-up">
                                        {result?.concept && (
                                            <div className="bg-gradient-to-br from-sky-500 to-indigo-600 p-8 rounded-[40px] text-white shadow-xl">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <Heart className="w-8 h-8 text-sky-200" />
                                                    <h3 className="text-xl font-bold text-sky-100">이번 여행의 테마</h3>
                                                </div>
                                                <p className="text-3xl font-black leading-tight break-keep">{stripMarkdown(result.concept)}</p>
                                            </div>
                                        )}

                                        <section className="space-y-8">
                                            <h4 className="text-xl font-black text-slate-950 inline-flex items-center gap-3 bg-sky-50 py-3 px-6 rounded-full">
                                                <MapPin className="w-6 h-6 text-sky-500" /> 추천 여행지 BEST 3
                                            </h4>
                                            <div className="grid gap-8">
                                                {result?.places?.map((place: any, i: number) => (
                                                    <div key={i} className="bg-slate-50 p-8 rounded-[40px] border border-slate-100 hover:bg-white hover:shadow-xl transition-all group">
                                                        <div className="flex items-start justify-between mb-6">
                                                            <h5 className="text-2xl font-black text-slate-950 leading-tight">
                                                                <span className="text-sky-500 mr-2">0{i+1}.</span> {place.name}
                                                            </h5>
                                                        </div>
                                                        <div className="space-y-6">
                                                            <div className="space-y-2">
                                                                <p className="text-xs font-black text-sky-600 uppercase tracking-widest">추천 이유</p>
                                                                <p className="text-slate-700 leading-relaxed font-medium text-lg break-keep">{stripMarkdown(place.reason)}</p>
                                                            </div>
                                                            <div className="space-y-2">
                                                                <p className="text-xs font-black text-sky-600 uppercase tracking-widest">추천 활동</p>
                                                                <p className="text-slate-700 leading-relaxed font-medium text-lg break-keep">{stripMarkdown(place.activity)}</p>
                                                            </div>
                                                            {place.photoSpot && (
                                                                <div className="space-y-2 bg-sky-50 p-4 rounded-2xl">
                                                                    <p className="text-xs font-black text-sky-600 uppercase tracking-widest flex items-center gap-1"><Camera className="w-4 h-4"/> 인생샷 포토스팟</p>
                                                                    <p className="text-slate-700 leading-relaxed font-medium break-keep">{stripMarkdown(place.photoSpot)}</p>
                                                                </div>
                                                            )}
                                                            {place.food && (
                                                                <div className="space-y-2 bg-orange-50 p-4 rounded-2xl">
                                                                    <p className="text-xs font-black text-orange-600 uppercase tracking-widest flex items-center gap-1"><Coffee className="w-4 h-4"/> 행운의 음식</p>
                                                                    <p className="text-slate-700 leading-relaxed font-medium break-keep">{stripMarkdown(place.food)}</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </section>

                                        <section className="space-y-8">
                                            <h4 className="text-xl font-black text-slate-950 inline-flex items-center gap-3 bg-sky-50 py-3 px-6 rounded-full">
                                                <Calendar className="w-6 h-6 text-sky-500" /> 맞춤 일정 가이드
                                            </h4>
                                            <div className="space-y-6">
                                                {result?.itinerary?.map((day: any, i: number) => (
                                                    <div key={i} className="bg-white p-8 rounded-[40px] border-2 border-slate-50 shadow-sm">
                                                        <h5 className="text-xl font-black text-sky-600 mb-6 flex items-center gap-3">
                                                            <span className="w-8 h-8 bg-sky-100 rounded-xl flex items-center justify-center text-sm">{i+1}</span>
                                                            {day.day}
                                                        </h5>
                                                        <ul className="space-y-4">
                                                            {day.schedule?.map((item: string, j: number) => (
                                                                <li key={j} className="flex gap-4 items-start text-lg text-slate-700 font-medium leading-relaxed">
                                                                    <span className="mt-2 w-1.5 h-1.5 bg-sky-300 rounded-full shrink-0" />
                                                                    <span className="break-keep">{stripMarkdown(item)}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                ))}
                                            </div>
                                        </section>

                                        {(result?.companion || result?.luckyItem) && (
                                            <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {result.companion && (
                                                    <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm flex flex-col gap-4">
                                                        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
                                                            <Users className="w-6 h-6 text-indigo-500" />
                                                        </div>
                                                        <div>
                                                            <h5 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-2">최고의 여행 메이트</h5>
                                                            <p className="text-slate-950 font-bold text-lg break-keep">{stripMarkdown(result.companion)}</p>
                                                        </div>
                                                    </div>
                                                )}
                                                {result.luckyItem && (
                                                    <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm flex flex-col gap-4">
                                                        <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center">
                                                            <Sparkles className="w-6 h-6 text-amber-500" />
                                                        </div>
                                                        <div>
                                                            <h5 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-2">행운의 아이템</h5>
                                                            <p className="text-slate-950 font-bold text-lg break-keep">{stripMarkdown(result.luckyItem)}</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </section>
                                        )}

                                        <section className="space-y-6">
                                            <div className="bg-slate-950 p-8 rounded-[40px] text-white">
                                                <h4 className="text-xl font-black text-white inline-flex items-center gap-3 mb-6">
                                                    <Lightbulb className="w-6 h-6 text-yellow-400" /> 여행 총평 & 꿀팁
                                                </h4>
                                                <div className="space-y-6">
                                                    <div>
                                                        <p className="text-slate-400 text-sm font-bold mb-2 uppercase tracking-widest">여행 총평</p>
                                                        <p className="text-lg font-medium leading-relaxed break-keep">{stripMarkdown(result.summary || '')}</p>
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-800">
                                                        <div>
                                                            <p className="text-slate-400 text-sm font-bold mb-2 uppercase tracking-widest flex items-center gap-2"><Clock className="w-4 h-4"/> 가장 좋은 시기</p>
                                                            <p className="text-slate-200 font-medium break-keep">{stripMarkdown(result.bestTime || '')}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-slate-400 text-sm font-bold mb-2 uppercase tracking-widest flex items-center gap-2"><Lightbulb className="w-4 h-4"/> 추천 조언</p>
                                                            <p className="text-slate-200 font-medium break-keep">{stripMarkdown(result.tip || '')}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </section>

                                        {/* Hidden Instagram sharing card */}
                                        <div className="fixed left-[-9999px] top-[-9999px]">
                                            {result && (
                                                <TripShareCard
                                                    ref={shareRef}
                                                    result={result as any}
                                                    userName={session?.user?.user_metadata?.full_name || '사용자'}
                                                />
                                            )}
                                        </div>

                                        <div className="flex flex-col items-center pt-12 border-t border-slate-100 gap-6">
                                            <button 
                                                onClick={handleShareInstagram}
                                                disabled={isSharing}
                                                className="w-full sm:w-auto px-12 py-6 bg-slate-950 text-white rounded-[32px] font-black text-xl shadow-2xl flex items-center justify-center gap-4 hover:bg-sky-600 transition-all disabled:opacity-75"
                                            >
                                                {isSharing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Instagram className="w-6 h-6" />}
                                                결과 이미지 저장 (인스타 공유)
                                            </button>
                                            <button 
                                                onClick={() => setIsFormSubmitted(false)} 
                                                className="text-slate-400 text-sm font-black hover:text-sky-600 transition-colors uppercase tracking-widest underline underline-offset-8"
                                            >
                                                새로운 계획으로 다시 분석하기
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

export default TripPage;
