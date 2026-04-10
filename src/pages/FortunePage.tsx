import React from 'react';
import { Coins } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { SERVICE_COSTS } from '../config/creditConfig';

// 각 카테고리별 크레딧 비용 및 이용자 수
const subCategories = [
    { id: 'fortune', img: '/assets/icons/3d_fortune.png', label: '오늘의 운세', sub: '매일 행운 확인', cost: SERVICE_COSTS.FORTUNE_TODAY, userCount: '12,000+', isPopular: false },
    { id: 'mbti', img: '/assets/icons/3d_mbti.png', label: '융합 분석', sub: '사주×MBTI 융합', cost: SERVICE_COSTS.MBTI_SAJU, userCount: '5,300+', isPopular: true },
    { id: 'tarot', img: '/assets/icons/3d_tarot.png', label: '타로', sub: '운명의 타로 점술', cost: SERVICE_COSTS.TAROT, userCount: '2,500+', isPopular: false, isNew: true },
    { id: 'trip', img: '/assets/icons/3d_trip.png', label: '여행', sub: '나만의 행운 여행지', cost: SERVICE_COSTS.COMPATIBILITY_TRIP, userCount: '800+', isPopular: false },
    { id: 'naming', img: '/assets/icons/3d_healing.png', label: '사주 작명', sub: '행운의 이름 찾기', cost: SERVICE_COSTS.NAMING, userCount: '1,200+', isPopular: false },
    { id: 'kbo', img: '/assets/icons/3d_kbo.png', label: 'KBO 팬 궁합', sub: '사주×야구 궁합', cost: SERVICE_COSTS.KBO, userCount: '1,500+', isPopular: true, isNew: true },
    { id: 'relationship', img: '/assets/icons/3d_relationship.png', label: '인연 도감', sub: '소중한 인연 관리', cost: SERVICE_COSTS.RELATIONSHIP_ADD, userCount: '3,300+', isPopular: true },
];

interface FortunePageProps {
    onFortuneClick: () => void;
    onMbtiSajuClick: () => void;
    onTarotClick: () => void;
    onTripClick: () => void;
    onNamingClick: () => void;
    onKboClick: () => void;
    onCompatibilityClick: () => void;
}

const FortunePage: React.FC<FortunePageProps> = ({
    onFortuneClick,
    onMbtiSajuClick,
    onTarotClick,
    onTripClick,
    onNamingClick,
    onKboClick,
    onCompatibilityClick,
}) => {
    const navigate = useNavigate();

    const handleSubCategoryClick = (cat: any) => {
        if (cat.id === 'fortune') onFortuneClick();
        else if (cat.id === 'mbti') onMbtiSajuClick();
        else if (cat.id === 'tarot') onTarotClick();
        else if (cat.id === 'trip') onTripClick();
        else if (cat.id === 'naming') onNamingClick();
        else if (cat.id === 'kbo') onKboClick();
        else if (cat.id === 'relationship') navigate('/relationship');
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-32 pt-20 animate-fade-in">
            <div className="max-w-7xl mx-auto px-6">
                {/* Header Section */}
                <div className="mb-12 text-center md:text-left">
                    <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-2">운명 서고</h1>
                    <p className="text-slate-500 font-medium text-sm md:text-base">사주와 타로로 엿보는 당신의 무한한 미래</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {subCategories.map((cat, i) => (
                        <button
                            key={i}
                            onClick={() => handleSubCategoryClick(cat)}
                            className="celestial-card group relative flex flex-col items-start gap-4 text-left"
                        >
                            {/* Status Badges */}
                            <div className="absolute top-6 right-6 flex flex-col gap-2 z-10">
                                {cat.isPopular && (
                                    <span className="px-2 py-0.5 bg-rose-500 text-white text-[9px] font-black rounded-full uppercase tracking-widest shadow-lg shadow-rose-100">HOT</span>
                                )}
                                {cat.isNew && (
                                    <span className="px-2 py-0.5 bg-indigo-500 text-white text-[9px] font-black rounded-full uppercase tracking-widest shadow-lg shadow-indigo-100">NEW</span>
                                )}
                            </div>

                            {/* Icon Container */}
                            <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center p-2 mb-2 group-hover:rotate-6 transition-transform duration-500">
                                <img
                                    src={cat.img}
                                    alt={cat.label}
                                    className="w-full h-full object-contain drop-shadow-xl"
                                />
                            </div>

                            <div className="w-full">
                                <h4 className="text-lg font-black text-slate-900 group-hover:text-indigo-600 transition-colors mb-1">
                                    {cat.label}
                                </h4>
                                <p className="text-xs text-slate-500 font-medium mb-6 leading-relaxed">
                                    {cat.sub}
                                </p>
                                
                                <div className="flex justify-between items-center mt-auto">
                                    <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                                        {cat.userCount} USED
                                    </div>
                                    
                                    <div className={`
                                        flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black tracking-widest
                                        ${cat.cost === 0
                                            ? 'bg-emerald-50 text-emerald-600'
                                            : 'bg-indigo-50 text-indigo-600'
                                        } transition-all group-hover:px-4
                                    `}>
                                        {cat.cost === 0 ? (
                                            'FREE'
                                        ) : (
                                            <>
                                                <Coins className="w-3 h-3" />
                                                {cat.cost}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Action Indicator */}
                            <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0">
                                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-lg">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default FortunePage;
