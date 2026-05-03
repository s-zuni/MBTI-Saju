import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { MapPin, Plane, Calendar, Download, Globe, CalendarDays, PenLine, ChevronLeft, Coins } from 'lucide-react';
import { generatePDF } from '../utils/pdfGenerator';
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

    const handleDownloadPDF = async () => {
        if (!reportRef.current || !result) return;
        try {
            await generatePDF(reportRef.current, `MBTIJU_Trip_Report_${new Date().getTime()}`);
        } catch (err) {
            alert('PDF 생성 중 오류가 발생했습니다.');
        }
    };

    if (isAuthLoading) return null;
    if (!session) {
        navigate('/');
        return null;
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
                                <Plane className="w-5 h-5 text-sky-400" /> Travel Recommendation
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
                                        <span className="text-xs text-sky-400 font-bold tracking-widest">{SERVICE_COSTS.TRIP} CREDITS</span>
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
                                                                <p className="text-xs font-black text-sky-600 uppercase tracking-widest">Why this place?</p>
                                                                <p className="text-slate-700 leading-relaxed font-medium text-lg break-keep">{stripMarkdown(place.reason)}</p>
                                                            </div>
                                                            <div className="space-y-2">
                                                                <p className="text-xs font-black text-sky-600 uppercase tracking-widest">Recommended Activities</p>
                                                                <p className="text-slate-700 leading-relaxed font-medium text-lg break-keep">{stripMarkdown(place.activity)}</p>
                                                            </div>
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

                                        <div className="flex flex-col items-center pt-12 border-t border-slate-100 gap-6">
                                            <button 
                                                onClick={handleDownloadPDF} 
                                                className="w-full sm:w-auto px-12 py-6 bg-slate-950 text-white rounded-[32px] font-black text-xl shadow-2xl flex items-center justify-center gap-4 hover:bg-sky-600 transition-all"
                                            >
                                                <Download className="w-6 h-6" /> 결과서 PDF 다운로드
                                            </button>
                                            <button 
                                                onClick={() => setIsFormSubmitted(false)} 
                                                className="text-slate-400 text-sm font-black hover:text-sky-600 transition-colors uppercase tracking-widest underline underline-offset-8"
                                            >
                                                Try Again with New Plan
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
