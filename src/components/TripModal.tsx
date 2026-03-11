import React, { useState, useEffect } from 'react';
import { Plane, Loader2, MapPin, Calendar, Sparkles, Download } from 'lucide-react';
import { supabase } from '../supabaseClient';
import ServiceNavigation, { ServiceType } from './ServiceNavigation';

interface TripModalProps {
    isOpen: boolean;
    onClose: () => void;
    onNavigate: (service: ServiceType) => void;
    onUseCredit?: () => Promise<boolean>;
}

const DOMESTIC_REGIONS = [
    '서울', '경기', '인천', '강원', '대전', '세종', '충남', '충북',
    '대구', '경북', '부산', '울산', '경남', '광주', '전남', '전북', '제주'
];

const OVERSEAS_REGIONS = [
    '아시아', '유럽', '북아메리카', '남아메리카', '오세아니아', '아프리카'
];

const TripModal: React.FC<TripModalProps> = ({ isOpen, onClose, onNavigate, onUseCredit }) => {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{
        places: { name: string, reason: string }[],
        itinerary?: { day: number, schedule: string }[],
        summary: string
    } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [regionType, setRegionType] = useState<'domestic' | 'overseas'>('domestic');
    const [selectedRegion, setSelectedRegion] = useState('서울');

    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');

    useEffect(() => {
        if (isOpen) {
            setResult(null);
            setError(null);
            setRegionType('domestic');
            setSelectedRegion('서울');

            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);
            const threeDays = new Date(today);
            threeDays.setDate(today.getDate() + 3);

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

    useEffect(() => {
        if (regionType === 'domestic') setSelectedRegion(DOMESTIC_REGIONS[0] || '');
        else setSelectedRegion(OVERSEAS_REGIONS[0] || '');
    }, [regionType]);

    const fetchRecommendation = async () => {
        if (!selectedRegion) return;
        setLoading(true);
        setError(null);

        if (onUseCredit) {
            const success = await onUseCredit();
            if (!success) {
                setLoading(false);
                setError('크레딧 차감에 실패했습니다. 크레딧이 부족하거나 네트워크 오류가 발생했습니다.');
                return;
            }
        }

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
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl overflow-y-auto h-full w-full flex justify-center items-center z-50 animate-fade-in p-4 sm:p-6">
            <div className="relative p-0 border-none w-full max-w-2xl shadow-[0_32px_128px_-12px_rgba(0,0,0,0.8)] rounded-[48px] bg-white max-h-[94vh] overflow-hidden flex flex-col border border-white/10">
                <ServiceNavigation currentService="trip" onNavigate={onNavigate} onClose={onClose} />

                {/* Professional Header */}
                <div className="bg-white px-8 sm:px-12 pt-10 pb-4 shrink-0">
                    <div className="flex justify-between items-end">
                        <div>
                            <div className="flex items-center gap-2 text-sky-600 font-black tracking-[0.2em] text-[10px] uppercase mb-1.5">
                                <Plane className="w-4 h-4" /> Destination Guidance
                            </div>
                            <h3 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tighter leading-none uppercase">
                                운명 여행 플랜
                            </h3>
                        </div>
                    </div>
                    <div className="h-[2px] w-full bg-slate-950 mt-8"></div>
                </div>

                <div className="px-8 sm:px-12 pb-12 pt-4 overflow-y-auto custom-scrollbar grow bg-white">
                    {!result ? (
                        <div className="space-y-10 animate-fade-up py-4">
                            <section className="report-section">
                                <h4 className="report-section-title">
                                    <MapPin className="w-5 h-5" /> 여행 타입 및 목적지
                                </h4>
                                <div className="space-y-4">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setRegionType('domestic')}
                                            className={`flex-1 py-4 rounded-2xl text-sm font-black transition-all border-2 ${regionType === 'domestic' ? 'bg-slate-950 text-white border-slate-950 shadow-xl' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'}`}
                                        >
                                            국내 여행
                                        </button>
                                        <button
                                            onClick={() => setRegionType('overseas')}
                                            className={`flex-1 py-4 rounded-2xl text-sm font-black transition-all border-2 ${regionType === 'overseas' ? 'bg-slate-950 text-white border-slate-950 shadow-xl' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'}`}
                                        >
                                            해외 여행
                                        </button>
                                    </div>
                                    <select
                                        className="w-full p-4 rounded-2xl bg-slate-50 border-none text-slate-950 font-bold text-lg focus:ring-2 focus:ring-slate-200 transition-all appearance-none"
                                        value={selectedRegion}
                                        onChange={(e) => setSelectedRegion(e.target.value)}
                                    >
                                        {regionType === 'domestic'
                                            ? DOMESTIC_REGIONS.map(r => <option key={r} value={r}>{r}</option>)
                                            : OVERSEAS_REGIONS.map(r => <option key={r} value={r}>{r}</option>)
                                        }
                                    </select>
                                </div>
                            </section>

                            <section className="report-section">
                                <h4 className="report-section-title">
                                    <Calendar className="w-5 h-5" /> 여행 일정 계획
                                </h4>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <div className="flex-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Departure</p>
                                        <input
                                            type="date"
                                            className="w-full p-4 rounded-2xl bg-slate-50 border-none text-slate-950 font-bold focus:ring-2 focus:ring-slate-200 transition-all"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Arrival</p>
                                        <input
                                            type="date"
                                            className="w-full p-4 rounded-2xl bg-slate-50 border-none text-slate-950 font-bold focus:ring-2 focus:ring-slate-200 transition-all"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </section>

                            <button
                                onClick={fetchRecommendation}
                                disabled={loading}
                                className="group relative w-full py-5 bg-slate-950 text-white rounded-full text-lg font-black shadow-2xl transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 mt-4 overflow-hidden"
                            >
                                <div className="relative z-10 flex items-center justify-center gap-3">
                                    {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Plane className="w-6 h-6 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
                                    {loading ? '심층 분석 중...' : '맞춤 여행 플랜 확인하기'}
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-12 animate-fade-up">
                            {/* Summary Card */}
                            <div className="report-card bg-slate-900 text-white border-none p-10 relative overflow-hidden">
                                <Sparkles className="absolute top-6 right-6 w-10 h-10 text-white/10" />
                                <p className="text-sky-400 font-black mb-2 uppercase tracking-[0.3em] text-[10px]">Planner's Summary</p>
                                <p className="text-xl font-bold leading-relaxed italic text-slate-100">
                                    "{result.summary}"
                                </p>
                            </div>

                            {/* Recommended Places */}
                            <section className="report-section">
                                <h4 className="report-section-title">
                                    <MapPin className="w-5 h-5" /> 추천 여행지: {selectedRegion}
                                </h4>
                                <div className="grid gap-6">
                                    {result.places.map((place, i) => (
                                        <div key={i} className="report-card group hover:border-slate-300 transition-colors">
                                            <div className="flex justify-between items-start mb-4">
                                                <h5 className="text-xl font-black text-slate-950">{place.name}</h5>
                                                <span className="px-3 py-1 bg-sky-50 text-sky-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-sky-100">Must Visit</span>
                                            </div>
                                            <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">{place.reason}</p>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* Itinerary */}
                            {result.itinerary && result.itinerary.length > 0 && (
                                <section className="report-section">
                                    <h4 className="report-section-title">
                                        <Calendar className="w-5 h-5" /> 심층 일정 가이드
                                    </h4>
                                    <div className="space-y-4">
                                        {result.itinerary.map((day, i) => (
                                            <div key={i} className="flex gap-6 items-stretch">
                                                <div className="flex flex-col items-center shrink-0">
                                                    <div className="w-12 h-12 rounded-full border-2 border-slate-950 flex items-center justify-center text-xs font-black text-slate-950 bg-white">
                                                        D-{day.day}
                                                    </div>
                                                    {i !== result.itinerary!.length - 1 && <div className="w-[2px] grow bg-slate-100 mt-2"></div>}
                                                </div>
                                                <div className="report-card flex-1">
                                                    <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{day.schedule}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Action Buttons */}
                            <div className="mt-16 pt-10 border-t border-slate-100 flex flex-col items-center">
                                <button
                                    onClick={() => alert("PDF 다운로드 기능이 준비 중입니다.")}
                                    className="group relative flex items-center justify-center gap-3 px-10 py-4 bg-slate-950 text-white rounded-full text-md font-black shadow-2xl transition-all hover:scale-[1.02] active:scale-95"
                                >
                                    <Download className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
                                    여행 계획표 다운로드
                                </button>

                                <button
                                    onClick={() => setResult(null)}
                                    className="mt-6 text-slate-400 text-xs font-bold hover:text-slate-950 transition-colors underline underline-offset-4"
                                >
                                    다른 목적지로 다시 검색하기
                                </button>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="mt-8 p-6 bg-red-50 text-red-600 rounded-[24px] text-center text-sm font-bold border border-red-100 animate-shake">
                            {error}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TripModal;
