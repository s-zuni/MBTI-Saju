import React, { useState, useEffect } from 'react';
import { Loader2, MapPin, Sparkles, Wind } from 'lucide-react';
import { supabase } from '../supabaseClient';
import ServiceNavigation, { ServiceType } from './ServiceNavigation';

interface HealingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onNavigate: (service: ServiceType) => void;
    onUseCredit?: () => Promise<boolean>;
    credits?: number;
}

const REGION_MAP: { [key: string]: string[] } = {
    '서울': ['강남구', '강동구', '강북구', '강서구', '관악구', '광진구', '구로구', '금천구', '노원구', '도봉구', '동대문구', '동작구', '마포구', '서대문구', '서초구', '성동구', '성북구', '송파구', '양천구', '영등포구', '용산구', '은평구', '종로구', '중구', '중랑구'],
    '경기': ['수원시', '고양시', '용인시', '성남시', '부천시', '화성시', '안산시', '남양주시', '안양시', '평택시', '시흥시', '파주시', '의정부시', '김포시', '광주시', '광명시', '군포시', '하남시', '오산시', '양주시', '이천시', '구리시', '안성시', '포천시', '의왕시', '양평군', '여주시', '동두천시', '가평군', '과천시', '연천군'],
    '인천': ['부평구', '남동구', '미추홀구', '서구', '연수구', '계양구', '중구', '동구', '강화군', '옹진군'],
    '강원': ['춘천시', '원주시', '강릉시', '동해시', '태백시', '속초시', '삼척시', '홍천군', '횡성군', '영월군', '평창군', '정선군', '철원군', '화천군', '양구군', '인제군', '고성군', '양양군'],
    '부산': ['중구', '서구', '동구', '영도구', '부산진구', '동래구', '남구', '북구', '해운대구', '사하구', '금정구', '강서구', '연제구', '수영구', '사상구', '기장군'],
    '제주': ['제주시', '서귀포시'],
    '대구': ['중구', '동구', '서구', '남구', '북구', '수성구', '달서구', '달성군'],
    '대전': ['동구', '중구', '서구', '유성구', '대덕구'],
    '광주': ['동구', '서구', '남구', '북구', '광산구'],
    '울산': ['중구', '남구', '동구', '북구', '울주군'],
    '경남': ['창원시', '진주시', '통영시', '사천시', '김해시', '밀양시', '거제시', '양산시'],
    '경북': ['포항시', '경주시', '김천시', '안동시', '구미시', '영주시', '영천시', '상주시', '문경시', '경산시'],
    '전남': ['목포시', '여수시', '순천시', '나주시', '광양시'],
    '전북': ['전주시', '군산시', '익산시', '정읍시', '남원시', '김제시'],
    '충남': ['천안시', '공주시', '보령시', '아산시', '서산시', '논산시', '계룡시', '당진시'],
    '충북': ['청주시', '충주시', '제천시'],
    '세종': []
};

const PROVINCES = Object.keys(REGION_MAP);

