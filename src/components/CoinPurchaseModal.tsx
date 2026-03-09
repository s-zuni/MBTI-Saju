import React, { useState, useEffect } from 'react';
import { X, Coins, Sparkles, Check, Zap, Loader2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { requestPayment } from '../utils/paymentHandlers';
import type { PricingPlan } from '../hooks/useCredits';

interface CoinPurchaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    userEmail: string | undefined;
    onSuccess: (planId: string, pricePaid: number, credits: number, paymentId: string) => void;
    requiredCoins?: number;
    currentCoins?: number;
}

const CoinPurchaseModal: React.FC<CoinPurchaseModalProps> = ({
    isOpen,
    onClose,
    userEmail,
    onSuccess,
    requiredCoins,
    currentCoins = 0
}) => {
    const [plans, setPlans] = useState<PricingPlan[]>([]);
    const [plansLoading, setPlansLoading] = useState(true);
    const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchPlans();
        }
    }, [isOpen]);

    const fetchPlans = async () => {
        setPlansLoading(true);
        try {
            const { data, error } = await supabase
                .from('pricing_plans')
                .select('*')
                .eq('is_active', true)
                .order('sort_order', { ascending: true });

            if (error) throw error;
            setPlans(data || []);
        } catch (err) {
            console.error('Error fetching plans:', err);
            // Fallback to empty
            setPlans([]);
        } finally {
            setPlansLoading(false);
        }
    };

    if (!isOpen) return null;

    const needsMore = requiredCoins ? requiredCoins - currentCoins : 0;

    const handlePurchase = async (plan: PricingPlan) => {
        if (!userEmail) {
            alert('로그인이 필요합니다.');
            return;
        }

        setSelectedPlanId(plan.id);
        setIsProcessing(true);

        try {
            const orderId = `ord_${new Date().getTime()}_${Math.random().toString(36).substring(2, 9)}`;

            // 유저 ID를 기반으로 customerKey 생성 (로그인 상태여야 함)
            const { data: { user } } = await supabase.auth.getUser();
            const customerKey = user?.id.replace(/[^a-zA-Z0-9_\-:]/g, '').substring(0, 50) || 'ANONYMOUS';

            const response = await requestPayment({
                name: `크레딧 ${plan.credits}개 충전`,
                amount: plan.price,
                orderId: orderId,
                customerKey: customerKey,
                customerEmail: userEmail,
            });

            if (!response.success && response.error_msg) {
                alert(`결제 오류: ${response.error_msg}`);
            }
            // Toss Payments v2는 리다이렉트 방식이 기본이므로, 
            // 성공/실패 처리는 리다이렉트된 페이지에서 수행됩니다.
        } catch (e) {
            console.error(e);
            alert('결제 처리 중 오류가 발생했습니다.');
        } finally {
            setIsProcessing(false);
            setSelectedPlanId(null);
        }
    };

    const getDiscountPercent = (plan: PricingPlan): number => {
        return Math.round((1 - plan.price / plan.original_price) * 100);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl animate-fade-in-up">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 bg-black/5 rounded-full hover:bg-black/10 transition-colors z-10"
                >
                    <X className="w-5 h-5 text-slate-500" />
                </button>

                {/* Header */}
                <div className="bg-gradient-to-r from-amber-400 to-orange-500 p-6 text-white">
                    <div className="flex items-center gap-2 mb-2">
                        <Coins className="w-6 h-6" />
                        <h3 className="text-xl font-bold">크레딧 충전</h3>
                    </div>
                    <p className="text-amber-100 text-sm">
                        크레딧으로 다양한 운세 서비스를 이용하세요
                    </p>

                    {/* Discount Banner */}
                    <div className="mt-4 bg-white/20 backdrop-blur-sm rounded-xl p-3 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-yellow-200 animate-pulse" />
                        <span className="text-sm font-bold">
                            🎉 3개월 특별 할인 이벤트 진행중!
                        </span>
                    </div>
                </div>

                {/* Coin Shortage Warning */}
                {requiredCoins && needsMore > 0 && (
                    <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-100 rounded-xl">
                        <p className="text-sm text-red-600 font-medium">
                            💡 이 서비스 이용에 <span className="font-bold">{requiredCoins}크레딧</span>이 필요합니다.
                            현재 {currentCoins}크레딧 보유 중 (<span className="font-bold">{needsMore}크레딧</span> 부족)
                        </p>
                    </div>
                )}

                {/* Packages */}
                <div className="p-6 space-y-3">
                    {plansLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
                        </div>
                    ) : plans.length === 0 ? (
                        <p className="text-center text-slate-500 py-8">요금제를 불러올 수 없습니다.</p>
                    ) : (
                        plans.map((plan) => {
                            const discountPercent = getDiscountPercent(plan);
                            const isSelected = selectedPlanId === plan.id;
                            const meetsRequirement = requiredCoins ? (currentCoins + plan.credits >= requiredCoins) : true;

                            return (
                                <button
                                    key={plan.id}
                                    onClick={() => handlePurchase(plan)}
                                    disabled={isProcessing}
                                    className={`
                                        w-full p-4 rounded-2xl border-2 transition-all duration-200
                                        flex items-center justify-between group
                                        ${plan.is_popular
                                            ? 'border-amber-400 bg-amber-50 hover:bg-amber-100'
                                            : 'border-slate-200 bg-white hover:border-amber-300 hover:bg-amber-50/50'
                                        }
                                        ${isProcessing && isSelected ? 'opacity-70' : ''}
                                        ${meetsRequirement && requiredCoins ? 'ring-2 ring-green-400 ring-offset-1' : ''}
                                    `}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`
                                            w-12 h-12 rounded-xl flex items-center justify-center
                                            ${plan.is_popular
                                                ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white'
                                                : 'bg-slate-100 text-slate-600'
                                            }
                                        `}>
                                            <Coins className="w-6 h-6" />
                                        </div>
                                        <div className="text-left">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-slate-900">{plan.credits} 크레딧</span>
                                                {plan.is_popular && (
                                                    <span className="px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full animate-pulse">
                                                        BEST
                                                    </span>
                                                )}
                                                {meetsRequirement && requiredCoins && (
                                                    <Check className="w-4 h-4 text-green-500" />
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-slate-400 text-sm line-through">
                                                    ₩{plan.original_price.toLocaleString()}
                                                </span>
                                                <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded">
                                                    {discountPercent}% OFF
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <div className="text-lg font-bold text-slate-900">
                                            ₩{plan.price.toLocaleString()}
                                        </div>
                                        <div className="text-[11px] text-slate-500">
                                            {Math.round(plan.price / plan.credits)}원/크레딧
                                        </div>
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>

                {/* Current Balance & Policy */}
                <div className="px-6 pb-6 space-y-3">
                    <div className="flex items-center justify-center gap-2 p-3 bg-slate-50 rounded-xl">
                        <Zap className="w-4 h-4 text-amber-500" />
                        <span className="text-sm text-slate-600">
                            현재 보유: <span className="font-bold text-slate-900">{currentCoins} 크레딧</span>
                        </span>
                    </div>

                    <p className="text-[10px] text-slate-400 text-center leading-relaxed">
                        • 크레딧 유효기간/환불 기간: 결제일로부터 1년 <br />
                        • 미사용분에 한해 7일 내 전액 환불 가능 (본인만 사용 가능)
                    </p>
                </div>
            </div>
        </div>
    );
};

export default CoinPurchaseModal;
