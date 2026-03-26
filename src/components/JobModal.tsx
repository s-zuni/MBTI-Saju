import React, { useState, useEffect, useRef } from 'react';
import { Briefcase, Loader2, Award, TrendingUp } from 'lucide-react';
import { stripMarkdown } from '../utils/textUtils';
import ServiceNavigation, { ServiceType } from './ServiceNavigation';
import { generatePDF } from '../utils/pdfGenerator';
import { experimental_useObject as useObject } from '@ai-sdk/react';
import { jobSchema } from '../config/schemas';
import { SERVICE_COSTS } from '../config/creditConfig';

interface JobModalProps {
    isOpen: boolean;
    onClose: () => void;
    onNavigate: (service: ServiceType) => void;
    onUseCredit?: () => Promise<boolean>;
    credits?: number;
    session: any;
}

const JobModal: React.FC<JobModalProps> = ({ isOpen, onClose, onNavigate, onUseCredit, credits, session }) => {
    const reportRef = useRef<HTMLDivElement>(null);
    const [error, setError] = useState<string | null>(null);

    // Streaming Hook
    const { object: result, submit, isLoading } = useObject({
        api: '/api/analysis-special',
        schema: jobSchema,
        headers: {
            'Authorization': `Bearer ${session?.access_token || ''}`
        }
    });

    const fetchRecommendation = async () => {
        const cost = SERVICE_COSTS.JOB;
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
            
            submit({
                type: 'job',
                name: metadata.full_name || '사용자',
                mbti: metadata.mbti,
                birthDate: metadata.birth_date,
                birthTime: metadata.birth_time
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
            const fileName = `MBTIJU_Job_Report_${new Date().getTime()}`;
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
                <ServiceNavigation currentService="job" onNavigate={onNavigate} onClose={onClose} />

                {/* Professional Header */}
                <div className="bg-white px-8 sm:px-12 pt-10 pb-4 shrink-0">
                    <div className="flex justify-between items-end">
                        <div>
                            <div className="flex items-center gap-2 text-orange-600 font-black tracking-[0.2em] text-[10px] uppercase mb-1.5">
                                <Briefcase className="w-4 h-4" />
                            </div>
                            <h3 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tighter leading-none uppercase">
                                천직 분석 리포트
                            </h3>
                        </div>
                    </div>
                    <div className="h-[2px] w-full bg-slate-950 mt-8"></div>
                </div>

                <div className="px-8 sm:px-12 pb-12 pt-4 overflow-y-auto custom-scrollbar grow bg-white">
                    <div ref={reportRef} className="bg-white">
                    {isLoading && !result ? (
                        <div className="flex flex-col justify-center items-center h-80">
                            <Loader2 className="w-12 h-12 text-slate-200 animate-spin mb-6 stroke-[1px]" />
                             <p className="text-slate-400 font-bold text-[10px] tracking-[0.3em] uppercase">분석 중...</p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-20 bg-red-50 rounded-[32px] border border-red-100">
                            <p className="text-red-500 font-black mb-4">분석 중 오류가 발생했습니다.</p>
                            <button onClick={fetchRecommendation} className="px-8 py-3 bg-slate-950 text-white rounded-full text-xs font-black">다시 시도</button>
                        </div>
                    ) : result ? (
                        <div className="space-y-12 animate-fade-up py-4">
                            {/* Best Matches */}
                            <section className="report-section">
                                <h4 className="report-section-title">
                                    <Award className="w-5 h-5 text-orange-500" /> 명리학적 천직 분석
                                </h4>
                                <div className="grid gap-4">
                                    {result?.job_analysis?.map((item: any, i: number) => (
                                        <div key={i} className="report-card mb-4">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-10 h-10 rounded-full bg-slate-950 text-white flex items-center justify-center font-black text-sm shrink-0">
                                                    0{i + 1}
                                                </div>
                                                <h5 className="text-xl font-black text-slate-900 tracking-tight">
                                                    {item.job} <span className="text-sm font-bold text-indigo-600 ml-2">적합도: {item.compatibility}</span>
                                                </h5>
                                            </div>
                                            <div className="space-y-3 text-slate-600 text-sm leading-relaxed">
                                                <p><strong className="text-slate-900">• 선정 이유:</strong> {stripMarkdown(item.reason)}</p>
                                                <p><strong className="text-slate-900">• 성공 전략:</strong> {stripMarkdown(item.strategy)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            <div className="flex flex-col items-center pt-10 border-t border-slate-100 gap-4">
                                <button
                                    onClick={handleDownloadPDF}
                                    className="px-10 py-5 bg-slate-950 text-white rounded-full text-md font-black shadow-2xl transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-3"
                                >
                                    <TrendingUp className="w-5 h-5" /> PDF 결과서 다운로드
                                </button>
                                <button
                                    onClick={() => fetchRecommendation()}
                                    className="text-slate-400 text-xs font-bold hover:text-slate-950 transition-colors underline underline-offset-4"
                                >
                                    다시 분석하기
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

export default JobModal;
