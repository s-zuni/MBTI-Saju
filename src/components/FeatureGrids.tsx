import React from 'react';
import { Compass, MessageSquare, Layers, Users, Sparkles, Trophy } from 'lucide-react';
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

    const gridItems = [
        {
            icon: Compass,
            label: '운세 보기',
            sub: '오늘의 운세 & 토정비결',
            color: 'from-amber-400 to-orange-500',
            iconBg: 'bg-amber-50',
            iconColor: 'text-amber-600',
            action: () => navigate('/fortune'),
        },
        {
            icon: MessageSquare,
            label: '운명 심층 상담',
            sub: 'AI 사주 상담',
            color: 'from-violet-500 to-violet-700',
            iconBg: 'bg-violet-50',
            iconColor: 'text-violet-600',
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
            icon: Layers,
            label: '타로',
            sub: '카드로 보는 미래',
            color: 'from-purple-500 to-purple-700',
            iconBg: 'bg-purple-50',
            iconColor: 'text-purple-600',
            action: () => checkCreditsAndOpen(SERVICE_COSTS.TAROT, () => openModal('tarot')),
        },
        {
            icon: Users,
            label: '커뮤니티',
            sub: '운명을 나누는 공간',
            color: 'from-slate-600 to-slate-800',
            iconBg: 'bg-slate-100',
            iconColor: 'text-slate-600',
            action: () => navigate('/community'),
        },
        {
            icon: Sparkles,
            label: '운세템 상점',
            sub: '부적 & 굿즈',
            color: 'from-rose-400 to-pink-500',
            iconBg: 'bg-rose-50',
            iconColor: 'text-rose-500',
            badge: 'SOON',
            action: () => alert('운세템 상점은 현재 준비 중입니다. 조만간 멋진 아이템으로 찾아뵙겠습니다!'),
        },
        {
            icon: Trophy,
            label: 'KBO 궁합',
            sub: '나의 야구 운세',
            color: 'from-blue-500 to-indigo-600',
            iconBg: 'bg-blue-50',
            iconColor: 'text-blue-600',
            action: () => checkCreditsAndOpen(SERVICE_COSTS.KBO, () => openModal('kbo')),
        },
    ];

    return (
        <div className="relative z-20 px-5 md:px-6 max-w-7xl mx-auto py-6 md:py-10">
            {/* Mobile: 2-column square grid, Desktop: 3-column */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-5">
                {gridItems.map((item, i) => (
                    <button
                        key={i}
                        onClick={item.action}
                        className="group relative aspect-square bg-white rounded-2xl md:rounded-3xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_30px_-8px_rgba(0,0,0,0.12)] hover:-translate-y-1 transition-all duration-300 border border-slate-100 flex flex-col items-center justify-center gap-2.5 md:gap-3 p-4 overflow-hidden"
                    >
                        {/* Gradient background accent */}
                        <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${item.color} opacity-[0.04] rounded-bl-full -mr-4 -mt-4 transition-opacity group-hover:opacity-[0.1]`}></div>

                        {/* Icon */}
                        <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl ${item.iconBg} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                            <item.icon className={`w-6 h-6 md:w-7 md:h-7 ${item.iconColor}`} />
                        </div>

                        {/* Label */}
                        <div className="text-center relative z-10">
                            <h3 className="text-sm md:text-base font-bold text-slate-800 mb-0.5">{item.label}</h3>
                            <p className="text-[10px] md:text-xs font-medium text-slate-400 hidden md:block">{item.sub}</p>
                        </div>

                        {/* Badge */}
                        {item.badge && (
                            <span className="absolute top-2.5 right-2.5 px-2 py-0.5 bg-rose-500 text-white text-[9px] font-bold rounded-full shadow-sm">
                                {item.badge}
                            </span>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default FeatureGrids;
