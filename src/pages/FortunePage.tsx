import React from 'react';
import { ArrowLeft, Sparkles, Compass, Plane, Hotel, Ticket, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const subCategories = [
    { icon: Sparkles, label: '오늘의운세', sub: '매일 확인하는', color: 'text-purple-600', bg: 'bg-purple-50', hover: 'hover:bg-purple-100', border: 'border-purple-100' },
    { icon: Compass, label: 'MBTI & 사주', sub: '나를 알아보는', color: 'text-indigo-600', bg: 'bg-indigo-50', hover: 'hover:bg-indigo-100', border: 'border-indigo-100' },
    { icon: Plane, label: '궁합여행', sub: '함께 떠나는', color: 'text-sky-600', bg: 'bg-sky-50', hover: 'hover:bg-sky-100', border: 'border-sky-100' },
    { icon: Hotel, label: '힐링장소', sub: '마음의 안식', color: 'text-teal-600', bg: 'bg-teal-50', hover: 'hover:bg-teal-100', border: 'border-teal-100' },
    { icon: Ticket, label: '추천직업', sub: '나의 천직', color: 'text-orange-600', bg: 'bg-orange-50', hover: 'hover:bg-orange-100', border: 'border-orange-100' },
    { icon: Heart, label: '친구 궁합', sub: '우리는 잘 맞을까?', color: 'text-pink-600', bg: 'bg-pink-50', hover: 'hover:bg-pink-100', border: 'border-pink-100' },
];

interface FortunePageProps {
    onFortuneClick: () => void;
    onMbtiSajuClick: () => void;
    onTripClick: () => void;
    onHealingClick: () => void;
    onJobClick: () => void;
    onCompatibilityClick: () => void;
}

const FortunePage: React.FC<FortunePageProps> = ({
    onFortuneClick,
    onMbtiSajuClick,
    onTripClick,
    onHealingClick,
    onJobClick,
    onCompatibilityClick
}) => {
    const navigate = useNavigate();

    const handleSubCategoryClick = (index: number) => {
        if (index === 0) onFortuneClick();
        else if (index === 1) onMbtiSajuClick();
        else if (index === 2) onTripClick();
        else if (index === 3) onHealingClick();
        else if (index === 4) onJobClick();
        else if (index === 5) onCompatibilityClick();
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-24">
            {/* Header */}
            <div className="bg-white sticky top-0 z-10 px-6 py-4 flex items-center gap-4 shadow-sm">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 -ml-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                    <ArrowLeft className="w-6 h-6 text-slate-700" />
                </button>
                <h1 className="text-xl font-bold text-slate-800">운세 보기</h1>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {subCategories.map((cat, i) => (
                        <button
                            key={i}
                            onClick={() => handleSubCategoryClick(i)}
                            className={`
                                relative p-6 rounded-2xl text-left transition-all duration-300 group
                                bg-white border border-slate-100 hover:border-indigo-100
                                hover:shadow-lg hover:-translate-y-1
                                flex flex-col items-center text-center
                            `}
                        >
                            <div className={`w-14 h-14 rounded-2xl ${cat.bg} flex items-center justify-center mb-4 transition-transform group-hover:scale-110`}>
                                <cat.icon className={`w-7 h-7 ${cat.color}`} />
                            </div>
                            <h4 className="font-bold text-slate-900 text-lg mb-1">{cat.label}</h4>
                            <p className="text-xs text-slate-500">{cat.sub}</p>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default FortunePage;
