import React from 'react';
import { ArrowRight, Sparkles, Compass, Users, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface FeatureGridsProps {
    onStart: () => void;
    onFortuneClick: () => void;
    onMbtiSajuClick: () => void;
    onTripClick: () => void;
    onHealingClick: () => void;
    onJobClick: () => void;
    onCompatibilityClick: () => void;
    onTarotClick?: () => void;
    onChatbotClick?: () => void;
}

const FeatureGrids: React.FC<FeatureGridsProps> = ({
    onStart,
    onTarotClick,
    onChatbotClick
}) => {
    const navigate = useNavigate();
    const mainCategories = [
        {
            icon: Compass,
            label: '운세 보기',
            sub: '오늘의 운세 & 토정비결',
            bg: 'from-violet-500 to-indigo-600',
            action: () => navigate('/fortune')
        },
        {
            icon: MessageSquare,
            label: 'AI 심층 상담',
            sub: 'MBTI x 사주 융합 분석',
            bg: 'from-amber-400 to-orange-500',
            action: onChatbotClick || onStart
        },
        {
            icon: Sparkles,
            label: '타로 조언',
            sub: '신비로운 카드의 메시지',
            bg: 'from-purple-500 to-pink-600',
            action: () => onTarotClick ? onTarotClick() : alert('준비 중입니다.')
        },
        {
            icon: Users,
            label: '커뮤니티',
            sub: '운명을 나누는 공간',
            bg: 'from-slate-600 to-slate-800',
            action: () => navigate('/community')
        },
    ];

    return (
        <div className="section-container relative -mt-16 z-20 px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {mainCategories.map((cat, i) => (
                    <button
                        key={i}
                        onClick={cat.action}
                        className="group relative overflow-hidden bg-white p-6 rounded-2xl shadow-xl shadow-slate-200/50 hover:-translate-y-2 transition-all duration-300 text-left border border-slate-100"
                    >
                        <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${cat.bg} opacity-10 rounded-bl-full -mr-4 -mt-4 transition-opacity group-hover:opacity-20`}></div>

                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${cat.bg} flex items-center justify-center text-white shadow-lg mb-4`}>
                            <cat.icon className="w-6 h-6" />
                        </div>

                        <h3 className="text-lg font-bold text-slate-900 mb-1">{cat.label}</h3>
                        <p className="text-sm text-slate-500">{cat.sub}</p>

                        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0">
                            <ArrowRight className="w-5 h-5 text-slate-300" />
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default FeatureGrids;
