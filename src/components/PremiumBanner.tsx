import React from 'react';
import { Crown, X } from 'lucide-react';
import { Tier } from '../hooks/useSubscription';

interface PremiumBannerProps {
    isVisible: boolean;
    onClose: () => void;
    onCheckPlans: () => void;
    tier: Tier;
}

const PremiumBanner: React.FC<PremiumBannerProps> = ({ isVisible, onClose, onCheckPlans, tier }) => {
    // Don't show if already premium (Basic or Deep) or explicit close
    if (!isVisible || tier !== 'free') return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-3xl z-40 animate-fade-in-up">
            <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl p-4 shadow-2xl border border-slate-700 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0 shadow-lg shadow-orange-500/20">
                        <Crown className="w-5 h-5 text-white fill-white" />
                    </div>
                    <div>
                        <p className="text-white font-bold text-sm md:text-base">
                            더 정확한 분석이 필요하신가요?
                        </p>
                        <p className="text-slate-400 text-xs md:text-sm">
                            월 5,900원으로 AI 심층 분석을 잠금 해제하세요.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={onCheckPlans}
                        className="bg-white text-slate-900 px-4 py-2 rounded-lg font-bold text-sm hover:bg-slate-100 transition-colors whitespace-nowrap"
                    >
                        업그레이드
                    </button>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-white/10 rounded-full text-slate-400 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PremiumBanner;
