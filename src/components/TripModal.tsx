import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Loader2, MapPin, Plane, Calendar, Download } from 'lucide-react';
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

const TripModal: React.FC<TripModalProps> = ({ isOpen, onClose, onNavigate, onUseCredit, credits, session }) => {
    const reportRef = useRef<HTMLDivElement>(null);
    const [error, setError] = useState<string | null>(null);

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
            if (window.confirm('크레딧이 부족합니다. 충전 페이지로 이동하시겠습니까?')) {
                onNavigate('creditPurchase' as any);
                onClose();
            }
            return;
        }

        try {
            // Safari ITP 대응: 최신 세션 정보 확보
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
                sajuData
            });

            if (onUseCredit) {
                await onUseCredit();
            }
        } catch (e: any) {
            setError(e.message);
        }
    }, [credits, onNavigate, onClose, session, submit, onUseCredit]);

    const handleDownloadPDF = async () => {
        if (!reportRef.current || !result) return;
        try {
            await generatePDF(reportRef.current, `MBTIJU_Trip_Report_${new Date().getTime()}`);
        } catch (err) {
            alert('PDF 생성 중 오류가 발생했습니다.');
        }
    };

    useEffect(() => {
        if (isOpen && !result && !isLoading) {
            fetchRecommendation();
        }
    }, [isOpen, result, isLoading, fetchRecommendation]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl overflow-y-auto h-full w-full flex justify-center items-center z-50 p-4 sm:p-6">
            <div className="relative p-0 border-none w-full max-w-2xl shadow-2xl rounded-[48px] bg-white max-h-[94vh] overflow-hidden flex flex-col">
                <ServiceNavigation currentService="trip" onNavigate={onNavigate} onClose={onClose} />

                <div className="bg-white px-8 sm:px-12 pt-10 pb-4 shrink-0">
                    <div className="flex justify-between items-end">
                        <div className="flex items-center gap-2 text-indigo-600 font-black tracking-widest text-[10px] uppercase mb-1.5">
                            <Plane className="w-4 h-4" /> Travel Destination
                        </div>
                        <h3 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tighter leading-none uppercase">맞춤 여행지 분석</h3>
                    </div>
                    <div className="h-[2px] w-full bg-slate-950 mt-8"></div>
                </div>

                <div className="px-8 sm:px-12 pb-12 pt-4 overflow-y-auto custom-scrollbar grow bg-white">
                    <div ref={reportRef} className="bg-white">
                    {isLoading && !result ? (
                        <div className="flex flex-col justify-center items-center h-80">
                            <Loader2 className="w-12 h-12 text-slate-200 animate-spin mb-6" />
                            <p className="text-slate-400 font-bold text-[10px] tracking-widest uppercase">분석 중...</p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-20 bg-red-50 rounded-[32px]">
                            <p className="text-red-500 font-black mb-4">오류가 발생했습니다.</p>
                            <button onClick={fetchRecommendation} className="px-8 py-3 bg-slate-950 text-white rounded-full">다시 시도</button>
                        </div>
                    ) : result ? (
                        <div className="space-y-12 animate-fade-up py-4">
                            <section className="report-section">
                                <h4 className="report-section-title"><MapPin className="w-5 h-5 text-indigo-600" /> 추천 여행지 BEST 3</h4>
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
                                <h4 className="report-section-title"><Calendar className="w-5 h-5 text-indigo-600" /> 추천 일정 가이드</h4>
                                <div className="space-y-4">
                                    {result?.itinerary?.map((day: any, i: number) => (
                                        <div key={i} className="report-card bg-slate-50">
                                            <h5 className="font-bold text-indigo-600 mb-3">{day.day}</h5>
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
                            </div>
                        </div>
                    ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TripModal;
