import React from 'react';
import { ArrowRight, Sparkles, MapPin, Ticket, Plane, Package, Hotel, Building2, TrainFront, Compass, Utensils, Heart, type LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const categories = [
    { icon: Sparkles, label: '오늘의운세', sub: '매일 확인하는', color: 'text-purple-600', bg: 'bg-purple-50', hover: 'hover:bg-purple-100', border: 'border-purple-100' },
    { icon: Compass, label: 'MBTI & 사주', sub: '나를 알아보는', color: 'text-indigo-600', bg: 'bg-indigo-50', hover: 'hover:bg-indigo-100', border: 'border-indigo-100' },
    { icon: Plane, label: '궁합여행', sub: '함께 떠나는', color: 'text-sky-600', bg: 'bg-sky-50', hover: 'hover:bg-sky-100', border: 'border-sky-100' },
    { icon: Hotel, label: '힐링장소', sub: '마음의 안식', color: 'text-teal-600', bg: 'bg-teal-50', hover: 'hover:bg-teal-100', border: 'border-teal-100' },
    { icon: Ticket, label: '추천직업', sub: '나의 천직', color: 'text-orange-600', bg: 'bg-orange-50', hover: 'hover:bg-orange-100', border: 'border-orange-100' },
    { icon: Package, label: '운세템', sub: '행운의 물건', color: 'text-rose-600', bg: 'bg-rose-50', hover: 'hover:bg-rose-100', border: 'border-rose-100' },
    { icon: Heart, label: '친구 궁합', sub: '우리는 잘 맞을까?', color: 'text-pink-600', bg: 'bg-pink-50', hover: 'hover:bg-pink-100', border: 'border-pink-100' },
    { icon: Building2, label: '커뮤니티', sub: '함께 나누는 이야기', color: 'text-slate-600', bg: 'bg-slate-50', hover: 'hover:bg-slate-100', border: 'border-slate-100' },
];

interface FeatureGridsProps {
    onStart: () => void;
    onFortuneClick: () => void;
    onMbtiSajuClick: () => void;
    onTripClick: () => void;
    onHealingClick: () => void;
    onJobClick: () => void;
    onCompatibilityClick: () => void;
}

const FeatureGrids: React.FC<FeatureGridsProps> = ({
    onStart,
    onFortuneClick,
    onMbtiSajuClick,
    onTripClick,
    onHealingClick,
    onJobClick,
    onCompatibilityClick
}) => {
    const navigate = useNavigate();

    const handleCardClick = (index: number) => {
        if (index === 0) onFortuneClick();
        else if (index === 1) onMbtiSajuClick();
        else if (index === 2) onTripClick();
        else if (index === 3) onHealingClick();
        else if (index === 4) onJobClick();
        else if (index === 6) onCompatibilityClick();
        else if (index === 7) navigate('/community');
        else onStart();
    };

    return (
        <div className="section-container !py-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {categories.map((cat, i) => (
                    <button
                        key={i}
                        onClick={() => handleCardClick(i)}
                        className={`
                            relative h-40 p-6 rounded-3xl text-left transition-all duration-300 group
                            ${cat.bg} ${cat.hover} border ${cat.border}
                            hover:shadow-lg hover:-translate-y-1
                        `}
                    >
                        <div className="flex flex-col justify-between h-full">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className={`text-sm font-medium opacity-80 mb-1 ${cat.color.replace('600', '700')}`}>
                                        {cat.sub}
                                    </p>
                                    <h3 className={`text-xl font-bold ${cat.color.replace('600', '900')}`}>
                                        {cat.label}
                                    </h3>
                                </div>
                                <div className={`
                                    w-10 h-10 rounded-full bg-white/60 flex items-center justify-center 
                                    backdrop-blur-sm transition-transform group-hover:scale-110
                                `}>
                                    <cat.icon className={`w-5 h-5 ${cat.color}`} />
                                </div>
                            </div>

                            <div className="w-full flex justify-end">
                                <div className={`
                                    p-2 rounded-full bg-white/40
                                    group-hover:bg-white/80 transition-colors
                                `}>
                                    <ArrowRight className={`w-4 h-4 ${cat.color}`} />
                                </div>
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default FeatureGrids;
