import React from 'react';
import { ArrowLeft, Coins } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MobileHeader from '../components/MobileHeader';
import { SERVICE_COSTS } from '../config/coinConfig';

// 각 카테고리별 코인 비용
const subCategories = [
    { img: '/assets/icons/3d_fortune.png', label: '오늘의운세', sub: '매일 확인하는', cost: SERVICE_COSTS.FORTUNE_TODAY },
    { img: '/assets/icons/3d_mbti.png', label: 'MBTI & 사주', sub: '나를 알아보는', cost: SERVICE_COSTS.MBTI_SAJU },
    { img: '/assets/icons/3d_trip.png', label: '궁합여행', sub: '함께 떠나는', cost: SERVICE_COSTS.COMPATIBILITY_TRIP },
    { img: '/assets/icons/3d_healing.png', label: '힐링장소', sub: '마음의 안식', cost: SERVICE_COSTS.HEALING },
    { img: '/assets/icons/3d_job.png', label: '추천직업', sub: '나의 천직', cost: SERVICE_COSTS.JOB },
    { img: '/assets/icons/3d_relationship.png', label: '인연 도감', sub: '소중한 인연 관리', cost: SERVICE_COSTS.RELATIONSHIP_ADD },
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
    onCompatibilityClick,
}) => {
    const navigate = useNavigate();

    const handleSubCategoryClick = (index: number) => {
        if (index === 0) onFortuneClick();
        else if (index === 1) onMbtiSajuClick();
        else if (index === 2) onTripClick();
        else if (index === 3) onHealingClick();
        else if (index === 4) onJobClick();
        else if (index === 5) navigate('/relationship');
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
                    {subCategories.map((cat, i) => (
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
                                w-20 h-20 rounded-2xl flex items-center justify-center 
                                flex-shrink-0 transition-transform group-hover:scale-105
                            `}>
                                <img
                                    src={cat.img}
                                    alt={cat.label}
                                    className="w-full h-full object-cover mix-blend-multiply drop-shadow-sm"
                                />
                            </div>
                            <div className="flex-1 min-w-0 pt-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-bold text-slate-900 text-lg group-hover:text-indigo-600 transition-colors">
                                        {cat.label}
                                    </h4>
                                    {/* 코인 비용 표시 */}
                                    <span className={`
                                        inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold
                                        ${cat.cost === 0
                                            ? 'bg-green-100 text-green-600'
                                            : 'bg-amber-100 text-amber-600'
                                        }
                                    `}>
                                        {cat.cost === 0 ? (
                                            '무료'
                                        ) : (
                                            <>
                                                <Coins className="w-3 h-3" />
                                                {cat.cost}
                                            </>
                                        )}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-500 leading-relaxed font-medium">
                                    {cat.sub}
                                </p>
                            </div>
                            <div className="self-center opacity-0 group-hover:opacity-100 transition-opacity -ml-2 translate-x-2 group-hover:translate-x-0">
                                <ArrowLeft className="w-5 h-5 text-slate-300 rotate-180" />
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default FortunePage;
