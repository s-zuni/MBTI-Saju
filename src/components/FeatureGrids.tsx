import React from 'react';
import { Compass, Users, MessageSquare, Layers, Sparkles, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useModalStore } from '../hooks/useModalStore';
import { useCredits } from '../hooks/useCredits';
import { SERVICE_COSTS } from '../config/creditConfig';
import { ListRow } from '@toss/tds-mobile';

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
            bg: 'bg-amber-100 text-amber-600',
            action: () => navigate('/fortune'),
        },
        {
            icon: MessageSquare,
            label: '운명 심층 상담',
            sub: 'MBTI x 사주 융합 분석',
            bg: 'bg-violet-100 text-violet-600',
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
            bg: 'bg-rose-100 text-rose-500',
            action: () => alert('운세템 상점은 현재 준비 중입니다. 조만간 멋진 아이템으로 찾아뵙겠습니다!'),
        },
        {
            icon: Layers,
            label: '타로',
            sub: '카드로 보는 미래',
            bg: 'bg-purple-100 text-purple-600',
            action: () => checkCreditsAndOpen(SERVICE_COSTS.TAROT, () => openModal('tarot')),
        },
        {
            icon: Users,
            label: '커뮤니티',
            sub: '운명을 나누는 공간',
            bg: 'bg-slate-100 text-slate-600',
            action: () => navigate('/community'),
        },
    ];

    return (
        <div className="bg-white rounded-t-3xl pt-2 pb-6 shadow-[0_-4px_24px_rgba(0,0,0,0.05)] mt-4">
            <div className="px-6 py-6 pb-2">
                <h3 className="text-xl font-bold text-slate-800 tracking-tight">어떤 서비스가 필요하신가요?</h3>
                <p className="text-sm text-slate-500 mt-1">원하는 운세 테마를 선택해주세요</p>
            </div>
            <div>
                {mainCategories.map((cat, i) => (
                    <ListRow
                        key={i}
                        onClick={cat.action}
                        left={
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${cat.bg}`}>
                                <cat.icon className="w-6 h-6" />
                            </div>
                        }
                        contents={
                            <ListRow.Texts
                                type="2RowTypeE"
                                top={cat.label}
                                topProps={{ color: 'grey900', fontWeight: 'bold' }}
                                bottom={cat.sub}
                                bottomProps={{ color: 'grey600' }}
                            />
                        }
                        right={
                            <div className="pr-4">
                               <ChevronRight size={18} className="text-slate-300" />
                            </div>
                        }
                    />
                ))}
            </div>
        </div>
    );
};

export default FeatureGrids;
