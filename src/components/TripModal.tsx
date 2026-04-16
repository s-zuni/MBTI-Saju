import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Loader2, MapPin, Plane, Calendar, Download, Globe, CalendarDays, PenLine } from 'lucide-react';
import { generatePDF } from '../utils/pdfGenerator';
import { stripMarkdown } from '../utils/textUtils';
import ServiceNavigation, { ServiceType } from './ServiceNavigation';
import { experimental_useObject as useObject } from '@ai-sdk/react';
import { tripSchema } from '../config/schemas';
import { SERVICE_COSTS } from '../config/creditConfig';
import { calculateSaju } from '../utils/sajuUtils';

interface TripModalProps {
    isOpen: boolean;
    onClose: () => void;
    onNavigate: (service: ServiceType) => void;
    onUseCredit?: () => Promise<boolean>;
    credits?: number;
    session: any;
}

const DOMESTIC_REGIONS = [
    '서울특별시', '부산광역시', '대구광역시', '인천광역시', '광주광역시', '대전광역시', '울산광역시', '세종특별자치시', 
    '경기도', '강원특별자치도', '충청북도', '충청남도', '전북특별자치도', '전라남도', '경상북도', '경상남도', '제주특별자치도'
];

const INTERNATIONAL_REGIONS = [
    '일본 (도쿄/오사카 등)', '중화권 (대만/홍콩/마카오)', '동남아시아 (베트남/태국 등)', '북미 (미국/캐나다)', 
    '휴양지 (하와이/괌/사이판)', '서유럽 (영국/프랑스 등)', '동유럽 (체코/헝가리 등)', 
    '남유럽 (이탈리아/스페인 등)', '오세아니아 (호주/뉴질랜드)', '기타 (중남미/아프리카 등)'
];

interface TripContentProps {
    onUseCredit?: (() => Promise<boolean>) | undefined;
    credits?: number | undefined;
    session: any;
    onReset: () => void;
    onNavigate: (service: ServiceType) => void;
    onClose: () => void;
}

