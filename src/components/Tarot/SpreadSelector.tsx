import React from 'react';
import { Target, Heart, Briefcase, Sparkles, Lock } from 'lucide-react';
import { Tier, TIERS } from '../../hooks/useSubscription';

export type SpreadType = 'daily' | 'love' | 'career' | 'celtic';

interface SpreadOption {
    id: SpreadType;
    title: string;
    description: string;
    icon: React.ElementType;
    cardCount: number;
    requiredTier: Tier;
}

const SPREADS: SpreadOption[] = [
    {
        id: 'daily',
        title: '오늘의 운세',
        description: '하루를 시작하는 가벼운 조언 (1장)',
        icon: Sparkles,
        cardCount: 1,
        requiredTier: TIERS.FREE
    },
    {
        id: 'love',
        title: '연애 고민',
        description: '그 사람의 마음과 우리의 미래 (3장)',
        icon: Heart,
        cardCount: 3,
        requiredTier: TIERS.FREE
    },
    {
        id: 'career',
        title: '취업/이직',
        description: '나의 진로와 성공 가능성 (3장)',
        icon: Briefcase,
        cardCount: 3,
        requiredTier: TIERS.FREE
    },
    {
        id: 'celtic',
        title: '켈트 십자 배열',
        description: '심도 있는 운명의 흐름 분석 (10장)',
        icon: Target,
        cardCount: 10,
        requiredTier: TIERS.DEEP
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
            <h2 className="text-2xl font-bold text-center text-white mb-8">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-200 to-indigo-200">
                    어떤 조언이 필요하신가요?
                </span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {SPREADS.map((spread) => {
                    const locked = isLocked(spread.requiredTier);

                    return (
                        <button
                            key={spread.id}
                            onClick={() => locked ? onUpgradeRequired() : onSelect(spread.id)}
                            className={`relative group p-6 rounded-2xl border transition-all duration-300 text-left
                                ${locked
                                    ? 'bg-slate-800/50 border-slate-700 opacity-70'
                                    : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-indigo-400/50 hover:shadow-[0_0_20px_rgba(99,102,241,0.3)]'
                                }
                            `}
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className={`p-3 rounded-xl ${locked ? 'bg-slate-700' : 'bg-indigo-500/20 text-indigo-300'}`}>
                                    <spread.icon className="w-6 h-6" />
                                </div>
                                {locked && (
                                    <div className="flex items-center gap-1 bg-slate-900/80 px-2 py-1 rounded text-xs font-bold text-slate-400 border border-slate-700">
                                        <Lock className="w-3 h-3" />
                                        <span>DEEP</span>
                                    </div>
                                )}
                            </div>

                            <h3 className={`text-lg font-bold mb-1 ${locked ? 'text-slate-400' : 'text-white group-hover:text-indigo-200'}`}>
                                {spread.title}
                            </h3>
                            <p className="text-sm text-slate-400">{spread.description}</p>

                            {!locked && (
                                <div className="absolute inset-0 rounded-2xl ring-2 ring-indigo-500/0 group-hover:ring-indigo-500/50 transition-all duration-500"></div>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default SpreadSelector;
