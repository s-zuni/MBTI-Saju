import React from 'react';
import { Sun, HeartHandshake, Trophy, Lock, Sparkles } from 'lucide-react';
import { Tier, TIERS } from '../../hooks/useSubscription';

export type SpreadType = 'daily' | 'love' | 'career';

interface SpreadOption {
    id: SpreadType;
    title: string;
    description: string;
    icon: React.ElementType;
    cardCount: number;
    requiredTier: Tier;
    color: string;
}

const SPREADS: SpreadOption[] = [
    {
        id: 'daily',
        title: '오늘의 운세',
        description: '하루를 시작하는 태양의 조언 (1장)',
        icon: Sun,
        cardCount: 1,
        requiredTier: TIERS.FREE,
        color: 'from-amber-100 to-orange-50'
    },
    {
        id: 'love',
        title: '연애 고민',
        description: '그 사람의 진심과 우리의 인연 (3장)',
        icon: HeartHandshake,
        cardCount: 3,
        requiredTier: TIERS.FREE,
        color: 'from-rose-100 to-pink-50'
    },
    {
        id: 'career',
        title: '취업/이직',
        description: '나의 잠재력과 성공의 열쇠 (3장)',
        icon: Trophy,
        cardCount: 3,
        requiredTier: TIERS.FREE,
        color: 'from-blue-100 to-indigo-50'
    }
];

interface SpreadSelectorProps {
    onSelect: (spread: SpreadType) => void;
    tier: Tier;
    onUpgradeRequired: () => void;
}

const SpreadSelector: React.FC<SpreadSelectorProps> = ({ onSelect, tier, onUpgradeRequired }) => {

    const isLocked = (requiredTier: Tier) => {
        if (requiredTier === TIERS.FREE) return false;
        if (requiredTier === TIERS.BASIC) return tier === TIERS.FREE;
        if (requiredTier === TIERS.DEEP) return tier === TIERS.FREE || tier === TIERS.BASIC;
        return false;
    };

    return (
        <div className="w-full max-w-4xl mx-auto p-4 animate-fade-in">
            <div className="text-center mb-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-500 text-[10px] font-black tracking-widest uppercase mb-3">
                    <Sparkles className="w-3 h-3" /> Tarot Oracle
                </div>
                <h2 className="text-3xl font-black text-slate-900">
                    어떤 조언이 필요하신가요?
                </h2>
                <p className="text-slate-400 text-sm mt-3 font-medium">당신의 에너지가 이끌리는 주제를 선택해주세요</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {SPREADS.map((spread) => {
                    const locked = isLocked(spread.requiredTier);

                    return (
                        <button
                            key={spread.id}
                            onClick={() => locked ? onUpgradeRequired() : onSelect(spread.id)}
                            className={`relative group p-8 rounded-[2.5rem] border transition-all duration-500 text-center flex flex-col items-center
                                ${locked
                                    ? 'bg-slate-50 border-slate-200 opacity-60'
                                    : `bg-white border-slate-100 hover:border-indigo-200 hover:shadow-[0_20px_40px_rgba(99,102,241,0.08)] hover:-translate-y-1`
                                }
                            `}
                        >
                            <div className={`w-16 h-16 rounded-3xl bg-gradient-to-br ${spread.color} flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform duration-500`}>
                                <spread.icon className="w-7 h-7 text-slate-800" />
                            </div>

                            {locked && (
                                <div className="absolute top-4 right-4 flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-full text-[10px] font-black text-slate-400 border border-slate-200">
                                    <Lock className="w-3 h-3" />
                                    <span>DEEP</span>
                                </div>
                            )}

                            <h3 className={`text-xl font-black mb-2 ${locked ? 'text-slate-400' : 'text-slate-900'}`}>
                                {spread.title}
                            </h3>
                            <p className="text-sm text-slate-400 leading-relaxed font-medium break-keep">{spread.description}</p>

                            {!locked && (
                                <div className="mt-6 w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-indigo-600 transition-colors">
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-white"></div>
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default SpreadSelector;