const TripModalContent: React.FC<TripContentProps> = ({ onUseCredit, credits, session, onReset, onNavigate, onClose }) => {
    const reportRef = useRef<HTMLDivElement>(null);
    const [error, setError] = useState<string | null>(null);

    // Form States
    const [isFormSubmitted, setIsFormSubmitted] = useState(false);
    const [tripType, setTripType] = useState<'domestic' | 'international'>('domestic');
    const [selectedRegion, setSelectedRegion] = useState(DOMESTIC_REGIONS[16]); // Default: 제주
    const [duration, setDuration] = useState<number>(3);
    const [requirements, setRequirements] = useState('');

    useEffect(() => {
        setSelectedRegion(tripType === 'domestic' ? DOMESTIC_REGIONS[16] : INTERNATIONAL_REGIONS[0]);
    }, [tripType]);

    // Streaming Hook
    const { object: result, submit, isLoading } = useObject({
        api: '/api/analysis-special',
        schema: tripSchema,
        headers: {
            'Authorization': `Bearer ${session?.access_token || ''}`
        }
    });

    const fetchRecommendation = useCallback(async () => {
        const cost = SERVICE_COSTS.TRIP;
        if (credits !== undefined && credits < cost) {
            onNavigate('creditPurchase' as any);
            onClose();
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

            if (onUseCredit) {
                await onUseCredit();
            }
        } catch (e: any) {
            setError(e.message);
        }
    }, [credits, onNavigate, onClose, session, submit, onUseCredit, selectedRegion, duration, requirements]);

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

    return (
        <div className="px-8 sm:px-12 pb-12 pt-4 overflow-y-auto custom-scrollbar grow bg-white">
            {!isFormSubmitted ? (
                <div className="space-y-8 animate-fade-in py-4">
                    {/* Form Input Section */}
                    <section className="space-y-4">
                        <label className="flex items-center gap-2 text-sm font-black text-slate-950 uppercase tracking-widest">
                            <Globe className="w-4 h-4 text-sky-500" /> 대상 지역
                        </label>
                        <div className="flex bg-slate-100 p-1 rounded-2xl w-full mb-4">
                            <button
                                onClick={() => setTripType('domestic')}
                                className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${tripType === 'domestic' ? 'bg-white shadow-sm text-sky-600' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                국내여행
                            </button>
                            <button
                                onClick={() => setTripType('international')}
                                className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${tripType === 'international' ? 'bg-white shadow-sm text-sky-600' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                해외여행
                            </button>
                        </div>
                        <select 
                            value={selectedRegion}
                            onChange={(e) => setSelectedRegion(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 text-slate-950 text-base rounded-2xl focus:ring-sky-500 focus:border-sky-500 block p-4 font-bold outline-none transition-all"
                        >
                            {(tripType === 'domestic' ? DOMESTIC_REGIONS : INTERNATIONAL_REGIONS).map(region => (
                                <option key={region} value={region}>{region}</option>
                            ))}
                        </select>
                    </section>

                    <section className="space-y-4">
                        <label className="flex flex-col gap-2">
                            <span className="flex items-center gap-2 text-sm font-black text-slate-950 uppercase tracking-widest">
                                <CalendarDays className="w-4 h-4 text-sky-500" /> 여행 일정 (최대 14일)
                            </span>
                        </label>
                        <div className="flex items-center gap-4">
                            <input 
                                type="range" 
                                min="1" 
                                max="14" 
                                value={duration} 
                                onChange={(e) => setDuration(Number(e.target.value))}
                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-500"
                            />
                            <span className="shrink-0 w-16 text-center font-black text-sky-600 text-lg bg-sky-50 py-2 rounded-xl">
                                {duration}일
                            </span>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <label className="flex items-center gap-2 text-sm font-black text-slate-950 uppercase tracking-widest">
                            <PenLine className="w-4 h-4 text-sky-500" /> 추가 요청사항
                        </label>
                        <textarea
                            rows={3}
                            placeholder="예: 뚜벅이 여행입니다, 맛집 탐방을 좋아해요, 휴양 목적입니다 등"
                            value={requirements}
                            onChange={(e) => setRequirements(e.target.value)}
                            className="block p-4 w-full text-base text-slate-950 bg-slate-50 rounded-2xl border border-slate-200 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all resize-none"
                        />
                    </section>

                    <div className="pt-6">
                        <button 
                            onClick={handleAnalyzeClick} 
                            className="w-full sm:w-auto px-10 py-5 bg-slate-950 hover:bg-sky-500 text-white rounded-full font-black shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgb(14,165,233,0.3)] transition-all flex flex-col items-center justify-center gap-1 mx-auto"
                        >
                            <span className="text-lg">운명 맞춤 여행지 분석하기</span>
                            <span className="text-[10px] text-slate-300 font-medium tracking-widest">{SERVICE_COSTS.TRIP} 크레딧 차감</span>
                        </button>
                    </div>
                </div>
            ) : (
                <div ref={reportRef} className="bg-white">
                {isLoading && !result ? (
                    <div className="flex flex-col justify-center items-center h-80 animate-fade-in">
                        <Loader2 className="w-12 h-12 text-slate-200 animate-spin mb-6" />
                        <p className="text-slate-400 font-bold text-[10px] tracking-widest uppercase">분석 중...</p>
                    </div>
                ) : error ? (
                    <div className="text-center py-20 bg-red-50 rounded-[32px] animate-fade-in">
                        <p className="text-red-500 font-black mb-4">{error}</p>
                        <button onClick={onReset} className="px-8 py-3 bg-slate-950 text-white rounded-full">다시 입력 설정하기</button>
                    </div>
                ) : result ? (
                    <div className="space-y-12 animate-fade-up py-4">
                        <section className="report-section">
                            <h4 className="report-section-title"><MapPin className="w-5 h-5 text-sky-500" /> 추천 여행지 BEST 3</h4>
                            <div className="grid gap-6">
                                {result?.places?.map((place: any, i: number) => (
                                    <div key={i} className="report-card">
                                        <h5 className="text-xl font-black text-slate-950 mb-2">0{i+1}. {place.name}</h5>
                                        <div className="space-y-3 text-sm leading-relaxed text-slate-600">
                                            <p><strong className="text-slate-950">선정 이유:</strong> {stripMarkdown(place.reason)}</p>
                                            <p><strong className="text-slate-950">추천 활동:</strong> {stripMarkdown(place.activity)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section className="report-section">
                            <h4 className="report-section-title"><Calendar className="w-5 h-5 text-sky-500" /> 추천 일정 가이드</h4>
                            <div className="space-y-4">
                                {result?.itinerary?.map((day: any, i: number) => (
                                    <div key={i} className="report-card bg-slate-50">
                                        <h5 className="font-bold text-sky-600 mb-3">{day.day}</h5>
                                        <ul className="space-y-2">
                                            {day.schedule?.map((item: string, j: number) => (
                                                <li key={j} className="text-sm text-slate-600">• {stripMarkdown(item)}</li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <div className="flex flex-col items-center pt-10 border-t border-slate-100 gap-4">
                            <button onClick={handleDownloadPDF} className="px-10 py-5 bg-slate-950 text-white rounded-full font-black shadow-2xl flex items-center gap-3">
                                <Download className="w-5 h-5" /> PDF 결과서 다운로드
                            </button>
                            <button onClick={onReset} className="text-slate-400 text-xs font-bold hover:text-slate-950 transition-colors underline underline-offset-4">새로운 설정으로 다시 분석하기</button>
                        </div>
                    </div>
                ) : null}
                </div>
            )}
        </div>
    );
};

const TripModal: React.FC<TripModalProps> = ({ isOpen, onClose, onNavigate, onUseCredit, credits, session }) => {
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

    return (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl overflow-y-auto h-full w-full flex justify-center items-center z-[1000] p-4 sm:p-6">
            <div className="relative p-0 border-none w-full max-w-2xl shadow-2xl rounded-[48px] bg-white max-h-[94vh] overflow-hidden flex flex-col">
                <ServiceNavigation currentService="trip" onNavigate={onNavigate} onClose={onClose} />

                <div className="bg-white px-8 sm:px-12 pt-10 pb-4 shrink-0">
                    <div className="flex justify-between items-end">
                        <div className="flex items-center gap-2 text-sky-600 font-black tracking-widest text-[10px] uppercase mb-1.5">
                            <Plane className="w-4 h-4 text-sky-400" /> Travel Destination
                        </div>
                        <h3 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tighter leading-none uppercase">맞춤 여행지 분석</h3>
                    </div>
                    <div className="h-[2px] w-full bg-slate-950 mt-8"></div>
                </div>

                <TripModalContent 
                    key={resetKey}
                    onReset={() => setResetKey(prev => prev + 1)}
                    onUseCredit={onUseCredit}
                    credits={credits}
                    session={session}
                    onNavigate={onNavigate}
                    onClose={onClose}
                />
            </div>
        </div>
    );
};

export default TripModal;
