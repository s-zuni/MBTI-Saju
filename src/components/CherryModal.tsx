import React, { useState, useEffect, useRef } from 'react';
import { Flower2, Loader2, MapPin, Sparkles, TrendingUp } from 'lucide-react';
import { stripMarkdown } from '../utils/textUtils';
import ServiceNavigation, { ServiceType } from './ServiceNavigation';
import { generatePDF } from '../utils/pdfGenerator';
import { experimental_useObject as useObject } from '@ai-sdk/react';
import { cherrySchema } from '../config/schemas';
import { SERVICE_COSTS } from '../config/creditConfig';
import { calculateSaju } from '../utils/sajuUtils';

interface CherryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onNavigate: (service: ServiceType) => void;
    onUseCredit?: () => Promise<boolean>;
    credits?: number;
    session: any;
}

const CherryModal: React.FC<CherryModalProps> = ({ isOpen, onClose, onNavigate, onUseCredit, credits, session }) => {
    const reportRef = useRef<HTMLDivElement>(null);
    const [error, setError] = useState<string | null>(null);

    // Streaming Hook
    const { object: result, submit, isLoading } = useObject({
        api: '/api/analysis-special',
        schema: cherrySchema,
        headers: {
            'Authorization': `Bearer ${session?.access_token || ''}`
        }
    });

    const fetchRecommendation = async () => {
        const cost = SERVICE_COSTS.CHERRY;
        if (credits !== undefined && credits < cost) {
            if (window.confirm('크레딧이 부족합니다. 충전 페이지로 이동하시겠습니까?')) {
                onNavigate('creditPurchase' as any);
                onClose();
            }
            return;
        }

        try {
            const metadata = session?.user?.user_metadata;
            if (!metadata) throw new Error('로그인이 필요합니다.');
            if (!metadata.birth_date || !metadata.mbti) {
                throw new Error('프로필 정보(생년월일, MBTI)가 설정되지 않았습니다.');
            }

            setError(null);
            
            const sajuData = calculateSaju(metadata.birth_date, metadata.birth_time);
            submit({
                type: 'cherry',
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
    };

    const handleDownloadPDF = async () => {
        if (!reportRef.current || !result) return;
        try {
            const fileName = `MBTIJU_CherryReport_${new Date().getTime()}`;
            await generatePDF(reportRef.current, fileName);
        } catch (err) {
            alert('PDF 생성 중 오류가 발생했습니다.');
        }
    };

    useEffect(() => {
        if (isOpen && !result && !isLoading) {
            fetchRecommendation();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl overflow-y-auto h-full w-full flex justify-center items-center z-50 animate-fade-in p-4 sm:p-6">
            <div className="relative p-0 border-none w-full max-w-2xl shadow-[0_32px_128px_-12px_rgba(0,0,0,0.8)] rounded-[48px] bg-white max-h-[94vh] overflow-hidden flex flex-col border border-white/10">
                <ServiceNavigation currentService="cherry" onNavigate={onNavigate} onClose={onClose} />

                {/* Aesthetic Header */}
                <div className="bg-pink-50/50 px-8 sm:px-12 pt-10 pb-4 shrink-0">
                    <div className="flex justify-between items-end">
                        <div>
                            <div className="flex items-center gap-2 text-pink-600 font-black tracking-[0.2em] text-[10px] uppercase mb-1.5">
                                <Flower2 className="w-4 h-4" /> 2026 Season special
                            </div>
                            <h3 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tighter leading-none uppercase">
                                행운의 벚꽃 명소
                            </h3>
                        </div>
                    </div>
                    <div className="h-[2px] w-full bg-slate-950 mt-8"></div>
                </div>

                <div className="px-8 sm:px-12 pb-12 pt-4 overflow-y-auto custom-scrollbar grow bg-white">
                    <div ref={reportRef} className="bg-white">
                    {isLoading && !result ? (
                        <div className="flex flex-col justify-center items-center h-80">
                            <Loader2 className="w-12 h-12 text-pink-200 animate-spin mb-6 stroke-[1px]" />
                             <p className="text-pink-400 font-bold text-[10px] tracking-[0.3em] uppercase">당신의 벚꽃 운명을 찾는 중...</p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-20 bg-red-50 rounded-[32px] border border-red-100">
                            <p className="text-red-500 font-black mb-4">분석 중 오류가 발생했습니다.</p>
                            <button onClick={fetchRecommendation} className="px-8 py-3 bg-slate-950 text-white rounded-full text-xs font-black">다시 시도</button>
                        </div>
                    ) : result ? (
                        <div className="space-y-12 animate-fade-up py-4">
                            {/* Places */}
                            <section className="report-section">
                                <h4 className="report-section-title text-pink-600">
                                    <Sparkles className="w-5 h-5" /> 추천 명소 베스트 3
                                </h4>
                                <div className="grid gap-6">
                                    {result?.places?.map((item: any, i: number) => (
                                        <div key={i} className={`report-card relative overflow-hidden ${item.isHiddenGem ? 'border-indigo-100 bg-indigo-50/30' : 'border-slate-100'}`}>
                                            {item.isHiddenGem && (
                                                <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[8px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-tighter">
                                                    Hidden Gem
                                                </div>
                                            )}
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm shrink-0 ${item.isHiddenGem ? 'bg-indigo-600 text-white' : 'bg-slate-950 text-white'}`}>
                                                    0{i + 1}
                                                </div>
                                                <h5 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                                                    {item.name}
                                                </h5>
                                            </div>
                                            <div className="space-y-3 text-slate-600 text-sm leading-relaxed">
                                                <p className="flex items-start gap-2">
                                                    <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                                                    <span><strong className="text-slate-900">위치:</strong> {item.address}</span>
                                                </p>
                                                <p><strong className="text-slate-900">• 선정 이유:</strong> {stripMarkdown(item.reason)}</p>
                                                <p><strong className="text-slate-900">• 추천 활동:</strong> {stripMarkdown(item.activity)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* Summary */}
                            <section className="p-8 bg-slate-50 rounded-[32px] border border-slate-100">
                                <h5 className="font-black text-slate-900 mb-4 flex items-center gap-2 uppercase tracking-tight">
                                    Overall Analysis
                                </h5>
                                <p className="text-slate-600 text-sm leading-relaxed font-medium">
                                    {stripMarkdown(result.summary)}
                                </p>
                            </section>

                            {/* Tip */}
                            <div className="p-6 bg-pink-50 rounded-2xl border border-pink-100">
                                <h5 className="text-pink-600 font-black text-xs mb-2 flex items-center gap-2">
                                    <Sparkles className="w-4 h-4" /> 벚꽃 나들이 Tip
                                </h5>
                                <p className="text-slate-700 text-sm font-medium">
                                    {stripMarkdown(result.tip)}
                                </p>
                            </div>

                            <div className="flex flex-col items-center pt-10 border-t border-slate-100 gap-4">
                                <button
                                    onClick={handleDownloadPDF}
                                    className="px-10 py-5 bg-slate-950 text-white rounded-full text-md font-black shadow-2xl transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-3"
                                >
                                    <TrendingUp className="w-5 h-5" /> 결과 리포트 다운로드
                                </button>
                                <button
                                    onClick={() => fetchRecommendation()}
                                    className="text-slate-400 text-xs font-bold hover:text-slate-950 transition-colors underline underline-offset-4"
                                >
                                    다른 명소 더 보기
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

export default CherryModal;
