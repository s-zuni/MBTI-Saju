import React from 'react';
import { Coins, X } from 'lucide-react';

interface PremiumBannerProps {
    isVisible: boolean;
    onClose: () => void;
    onCheckPlans: () => void;
    currentCredits?: number;
}

const PremiumBanner: React.FC<PremiumBannerProps> = ({ isVisible, onClose, onCheckPlans, currentCredits = 0 }) => {
    // Don't show if user has enough credits or explicit close
    if (!isVisible || currentCredits >= 50) return null;

    return (
        <div className="fixed bottom-20 left-4 right-4 md:bottom-4 md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-3xl z-40 animate-fade-in-up">
            <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl p-4 shadow-2xl border border-slate-700 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0 shadow-lg shadow-orange-500/20">
                        <Coins className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <p className="text-white font-bold text-sm md:text-base">
                            크레딧이 부족하신가요?
                        </p>
                        <p className="text-slate-400 text-xs md:text-sm">
                            크레딧을 충전하고 <span className="text-amber-400 font-bold">AI 심층 분석</span>을 받아보세요!
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={onCheckPlans}
                        className="bg-gradient-to-r from-amber-400 to-orange-500 text-white px-4 py-2 rounded-lg font-bold text-sm hover:from-amber-500 hover:to-orange-600 transition-colors whitespace-nowrap"
                    >
                        크레딧 충전
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
