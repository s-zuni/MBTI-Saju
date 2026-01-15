import React, { useState, useEffect } from 'react';
import { Hotel, X, Loader2, MapPin, Navigation } from 'lucide-react';
import { supabase } from '../supabaseClient';
import ServiceNavigation, { ServiceType } from './ServiceNavigation';

interface HealingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onNavigate: (service: ServiceType) => void;
}

const REGION_MAP: { [key: string]: string[] } = {
    '서울': ['강남구', '강동구', '강북구', '강서구', '관악구', '광진구', '구로구', '금천구', '노원구', '도봉구', '동대문구', '동작구', '마포구', '서대문구', '서초구', '성동구', '성북구', '송파구', '양천구', '영등포구', '용산구', '은평구', '종로구', '중구', '중랑구'],
    '경기': ['수원시', '고양시', '용인시', '성남시', '부천시', '화성시', '안산시', '남양주시', '안양시', '평택시', '시흥시', '파주시', '의정부시', '김포시', '광주시', '광명시', '군포시', '하남시', '오산시', '양주시', '이천시', '구리시', '안성시', '포천시', '의왕시', '양평군', '여주시', '동두천시', '가평군', '과천시', '연천군'],
    '인천': ['부평구', '남동구', '미추홀구', '서구', '연수구', '계양구', '중구', '동구', '강화군', '옹진군'],
    '강원': ['춘천시', '원주시', '강릉시', '동해시', '태백시', '속초시', '삼척시', '홍천군', '횡성군', '영월군', '평창군', '정선군', '철원군', '화천군', '양구군', '인제군', '고성군', '양양군'],
    '부산': ['중구', '서구', '동구', '영도구', '부산진구', '동래구', '남구', '북구', '해운대구', '사하구', '금정구', '강서구', '연제구', '수영구', '사상구', '기장군'],
    '제주': ['제주시', '서귀포시'],
    // Full list truncated for brevity, can expand later
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

const HealingModal: React.FC<HealingModalProps> = ({ isOpen, onClose, onNavigate }) => {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ place: string, placeType?: string, activity: string, reason: string } | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Level 1: Province (Do/Si)
    const [province, setProvince] = useState('서울');
    // Level 2: City (Si/Gu)
    const [city, setCity] = useState((REGION_MAP['서울'] && REGION_MAP['서울'][0]) || '');

    const currentCities = REGION_MAP[province];

    useEffect(() => {
        // Reset city when province changes
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
                <ServiceNavigation currentService="healing" onNavigate={onNavigate} onClose={onClose} />

                <div className="p-6 pb-0">
                    <div className="flex items-center gap-2 mb-2">
                        <Hotel className="w-6 h-6 text-teal-600 fill-teal-600" />
                        <h2 className="text-xl font-bold text-slate-800">마음의 안식 힐링장소</h2>
                    </div>
                </div>

                <div className="p-8">
                    {!result ? (
                        <div className="space-y-6">
                            <div>
                                <label className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-teal-600" /> 여행지 선택
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <select
                                        className="input-field appearance-none"
                                        value={province}
                                        onChange={(e) => setProvince(e.target.value)}
                                    >
                                        {PROVINCES.map(p => (
                                            <option key={p} value={p}>{p}</option>
                                        ))}
                                    </select>

                                    <select
                                        className="input-field appearance-none"
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
                            <button
                                onClick={handleAnalyze}
                                disabled={loading}
                                className="w-full btn-primary py-4 text-lg font-bold bg-gradient-to-r from-teal-500 to-emerald-500 border-none hover:from-teal-600 hover:to-emerald-600 shadow-xl shadow-teal-100"
                            >
                                {loading ? <Loader2 className="animate-spin mx-auto" /> : '✨ 나에게 맞는 힐링 여행지 찾기'}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-fade-up">
                            <div className="bg-teal-50 p-6 rounded-2xl border border-teal-100 text-center relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-teal-400 to-emerald-400"></div>
                                <div className="mb-4">
                                    <span className="inline-block px-3 py-1 bg-white text-teal-600 rounded-full text-xs font-bold shadow-sm mb-2 border border-teal-100">
                                        {result.placeType || '추천 장소'}
                                    </span>
                                    <h3 className="text-2xl font-black text-teal-900 mb-2">{result.place}</h3>
                                </div>

                                <div className="bg-white/80 rounded-xl p-4 mb-4 backdrop-blur-sm">
                                    <h4 className="text-sm font-bold text-slate-500 mb-1 flex items-center justify-center gap-1">
                                        <Navigation className="w-3 h-3" /> 추천 활동
                                    </h4>
                                    <div className="text-lg font-bold text-teal-700">
                                        {result.activity}
                                    </div>
                                </div>

                                <p className="text-slate-600 leading-relaxed text-left whitespace-pre-wrap bg-white/50 p-4 rounded-xl border border-teal-50/50">
                                    {result.reason}
                                </p>
                            </div>

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

export default HealingModal;
