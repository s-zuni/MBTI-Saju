import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import { loadPendingCheckout, clearPendingCheckout, PendingCheckout } from '../utils/pendingCheckout';
import { track } from '../utils/analytics';

interface ResumeCheckoutBannerProps {
    enabled: boolean;
    onResume: (pending: PendingCheckout) => void;
}

// 결제를 시작했지만 끝내지 못한 사용자에게 "이어서 결제" 배너를 보여준다.
const ResumeCheckoutBanner: React.FC<ResumeCheckoutBannerProps> = ({ enabled, onResume }) => {
    const location = useLocation();
    const [pending, setPending] = useState<PendingCheckout | null>(null);

    useEffect(() => {
        setPending(enabled ? loadPendingCheckout() : null);
    }, [enabled, location.pathname]);

    const hidden =
        !pending ||
        location.pathname.startsWith('/payment') ||
        location.pathname.startsWith('/admin') ||
        location.pathname.startsWith('/chat') ||
        location.pathname.startsWith('/room');
    if (hidden || !pending) return null;

    return (
        <div className="fixed left-0 right-0 bottom-20 md:bottom-6 z-[90] px-4 pointer-events-none">
            <div className="max-w-md mx-auto bg-slate-950 text-white rounded-2xl shadow-xl p-3 pl-4 flex items-center gap-3 pointer-events-auto">
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold">결제를 마치지 못하셨나요?</p>
                    <p className="text-xs text-slate-300 truncate">
                        크레딧 {pending.credits}개 · ₩{pending.price.toLocaleString()}
                    </p>
                </div>
                <button
                    onClick={() => {
                        track('checkout_resume_click', { planId: pending.planId });
                        onResume(pending);
                    }}
                    className="px-3.5 py-2 bg-white text-slate-950 rounded-xl text-xs font-bold"
                >
                    이어서 결제
                </button>
                <button
                    aria-label="닫기"
                    onClick={() => { clearPendingCheckout(); setPending(null); }}
                    className="p-1.5 text-slate-400 hover:text-white"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

export default ResumeCheckoutBanner;
