import React, { useState, useEffect } from 'react';
import { Briefcase, Loader2, Sparkles, Award, TrendingUp } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { getDetailedAnalysis } from '../utils/chatService';
import ServiceNavigation, { ServiceType } from './ServiceNavigation';

interface JobModalProps {
    isOpen: boolean;
    onClose: () => void;
    onNavigate: (service: ServiceType) => void;
    onUseCoin?: () => Promise<boolean>;
}

const JobModal: React.FC<JobModalProps> = ({ isOpen, onClose, onNavigate, onUseCoin }) => {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ jobs: string[], reason: string } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const fetchRecommendation = async () => {
        setLoading(true);
        setError(null);

        if (onUseCoin) {
            const success = await onUseCoin();
            if (!success) {
                setLoading(false);
                setError('코인 차감에 실패했습니다. 코인이 부족하거나 네트워크 오류가 발생했습니다.');
                return;
            }
        }

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('로그인이 필요합니다.');

            const user = session.user.user_metadata;

            const resultData = await getDetailedAnalysis('job', {
                name: user.full_name,
                mbti: user.mbti,
                birthDate: user.birth_date,
                birthTime: user.birth_time
            });

            setResult(resultData);

        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && !result) {
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
                                <Briefcase className="w-4 h-4" /> Career Destiny
                            </div>
                            <h3 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tighter leading-none uppercase">
                                Vocational Report
                            </h3>
                        </div>
                    </div>
                    <div className="h-[2px] w-full bg-slate-950 mt-8"></div>
                </div>

                <div className="px-8 sm:px-12 pb-12 pt-4 overflow-y-auto custom-scrollbar grow bg-white">
                    {loading ? (
                        <div className="flex flex-col justify-center items-center h-80">
                            <Loader2 className="w-12 h-12 text-slate-200 animate-spin mb-6 stroke-[1px]" />
                            <p className="text-slate-400 font-bold text-[10px] tracking-[0.3em] uppercase">Decoding Professional Path...</p>
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
                                    <Award className="w-5 h-5 text-orange-500" /> 명리학적 천직 BEST 3
                                </h4>
                                <div className="grid gap-3">
                                    {result.jobs.map((job, i) => (
                                        <div key={i} className="report-card flex items-center gap-6 group hover:border-orange-200 transition-all py-6">
                                            <div className="w-10 h-10 rounded-full bg-slate-950 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-lg">
                                                0{i + 1}
                                            </div>
                                            <div className="text-xl font-black text-slate-950 tracking-tight group-hover:translate-x-1 transition-transform">
                                                {job}
                                            </div>
                                            <TrendingUp className="ml-auto w-5 h-5 text-slate-200 group-hover:text-orange-400 transition-colors" />
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* Deep Insight */}
                            <section className="report-section">
                                <h4 className="report-section-title">
                                    <Sparkles className="w-5 h-5 text-orange-500" /> 종합 커리어 분석
                                </h4>
                                <div className="report-card p-10 bg-slate-50 border-slate-100">
                                    <p className="text-slate-700 leading-relaxed text-md whitespace-pre-wrap">
                                        {result.reason}
                                    </p>
                                </div>
                            </section>

                            <div className="flex flex-col items-center pt-10 border-t border-slate-100">
                                <button
                                    onClick={() => fetchRecommendation()}
                                    className="px-10 py-5 bg-slate-950 text-white rounded-full text-md font-black shadow-2xl transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-3"
                                >
                                    <TrendingUp className="w-5 h-5" /> 다시 분석하기
                                </button>
                                <p className="mt-4 text-[10px] text-slate-400 font-bold uppercase tracking-widest">Global Talent Strategy</p>
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
};

export default JobModal;
