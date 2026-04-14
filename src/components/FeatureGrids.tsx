import React from 'react';
import { ArrowRight, Sparkles, Compass, Users, MessageSquare, Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useModalStore } from '../hooks/useModalStore';
import { useCredits } from '../hooks/useCredits';
import { SERVICE_COSTS } from '../config/creditConfig';

interface FeatureGridsProps { }

const FeatureGrids: React.FC<FeatureGridsProps> = () => {
    const navigate = useNavigate();
    const { session } = useAuth();
    const { openModal } = useModalStore();
    const { credits } = useCredits(session);

    const checkCreditsAndOpen = (cost: number, openFn: () => void) => {
        if (!session) {
            openModal('analysis', 'login');
            return;
        }
        if (credits >= cost) {
            openFn();
        } else {
            openModal('creditPurchase', undefined, { requiredCredits: cost });
        }
    };

    const mainCategories = [
        {
            icon: Compass,
            label: '운세 보기',
            sub: '오늘의 운세 & 토정비결',
            bg: 'from-violet-500 to-indigo-600',
            action: () => navigate('/fortune'),
        },
        {
            icon: MessageSquare,
            label: '운명 심층 상담',
            sub: 'MBTI x 사주 융합 분석',
            bg: 'from-amber-400 to-orange-500',
            action: () => {
                if (!session) {
                    openModal('analysis', 'login');
                    return;
                }
                if (credits >= SERVICE_COSTS.AI_CHAT_5) {
                    navigate('/chat');
                } else {
                    openModal('creditPurchase', undefined, { requiredCredits: SERVICE_COSTS.AI_CHAT_5 });
                }
            },
        },
        {
            icon: Sparkles,
            label: '운세템 상점',
            sub: '부적 & 굿즈 쇼핑',
            bg: 'from-purple-500 to-pink-600',
            action: () => alert('운세템 상점은 현재 준비 중입니다. 조만간 멋진 아이템으로 찾아뵙겠습니다!'),
        },
        {
            icon: Users,
            label: '커뮤니티',
            sub: '운명을 나누는 공간',
            bg: 'from-slate-600 to-slate-800',
            action: () => navigate('/community'),
        },
        {
            icon: Layers,
            label: '타로',
            sub: '카드로 보는 미래',
            bg: 'from-cyan-500 to-blue-600',
            action: () => checkCreditsAndOpen(SERVICE_COSTS.TAROT, () => openModal('tarot')),
        },
    ];

    return (
        <div className="relative z-20 px-6 max-w-7xl mx-auto -mt-10 md:-mt-12">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {mainCategories.map((cat, i) => (
                    <button
                        key={i}
                        onClick={cat.action}
                        className="group relative overflow-hidden bg-white p-8 rounded-[2rem] shadow-[0_15px_30px_-10px_rgba(0,0,0,0.05)] hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.1)] hover:-translate-y-2 transition-all duration-500 text-left border-none"
                    >
                        <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${cat.bg} opacity-[0.03] rounded-bl-full -mr-8 -mt-8 transition-opacity group-hover:opacity-[0.08]`}></div>

                        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${cat.bg} flex items-center justify-center text-white shadow-lg mb-6 group-hover:scale-110 transition-transform duration-500`}>
                            <cat.icon className="w-7 h-7" />
                        </div>

                        <h3 className="text-xl font-bold text-slate-800 mb-2">{cat.label}</h3>
                        <p className="text-sm font-medium text-slate-500 leading-relaxed">{cat.sub}</p>

                        <div className="absolute bottom-6 right-6 transition-all duration-500 transform translate-x-4 opacity-0 group-hover:translate-x-0 group-hover:opacity-100">
                            <ArrowRight className="w-6 h-6 text-slate-300" />
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default FeatureGrids;
