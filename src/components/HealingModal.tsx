import React, { useState, useEffect } from 'react';
import { Hotel, X, Loader2, MapPin } from 'lucide-react';
import { supabase } from '../supabaseClient';

interface HealingModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const HealingModal: React.FC<HealingModalProps> = ({ isOpen, onClose }) => {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ place: string, activity: string, reason: string } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [region, setRegion] = useState('서울');

    const regions = ['서울', '경기', '인천', '강원', '대전', '세종', '충남', '충북', '대구', '경북', '부산', '울산', '경남', '광주', '전남', '전북', '제주'];

    const reset = () => {
        setResult(null);
        setError(null);
        setRegion('서울');
    };

    useEffect(() => {
        if (isOpen) reset();
    }, [isOpen]);

    const handleAnalyze = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('로그인이 필요합니다.');

            const user = session.user.user_metadata;
            const response = await fetch('/api/healing', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    birthDate: user.birth_date,
                    birthTime: user.birth_time,
                    mbti: user.mbti,
                    region
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
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-teal-50 sticky top-0 z-10">
                    <div className="flex items-center gap-2">
                        <Hotel className="w-6 h-6 text-teal-600 fill-teal-600" />
                        <h2 className="text-xl font-bold text-slate-800">마음의 안식 힐링장소</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/50 rounded-full transition-colors">
                        <X className="w-6 h-6 text-slate-500" />
                    </button>
                </div>

                <div className="p-8">
                    {!result ? (
                        <div className="space-y-6">
                            <div>
                                <label className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-teal-600" /> 희망 지역 선택
                                </label>
                                <select
                                    className="input-field appearance-none"
                                    value={region}
                                    onChange={(e) => setRegion(e.target.value)}
                                >
                                    {regions.map(r => (
                                        <option key={r} value={r}>{r}</option>
                                    ))}
                                </select>
                            </div>
                            <button
                                onClick={handleAnalyze}
                                disabled={loading}
                                className="w-full btn-primary py-4 text-lg font-bold bg-gradient-to-r from-teal-500 to-emerald-500 border-none hover:from-teal-600 hover:to-emerald-600"
                            >
                                {loading ? <Loader2 className="animate-spin mx-auto" /> : '힐링 장소 추천받기'}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-fade-up">
                            <div className="bg-teal-50 p-6 rounded-2xl border border-teal-100 text-center">
                                <h3 className="text-2xl font-black text-teal-800 mb-2">{result.place}</h3>
                                <div className="text-sm font-bold text-teal-600 bg-white/60 inline-block px-3 py-1 rounded-full mb-4">
                                    추천 활동: {result.activity}
                                </div>
                                <p className="text-slate-600 leading-relaxed text-left whitespace-pre-wrap">{result.reason}</p>
                            </div>

                            <button onClick={() => setResult(null)} className="btn-secondary w-full py-3">
                                다른 지역으로 다시 찾기
                            </button>
                        </div>
                    )}
                    {error && (
                        <div className="mt-4 p-4 bg-red-50 text-red-500 rounded-xl text-center text-sm">
                            {error}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default HealingModal;
