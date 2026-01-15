import React from 'react';
import { ArrowLeft, Sparkles, Compass, Plane, Hotel, Ticket, Heart, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Tier, TIERS } from '../hooks/useSubscription';
import MobileHeader from '../components/MobileHeader';

const subCategories = [
    { icon: Sparkles, label: '오늘의운세', sub: '매일 확인하는', color: 'text-purple-600', bg: 'bg-purple-50', hover: 'hover:bg-purple-100', border: 'border-purple-100' },
    { icon: Compass, label: 'MBTI & 사주', sub: '나를 알아보는', color: 'text-indigo-600', bg: 'bg-indigo-50', hover: 'hover:bg-indigo-100', border: 'border-indigo-100' },
    { icon: Plane, label: '궁합여행', sub: '함께 떠나는', color: 'text-sky-600', bg: 'bg-sky-50', hover: 'hover:bg-sky-100', border: 'border-sky-100' },
    { icon: Hotel, label: '힐링장소', sub: '마음의 안식', color: 'text-teal-600', bg: 'bg-teal-50', hover: 'hover:bg-teal-100', border: 'border-teal-100' },
    { icon: Ticket, label: '추천직업', sub: '나의 천직', color: 'text-orange-600', bg: 'bg-orange-50', hover: 'hover:bg-orange-100', border: 'border-orange-100' },
    { icon: Heart, label: '친구 궁합', sub: '우리는 잘 맞을까?', color: 'text-pink-600', bg: 'bg-pink-50', hover: 'hover:bg-pink-100', border: 'border-pink-100' },
];

// ... (keep existing imports)

interface FortunePageProps {
    onFortuneClick: () => void;
    onMbtiSajuClick: () => void;
    onTripClick: () => void;
    onHealingClick: () => void;
    onJobClick: () => void;
    onCompatibilityClick: () => void;
    tier: Tier;
    onOpenSubscription: () => void;
}

const FortunePage: React.FC<FortunePageProps> = ({
    onFortuneClick,
    onMbtiSajuClick,
    onTripClick,
    onHealingClick,
    onJobClick,
    onCompatibilityClick,
    tier,
    onOpenSubscription
}) => {
    const navigate = useNavigate();

    const handleSubCategoryClick = (index: number) => {
        // Today's Fortune (index 0) is always accessible
        if (index === 0) {
            onFortuneClick();
            return;
        }

        // All other features (index 1-5) require at least BASIC tier
        if (tier === TIERS.FREE) {
            onOpenSubscription();
            return;
        }

        if (index === 1) onMbtiSajuClick();
        else if (index === 2) onTripClick();
        else if (index === 3) onHealingClick();
        else if (index === 4) onJobClick();
        else if (index === 5) onCompatibilityClick();
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-24 pt-14 md:pt-20 animate-fade-in">
            <MobileHeader title="운세 보기" />
            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-6 py-6 md:py-0">
                <div className="mb-8 hidden md:block">
                    <h1 className="text-2xl font-bold text-slate-900">운세 보기</h1>
                    <p className="text-slate-500 text-sm mt-1">다양한 운세와 분석을 확인해보세요</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {subCategories.map((cat, i) => {
                        // Check if locked: ALL except index 0 (Today's Fortune) are locked for FREE tier users
                        const isLocked = i !== 0 && tier === TIERS.FREE;

                        return (
                            <button
                                key={i}
                                onClick={() => handleSubCategoryClick(i)}
                                className={`
                                    relative p-6 rounded-3xl text-left transition-all duration-300 group
                                    bg-white border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1
                                    flex items-start gap-5 overflow-hidden
                                `}
                            >
                                <div className={`
                                    w-16 h-16 rounded-2xl ${cat.bg} flex items-center justify-center 
                                    flex-shrink-0 transition-transform group-hover:scale-110
                                `}>
                                    <cat.icon className={`w-8 h-8 ${cat.color}`} />
                                </div>
                                <div className="flex-1 min-w-0 pt-1">
                                    <h4 className="font-bold text-slate-900 text-lg mb-1 group-hover:text-indigo-600 transition-colors">
                                        {cat.label}
                                    </h4>
                                    <p className="text-sm text-slate-500 leading-relaxed font-medium">
                                        {cat.sub}
                                    </p>
                                </div>
                                <div className="self-center opacity-0 group-hover:opacity-100 transition-opacity -ml-2 translate-x-2 group-hover:translate-x-0">
                                    <ArrowLeft className="w-5 h-5 text-slate-300 rotate-180" />
                                </div>

                                {/* Lock Overlay */}
                                {isLocked && (
                                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-10 transition-opacity hover:bg-white/40">
                                        <div className="bg-slate-900/90 text-white px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-bold shadow-lg transform hover:scale-110 transition-transform">
                                            <Lock className="w-3 h-3" />
                                            <span>Basic</span>
                                        </div>
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default FortunePage;
