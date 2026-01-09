import React, { useState, useEffect } from 'react';
import { Plane, X, Loader2, MapPin, Globe } from 'lucide-react';
import { supabase } from '../supabaseClient';

interface TripModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const DOMESTIC_REGIONS = [
    '서울', '경기', '인천', '강원', '대전', '세종', '충남', '충북',
    '대구', '경북', '부산', '울산', '경남', '광주', '전남', '전북', '제주'
];

const OVERSEAS_REGIONS = [
    '아시아', '유럽', '북아메리카', '남아메리카', '오세아니아', '아프리카'
];

const TripModal: React.FC<TripModalProps> = ({ isOpen, onClose }) => {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ places: { name: string, reason: string }[], summary: string } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [regionType, setRegionType] = useState<'domestic' | 'overseas'>('domestic');
    const [selectedRegion, setSelectedRegion] = useState('서울');

    useEffect(() => {
        if (isOpen) {
            setResult(null);
            setError(null);
            // Default selection
            setRegionType('domestic');
            setSelectedRegion('서울');
        }
    }, [isOpen]);

    // Update default selected region when switching types
    useEffect(() => {
        if (regionType === 'domestic') setSelectedRegion(DOMESTIC_REGIONS[0] || '');
        else setSelectedRegion(OVERSEAS_REGIONS[0] || '');
    }, [regionType]);

    const fetchRecommendation = async () => {
        if (!selectedRegion) return;
        setLoading(true);
        setError(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('로그인이 필요합니다.');

            const user = session.user.user_metadata;
            // Send request with region
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
                    name: user.full_name,
                    region: selectedRegion // Send the selected region
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
                        <h2 className="text-xl font-bold text-slate-800">맞춤 여행</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/50 rounded-full transition-colors">
                        <X className="w-6 h-6 text-slate-500" />
                    </button>
                </div>

                <div className="p-8">
                    {!result ? (
                        <div className="space-y-6">
                            <div>
                                <label className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-sky-600" /> 여행 종류 선택
                                </label>
                                <div className="flex gap-2 mb-4">
                                    <button
                                        onClick={() => setRegionType('domestic')}
                                        className={`flex-1 py-3 rounded-xl font-bold transition-all ${regionType === 'domestic' ? 'bg-sky-500 text-white shadow-lg shadow-sky-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                    >
                                        국내 여행
                                    </button>
                                    <button
                                        onClick={() => setRegionType('overseas')}
                                        className={`flex-1 py-3 rounded-xl font-bold transition-all ${regionType === 'overseas' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                    >
                                        해외 여행
                                    </button>
                                </div>

                                <label className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                    <Globe className="w-4 h-4 text-sky-600" /> 지역 선택
                                </label>
                                <select
                                    className="input-field appearance-none w-full"
                                    value={selectedRegion}
                                    onChange={(e) => setSelectedRegion(e.target.value)}
                                >
                                    {regionType === 'domestic'
                                        ? DOMESTIC_REGIONS.map(r => <option key={r} value={r}>{r}</option>)
                                        : OVERSEAS_REGIONS.map(r => <option key={r} value={r}>{r}</option>)
                                    }
                                </select>
                            </div>

                            <button
                                onClick={fetchRecommendation}
                                disabled={loading}
                                className="w-full btn-primary py-4 text-lg font-bold bg-gradient-to-r from-sky-400 to-blue-500 border-none hover:from-sky-500 hover:to-blue-600 shadow-xl shadow-sky-100"
                            >
                                {loading ? <Loader2 className="animate-spin mx-auto" /> : '✈️ 여행지 추천받기'}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-8 animate-fade-up">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <MapPin className="w-5 h-5 text-sky-500" /> 추천 여행지 ({selectedRegion})
                                </h3>
                                <div className="space-y-4">
                                    {result.places && result.places.map((place, i) => (
                                        <div key={i} className="bg-sky-50 p-5 rounded-2xl border border-sky-100">
                                            <h4 className="font-bold text-sky-700 text-lg mb-2">{place.name}</h4>
                                            <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">{place.reason}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <p className="text-sm text-slate-500 text-center italic leading-relaxed bg-slate-50 p-4 rounded-xl">
                                {result.summary}
                            </p>

                            <button onClick={() => setResult(null)} className="btn-secondary w-full py-3">
                                다른 지역으로 다시 찾기
                            </button>
                        </div>
                    )}

                    {error && (
                        <div className="mt-4 p-4 bg-red-50 text-red-500 rounded-xl text-center text-sm border border-red-100">
                            {error}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TripModal;