const HealingModal: React.FC<HealingModalProps> = ({ isOpen, onClose, onNavigate, onUseCredit, credits }) => {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ place: string, placeType?: string, activity: string, reason: string } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [province, setProvince] = useState('서울');
    const [city, setCity] = useState((REGION_MAP['서울'] && REGION_MAP['서울'][0]) || '');

    const currentCities = REGION_MAP[province];

    useEffect(() => {
        if (currentCities && currentCities.length > 0) {
            setCity(currentCities[0] || '');
        } else {
            setCity('');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [province]);

    const reset = () => {
        setResult(null);
        setError(null);
        setProvince('서울');
        setCity((REGION_MAP['서울'] && REGION_MAP['서울'][0]) || '');
    };

    useEffect(() => {
        if (isOpen) reset();
    }, [isOpen]);

    const handleAnalyze = async () => {
        setLoading(true);
        setError(null);
        
        // Final check before starting (though button should be disabled)
        if (credits !== undefined && credits < 3) {
            setLoading(false);
            if (window.confirm('크레딧이 부족합니다. 충전 페이지로 이동하시겠습니까?')) {
                onNavigate('creditPurchase' as any);
            }
            return;
        }

        // Deduction will happen after success

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('로그인이 필요합니다.');

            const user = session.user.user_metadata;
            const fullRegion = city ? `${province} ${city}` : province;

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
                    region: fullRegion
                })
            });

            if (!response.ok) throw new Error('추천을 받아오지 못했습니다.');
            const data = await response.json();
            setResult(data);
            
            // Deduct credit only after success
            if (onUseCredit) {
                const creditSuccess = await onUseCredit();
                if (!creditSuccess) {
                    console.error('Credit deduction failed after successful analysis');
                }
            }

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
                <ServiceNavigation currentService="healing" onNavigate={onNavigate} onClose={onClose} />

                {/* Professional Header */}
                <div className="bg-white px-8 sm:px-12 pt-10 pb-4 shrink-0">
                    <div className="flex justify-between items-end">
                        <div>
                            <div className="flex items-center gap-2 text-teal-600 font-black tracking-[0.2em] text-[10px] uppercase mb-1.5">
                                <Wind className="w-4 h-4" /> Spiritual Sanctuary
                            </div>
                            <h3 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tighter leading-none uppercase">
                                힐링 명당 지도
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
                                    <MapPin className="w-5 h-5 text-teal-600" /> 희망 지역 선택
                                </h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Province/City</p>
                                        <select
                                            className="w-full p-4 rounded-2xl bg-slate-50 border-none text-slate-950 font-bold focus:ring-2 focus:ring-slate-200 transition-all appearance-none"
                                            value={province}
                                            onChange={(e) => setProvince(e.target.value)}
                                        >
                                            {PROVINCES.map(p => (
                                                <option key={p} value={p}>{p}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">District</p>
                                        <select
                                            className="w-full p-4 rounded-2xl bg-slate-50 border-none text-slate-950 font-bold focus:ring-2 focus:ring-slate-200 transition-all appearance-none"
                                            value={city}
                                            onChange={(e) => setCity(e.target.value)}
                                            disabled={!currentCities || currentCities.length === 0}
                                        >
                                            {currentCities?.map(c => (
                                                <option key={c} value={c}>{c}</option>
                                            ))}
                                            {(!currentCities || currentCities.length === 0) && (
                                                <option value="">전체</option>
                                            )}
                                        </select>
                                    </div>
                                </div>
                            </section>

                            <button
                                onClick={handleAnalyze}
                                disabled={loading}
                                className="group relative w-full py-5 bg-slate-950 text-white rounded-full text-lg font-black shadow-2xl transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 mt-4 overflow-hidden"
                            >
                                <div className="relative z-10 flex items-center justify-center gap-3">
                                    {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Sparkles className="w-6 h-6 text-teal-400 group-hover:rotate-12 transition-transform" />}
                                    {loading ? '나만의 명당 탐색 중...' : '맞춤 힐링 스팟 찾기'}
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-12 animate-fade-up">
                            {/* Result Top Card */}
                            <div className="report-card bg-teal-950 text-white border-none p-12 text-center relative overflow-hidden">
                                <Wind className="absolute top-6 right-6 w-12 h-12 text-white/5" />
                                <div className="inline-block px-4 py-1.5 bg-teal-500/20 text-teal-300 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] border border-teal-500/30 mb-6 font-mono">
                                    {result.placeType || 'Destined Location'}
                                </div>
                                <h3 className="text-4xl font-black text-white mb-4 tracking-tighter leading-tight">{result.place}</h3>
                                <div className="h-[1px] w-20 bg-teal-500/50 mx-auto mb-8"></div>
                                <div className="text-white/60 text-xs font-bold uppercase tracking-[0.3em] mb-2 font-mono">Recommended Activity</div>
                                <p className="text-xl font-bold text-teal-200 italic">"{result.activity}"</p>
                            </div>

                            {/* Reasoning */}
                            <section className="report-section">
                                <h4 className="report-section-title">
                                    <Sparkles className="w-5 h-5 text-teal-600" /> 명리학적 안식의 이유
                                </h4>
                                <div className="report-card p-10 bg-slate-50 border-slate-100">
                                    <p className="text-slate-600 leading-relaxed text-md whitespace-pre-wrap">
                                        {result.reason}
                                    </p>
                                </div>
                            </section>

                            <div className="flex flex-col items-center pt-10 border-t border-slate-100">
                                <button
                                    onClick={() => setResult(null)}
                                    className="px-10 py-5 bg-slate-950 text-white rounded-full text-md font-black shadow-2xl transition-all hover:scale-[1.02] active:scale-95"
                                >
                                    다른 명당 찾아보기
                                </button>
                                <p className="mt-4 text-[10px] text-slate-400 font-bold uppercase tracking-widest">Mind & Soul Harmony</p>
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

export default HealingModal;
