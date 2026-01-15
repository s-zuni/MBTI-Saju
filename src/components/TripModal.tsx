import React, { useState, useEffect } from 'react';
import { Plane, Loader2, MapPin, Globe, Calendar } from 'lucide-react';
import { supabase } from '../supabaseClient';

import ServiceNavigation, { ServiceType } from './ServiceNavigation';

interface TripModalProps {
    isOpen: boolean;
    onClose: () => void;
    onNavigate: (service: ServiceType) => void;
}

const DOMESTIC_REGIONS = [
    '서울', '경기', '인천', '강원', '대전', '세종', '충남', '충북',
    '대구', '경북', '부산', '울산', '경남', '광주', '전남', '전북', '제주'
];

const OVERSEAS_REGIONS = [
    '아시아', '유럽', '북아메리카', '남아메리카', '오세아니아', '아프리카'
];

const TripModal: React.FC<TripModalProps> = ({ isOpen, onClose, onNavigate }) => {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{
        places: { name: string, reason: string }[],
        itinerary?: { day: number, schedule: string }[],
        summary: string
    } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [regionType, setRegionType] = useState<'domestic' | 'overseas'>('domestic');
    const [selectedRegion, setSelectedRegion] = useState('서울');

    // Itinerary input
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');

    useEffect(() => {
        if (isOpen) {
            setResult(null);
            setError(null);
            // Default selection
            setRegionType('domestic');
            setSelectedRegion('서울');

            // Default dates: Tomorrow ~ +3 days
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);

            const threeDays = new Date(today);
            threeDays.setDate(today.getDate() + 3);

            // Format YYYY-MM-DD safely
            const formatDate = (date: Date) => {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };

            setStartDate(formatDate(tomorrow));
            setEndDate(formatDate(threeDays));
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
                    region: selectedRegion,
                    startDate,
                    endDate
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
                <ServiceNavigation currentService="trip" onNavigate={onNavigate} onClose={onClose} />

                <div className="p-6 pb-0">
                    <div className="flex items-center gap-2 mb-2">
                        <Plane className="w-6 h-6 text-sky-500 fill-sky-500" />
                        <h2 className="text-xl font-bold text-slate-800">맞춤 여행</h2>
                    </div>
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

                            <div>
                                <label className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-sky-600" /> 여행 일정 선택
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="date"
                                        className="input-field w-full"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                    />
                                    <input
                                        type="date"
                                        className="input-field w-full"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                    />
                                </div>
                            </div>

                            <button
                                onClick={fetchRecommendation}
                                disabled={loading}
                                className="w-full btn-primary py-4 text-lg font-bold bg-gradient-to-r from-sky-400 to-blue-500 border-none hover:from-sky-500 hover:to-blue-600 shadow-xl shadow-sky-100"
                            >
                                {loading ? <Loader2 className="animate-spin mx-auto" /> : '✈️ 맞춤 여행 계획 세우기'}
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

                            {result.itinerary && result.itinerary.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                        <Calendar className="w-5 h-5 text-sky-500" /> 추천 여행 일정
                                    </h3>
                                    <div className="space-y-3">
                                        {result.itinerary.map((day, i) => (
                                            <div key={i} className="flex gap-4">
                                                <div className="flex-shrink-0 w-16 pt-1">
                                                    <span className="bg-sky-100 text-sky-600 px-2 py-1 rounded-md text-sm font-bold block text-center">
                                                        Day {day.day}
                                                    </span>
                                                </div>
                                                <div className="bg-white p-4 rounded-xl border border-slate-100 flex-1 shadow-sm">
                                                    <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{day.schedule}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

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
