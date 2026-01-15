import React, { useState, useEffect } from 'react';
import { Ticket, X, Loader2, Briefcase } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { getDetailedAnalysis } from '../utils/chatService';
import ServiceNavigation, { ServiceType } from './ServiceNavigation';

interface JobModalProps {
    isOpen: boolean;
    onClose: () => void;
    onNavigate: (service: ServiceType) => void;
}

const JobModal: React.FC<JobModalProps> = ({ isOpen, onClose, onNavigate }) => {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ jobs: string[], reason: string } | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && !result) {
            fetchRecommendation();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    const fetchRecommendation = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('로그인이 필요합니다.');

            const user = session.user.user_metadata;

            // Use AI Service instead of API
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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-fade-up max-h-[90vh] overflow-y-auto custom-scrollbar">
                <ServiceNavigation currentService="job" onNavigate={onNavigate} onClose={onClose} />

                <div className="p-6 pb-0">
                    <div className="flex items-center gap-2 mb-2">
                        <Ticket className="w-6 h-6 text-orange-600 fill-orange-600" />
                        <h2 className="text-xl font-bold text-slate-800">나의 천직 추천직업</h2>
                    </div>
                </div>

                <div className="p-8">
                    {loading ? (
                        <div className="text-center py-12">
                            <Loader2 className="w-10 h-10 text-orange-500 animate-spin mx-auto mb-4" />
                            <p className="text-slate-600 font-medium">당신의 천직을 분석하고 있어요...</p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-8 text-red-500 font-medium">
                            <p>{error}</p>
                            <button onClick={fetchRecommendation} className="mt-4 btn-secondary">다시 시도</button>
                        </div>
                    ) : result ? (
                        <div className="space-y-8 animate-fade-up">
                            <div className="bg-orange-50 p-6 rounded-2xl border border-orange-100">
                                <h3 className="text-lg font-bold text-orange-800 mb-4 flex items-center gap-2">
                                    <Briefcase className="w-5 h-5" /> 추천 직업 BEST 3
                                </h3>
                                <ul className="space-y-2">
                                    {result.jobs.map((job, i) => (
                                        <li key={i} className="flex items-center gap-3 bg-white p-3 rounded-xl shadow-sm">
                                            <span className="w-6 h-6 flex items-center justify-center bg-orange-100 text-orange-600 font-bold rounded-full text-sm">{i + 1}</span>
                                            <span className="font-bold text-slate-800">{job}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div>
                                <h3 className="text-lg font-bold text-slate-800 mb-2">분석 결과</h3>
                                <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{result.reason}</p>
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
};

export default JobModal;
