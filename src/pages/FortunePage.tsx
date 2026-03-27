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
    { id: 'cherry', img: '/assets/icons/3d_cherry.png', label: '벚꽃 명소', sub: '나만의 행운 스팟', cost: SERVICE_COSTS.CHERRY, userCount: '1,200+', isPopular: true, isNew: true },
    { id: 'relationship', img: '/assets/icons/3d_relationship.png', label: '인연 도감', sub: '소중한 인연 관리', cost: SERVICE_COSTS.RELATIONSHIP_ADD, userCount: '3,300+', isPopular: true },
];

interface FortunePageProps {
    onFortuneClick: () => void;
    onMbtiSajuClick: () => void;
    onTarotClick: () => void;
    onTripClick: () => void;
    onNamingClick: () => void;
    onCherryClick: () => void;
    onCompatibilityClick: () => void;
}

const FortunePage: React.FC<FortunePageProps> = ({
    onFortuneClick,
    onMbtiSajuClick,
    onTarotClick,
    onTripClick,
    onNamingClick,
    onCherryClick,
    onCompatibilityClick,
}) => {
    const navigate = useNavigate();

    const handleSubCategoryClick = (cat: any) => {
        if (cat.id === 'fortune') onFortuneClick();
        else if (cat.id === 'mbti') onMbtiSajuClick();
        else if (cat.id === 'tarot') onTarotClick();
        else if (cat.id === 'trip') onTripClick();
        else if (cat.id === 'naming') onNamingClick();
        else if (cat.id === 'cherry') onCherryClick();
        else if (cat.id === 'relationship') navigate('/relationship');
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-24 pt-14 md:pt-20 animate-fade-in">

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-6 py-6 md:py-0">
                <div className="mb-8 hidden md:block">
                    <h1 className="text-2xl font-bold text-slate-900">운세 보기</h1>
                    <p className="text-slate-500 text-sm mt-1">다양한 운세와 분석을 확인해보세요</p>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {subCategories.map((cat, i) => (
                        <button
                            key={i}
                            onClick={() => handleSubCategoryClick(cat)}
                            className={`
                                relative p-4 rounded-3xl transition-all duration-300 group
                                bg-white border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1
                                flex flex-col items-center gap-3 overflow-hidden text-center
                            `}
                        >
                            {/* Tags Bagde */}
                            <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
                                {cat.isPopular && (
                                    <span className="px-1.5 py-0.5 bg-rose-500 text-white text-[8px] font-black rounded-md uppercase tracking-tighter">HIT</span>
                                )}
                                {cat.isNew && (
                                    <span className="px-1.5 py-0.5 bg-indigo-500 text-white text-[8px] font-black rounded-md uppercase tracking-tighter">NEW</span>
                                )}
                            </div>

                            <div className={`
                                w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center 
                                flex-shrink-0 transition-transform group-hover:scale-105
                            `}>
                                <img
                                    src={cat.img}
                                    alt={cat.label}
                                    className="w-full h-full object-contain mix-blend-multiply drop-shadow-sm"
                                />
                            </div>
                            <div className="flex-1 min-w-0 w-full px-1">
                                <h4 className="font-bold text-slate-900 text-sm md:text-base group-hover:text-indigo-600 transition-colors mb-0.5 truncate">
                                    {cat.label}
                                </h4>
                                <p className="text-[10px] md:text-xs text-slate-400 font-medium mb-2 truncate">
                                    {cat.sub}
                                </p>
                                
                                <div className="flex flex-col items-center gap-1.5">
                                    {/* User Count */}
                                    <div className="text-[9px] font-black text-slate-300 uppercase tracking-tighter">
                                        {cat.userCount} 이용 
                                    </div>
                                    
                                    {/* Cost */}
                                    <span className={`
                                        inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black
                                        ${cat.cost === 0
                                            ? 'bg-green-50 text-green-600'
                                            : 'bg-indigo-50 text-indigo-600'
                                        }
                                    `}>
                                        {cat.cost === 0 ? (
                                            'FREE'
                                        ) : (
                                            <>
                                                <Coins className="w-2.5 h-2.5" />
                                                {cat.cost}
                                            </>
                                        )}
                                    </span>
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
