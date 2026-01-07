import React, { useState, useEffect } from 'react';
import { Plane, X, Loader2, MapPin } from 'lucide-react';
import { supabase } from '../supabaseClient';

interface TripModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const TripModal: React.FC<TripModalProps> = ({ isOpen, onClose }) => {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ domestic: { name: string, reason: string }[], overseas: { name: string, reason: string }, summary: string } | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && !result) {
            fetchRecommendation();
        }
    }, [isOpen]);

    const fetchRecommendation = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('로그인이 필요합니다.');

            const user = session.user.user_metadata;
            const response = await fetch('/api/trip', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    birthDate: user.birth_date,
                    birthTime: user.birth_time,
                    mbti: user.mbti,
                    gender: user.gender,
                    name: user.full_name
                })
            });

            if (!response.ok) throw new Error('추천을 받아오지 못했습니다.');
            const data = await response.json();
            setResult(data);

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
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-sky-50 sticky top-0 z-10">
                    <div className="flex items-center gap-2">
                        <Plane className="w-6 h-6 text-sky-500 fill-sky-500" />
                        <h2 className="text-xl font-bold text-slate-800">함께 떠나는 궁합여행</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/50 rounded-full transition-colors">
                        <X className="w-6 h-6 text-slate-500" />
                    </button>
                </div>

                <div className="p-8">
                    {loading ? (
                        <div className="text-center py-12">
                            <Loader2 className="w-10 h-10 text-sky-500 animate-spin mx-auto mb-4" />
                            <p className="text-slate-600 font-medium">당신에게 딱 맞는 여행지를 찾고 있어요...</p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-8 text-red-500 font-medium">
                            <p>{error}</p>
                            <button onClick={fetchRecommendation} className="mt-4 btn-secondary">다시 시도</button>
                        </div>
                    ) : result ? (
                        <div className="space-y-8 animate-fade-up">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <MapPin className="w-5 h-5 text-sky-500" /> 국내 여행지
                                </h3>
                                <div className="space-y-4">
                                    {result.domestic.map((place, i) => (
                                        <div key={i} className="bg-sky-50 p-5 rounded-2xl border border-sky-100">
                                            <h4 className="font-bold text-sky-700 text-lg mb-2">{place.name}</h4>
                                            <p className="text-slate-600 text-sm leading-relaxed">{place.reason}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <Plane className="w-5 h-5 text-indigo-500" /> 해외 여행지
                                </h3>
                                <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100">
                                    <h4 className="font-bold text-indigo-700 text-lg mb-2">{result.overseas.name}</h4>
                                    <p className="text-slate-600 text-sm leading-relaxed">{result.overseas.reason}</p>
                                </div>
                            </div>

                            <p className="text-sm text-slate-500 text-center italic leading-relaxed">
                                {result.summary}
                            </p>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
};

export default TripModal;
