import React from 'react';
import { Coins } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ListRow } from '@toss/tds-mobile';
import { SERVICE_COSTS } from '../config/creditConfig';

// 각 카테고리별 크레딧 비용 및 이용자 수
const subCategories = [
    { id: 'fortune', img: '/assets/icons/3d_fortune.png', label: '오늘의 운세', sub: '매일 행운 확인', cost: SERVICE_COSTS.FORTUNE_TODAY, userCount: '12,000+', isPopular: false, colorClass: 'amber' },
    { id: 'mbti', img: '/assets/icons/3d_mbti.png', label: '심층 리포트', sub: '전문가 수기 결합 분석', cost: 49000, userCount: '5,300+', isPopular: true, colorClass: 'violet' },
    { id: 'tarot', img: '/assets/icons/3d_tarot.png', label: '타로', sub: '운명의 타로 점술', cost: SERVICE_COSTS.TAROT, userCount: '2,500+', isPopular: false, isNew: true, colorClass: 'purple' },
    { id: 'trip', img: '/assets/icons/3d_trip.png', label: '여행', sub: '나만의 행운 여행지', cost: SERVICE_COSTS.COMPATIBILITY_TRIP, userCount: '800+', isPopular: false, colorClass: 'sky' },
    { id: 'naming', img: '/assets/icons/3d_healing.png', label: '사주 작명', sub: '행운의 이름 찾기', cost: SERVICE_COSTS.NAMING, userCount: '1,200+', isPopular: false, colorClass: 'emerald' },
    { id: 'kbo', img: '/assets/icons/3d_kbo.png', label: 'KBO 팬 궁합', sub: '사주×야구 궁합', cost: SERVICE_COSTS.KBO, userCount: '1,500+', isPopular: true, isNew: true, colorClass: 'blue' },
    { id: 'relationship', img: '/assets/icons/3d_relationship.png', label: '인연 도감', sub: '소중한 인연 관리', cost: SERVICE_COSTS.RELATIONSHIP_ADD, userCount: '3,300+', isPopular: true, colorClass: 'pink' },
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
        <div className="min-h-screen bg-[#f2f4f6] pb-32 pt-16">
            <div className="max-w-3xl mx-auto">
                <div className="px-6 py-8">
                    <h1 className="text-[28px] font-bold text-slate-900 tracking-tight mb-2">운명 서고</h1>
                    <p className="text-slate-500 font-medium text-[15px]">사주와 타로로 엿보는 당신의 무한한 미래</p>
                </div>

                <div className="bg-white mx-4 rounded-3xl overflow-hidden shadow-sm">
                    {subCategories.map((cat, i) => (
                        <ListRow
                            key={i}
                            onClick={() => handleSubCategoryClick(cat)}
                            left={
                                <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center p-2 relative">
                                    <img
                                        src={cat.img}
                                        alt={cat.label}
                                        className="w-full h-full object-contain"
                                    />
                                </div>
                            }
                            contents={
                                <ListRow.Texts
                                    type="2RowTypeE"
                                    top={
                                        <div className="flex items-center gap-2">
                                            {cat.label}
                                            {cat.isPopular && <span className="px-1.5 py-[2px] bg-rose-50 text-rose-500 text-[9px] font-bold rounded">HOT</span>}
                                            {cat.isNew && <span className="px-1.5 py-[2px] bg-violet-50 text-violet-600 text-[9px] font-bold rounded">NEW</span>}
                                        </div>
                                    }
                                    topProps={{ color: 'grey900', fontWeight: 'bold' }}
                                    bottom={cat.sub}
                                    bottomProps={{ color: 'grey500', size: 13 }}
                                />
                            }
                            right={
                                <div className="flex flex-col items-end gap-1 px-4">
                                    <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-100 px-2.5 py-1.5 rounded-full">
                                        {cat.cost === 0 ? (
                                            '무료'
                                        ) : cat.id === 'mbti' ? (
                                            '4.9만'
                                        ) : (
                                            <>
                                                <Coins className="w-3.5 h-3.5 text-violet-500" />
                                                {cat.cost}
                                            </>
                                        )}
                                    </div>
                                </div>
                            }
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default FortunePage;
