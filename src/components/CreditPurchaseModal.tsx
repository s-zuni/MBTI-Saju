import React, { useState, useEffect } from 'react';
import { X, Coins, Zap, Loader2, ChevronDown, ShieldCheck, RotateCcw } from 'lucide-react';
import { track } from '../utils/analytics';
import { savePendingCheckout } from '../utils/pendingCheckout';
import { supabase, ensureValidSession } from '../supabaseClient';
import { requestPayment } from '../payment';
import type { PricingPlan } from '../hooks/useCredits';
import { COIN_PACKAGES } from '../config/creditConfig';

interface CreditPurchaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    userEmail: string | undefined;
    onSuccess: (planId: string, pricePaid: number, credits: number, paymentId: string) => void;
    requiredCredits?: number;
    currentCredits?: number;
    resumePlanId?: string;
}

const CreditPurchaseModal: React.FC<CreditPurchaseModalProps> = ({
    isOpen,
    onClose,
    userEmail,
    onSuccess,
    requiredCredits,
    currentCredits = 0,
    resumePlanId,
}) => {
    const [plans, setPlans] = useState<PricingPlan[]>([]);
    const [showAll, setShowAll] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setShowAll(false);
            track('credit_modal_open', { required: requiredCredits ?? null, current: currentCredits });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);
    const plansRef = React.useRef<PricingPlan[]>([]);
    
    // plans state가 변경될 때마다 ref 업데이트
    useEffect(() => {
        plansRef.current = plans;
    }, [plans]);

    const [plansLoading, setPlansLoading] = useState(true);
    const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        let isMounted = true;
        
        const fetchPlans = async () => {
            if (!isOpen) return;
            
            setPlansLoading(true);
            console.log('[CreditPurchaseModal] Fetching plans started...');
            
            // ⭐️ Task 1: 폴백 함수 정의 (중복 제거)
            const applyFallback = () => {
                const fallbackPlans: PricingPlan[] = COIN_PACKAGES.map(pkg => ({
                    id: pkg.id,
                    name: pkg.credits === 100 ? '프리미엄 팩' : pkg.credits === 50 ? '베이직 팩' : '스타터 팩',
                    description: `${pkg.credits} 크레딧 충전 (로컬 폴백)`,
                    credits: pkg.credits,
                    price: pkg.price,
                    original_price: pkg.originalPrice,
                    is_active: true,
                    is_popular: pkg.credits === 50,
                    sort_order: pkg.credits === 100 ? 1 : pkg.credits === 50 ? 2 : 3,
                    created_at: new Date().toISOString()
                }));
                if (isMounted) setPlans(fallbackPlans);
            };

            // Safari 대응: 타임아웃 넉넉히 설정 (10초 후에는 무조건 폴백 적용)
            const timeoutId = setTimeout(() => {
                // Dependency Array 관련 ESLint 에러 방지를 위해 ref 사용
                if (isMounted && plansRef.current.length === 0) {
                    console.warn('[CreditPurchaseModal] Fetching plans timed out (10s), applying fallback');
                    applyFallback();
                    setPlansLoading(false);
                }
            }, 10000);

            try {
                // ⭐️ Task 1: 세션 체크를 비동기로 별도 실행하여 요금제 조회를 방해하지 않게 함
                // auth.getSession()이 Safari에서 무한 Pending 되더라도 나머지 로직은 진행됩니다.
                ensureValidSession().catch(() => {});
                
                // 요금제 조회 (Public)
                const { data, error } = await supabase
                    .from('pricing_plans')
                    .select('*')
                    .eq('is_active', true)
                    .order('sort_order', { ascending: true });

                if (error) throw error;
                
                if (isMounted) {
                    if (data && data.length > 0) {
                        setPlans(data);
                    } else {
                        console.log('[CreditPurchaseModal] DB plans empty, applying fallback');
                        applyFallback();
                    }
                }
            } catch (err) {
                console.error('[CreditPurchaseModal] Error fetching plans:', err);
                if (isMounted) {
                    applyFallback();
                }
            } finally {
                clearTimeout(timeoutId);
                if (isMounted) setPlansLoading(false);
            }
        };

        if (isOpen) {
            fetchPlans();
        }

        return () => {
            isMounted = false;
        };
    }, [isOpen]);

    // ESC 키로 닫기
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            window.addEventListener('keydown', handleEsc);
        }
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);


    if (!isOpen) return null;

    const needsMore = requiredCredits ? requiredCredits - currentCredits : 0;

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

            // 이탈 복구용: 결제창을 열기 전에 선택한 상품을 기억해 둔다 (성공 시 PaymentSuccess에서 삭제)
            savePendingCheckout({ planId: plan.id, credits: plan.credits, price: plan.price });
            track('checkout_start', { planId: plan.id, price: plan.price, credits: plan.credits });

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

    // 추천 상품 1개: 이어서 결제 > 필요한 크레딧을 채우는 가장 저렴한 팩 > 인기 팩 > 첫 번째
    const byPrice = [...plans].sort((a, b) => a.price - b.price);
    const recommended: PricingPlan | undefined =
        plans.find((p) => p.id === resumePlanId) ||
        (requiredCredits
            ? byPrice.find((p) => currentCredits + p.credits >= requiredCredits) || byPrice[byPrice.length - 1]
            : plans.find((p) => p.is_popular) || plans[0]);
    const others = plans.filter((p) => p.id !== recommended?.id);

    const renderPlan = (plan: PricingPlan, isRecommended: boolean) => {
        const discountPercent = getDiscountPercent(plan);
        const isSelected = selectedPlanId === plan.id;
        return (
            <button
                key={plan.id}
                onClick={() => handlePurchase(plan)}
                disabled={isProcessing}
                className={`
                    w-full p-4 rounded-2xl border-2 transition-all duration-200 flex items-center justify-between
                    ${isRecommended ? 'border-amber-400 bg-amber-50 hover:bg-amber-100' : 'border-slate-200 bg-white hover:border-amber-300'}
                    ${isProcessing && isSelected ? 'opacity-70' : ''}
                `}
            >
                <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isRecommended ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        {isProcessing && isSelected ? <Loader2 className="w-6 h-6 animate-spin" /> : <Coins className="w-6 h-6" />}
                    </div>
                    <div className="text-left">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{plan.credits} 크레딧</span>
                            {isRecommended && (
                                <span className="px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full">추천</span>
                            )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-slate-400 text-sm line-through">₩{plan.original_price.toLocaleString()}</span>
                            <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded">{discountPercent}% OFF</span>
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-lg font-bold text-slate-900">₩{plan.price.toLocaleString()}</div>
                    <div className="text-[11px] text-slate-500">{Math.round(plan.price / plan.credits)}원/크레딧</div>
                </div>
            </button>
        );
    };

    return (
        <div className="fixed inset-0 z-[1050] flex items-end sm:items-center justify-center sm:p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            {/* 모바일: 하단 시트 / 데스크톱: 중앙 모달 */}
            <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl animate-fade-in-up max-h-[92vh] overflow-y-auto">
                <button
                    onClick={onClose}
                    aria-label="닫기"
                    className="absolute top-4 right-4 p-2 bg-black/5 rounded-full hover:bg-black/10 transition-colors z-10"
                >
                    <X className="w-5 h-5 text-slate-500" />
                </button>

                {/* Header */}
                <div className="bg-gradient-to-r from-amber-400 to-orange-500 p-6 text-white">
                    <div className="flex items-center gap-2 mb-1">
                        <Coins className="w-6 h-6" />
                        <h3 className="text-xl font-bold">
                            {requiredCredits && needsMore > 0 ? `${needsMore}크레딧만 더 있으면 볼 수 있어요` : '크레딧 충전'}
                        </h3>
                    </div>
                    <p className="text-amber-100 text-sm">
                        현재 보유 {currentCredits}크레딧{requiredCredits ? ` · 이 서비스 ${requiredCredits}크레딧 필요` : ''}
                    </p>
                </div>

                {/* Packages */}
                <div className="p-6 space-y-3">
                    {plansLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
                        </div>
                    ) : !recommended ? (
                        <p className="text-center text-slate-500 py-8">요금제를 불러올 수 없습니다.</p>
                    ) : (
                        <>
                            {renderPlan(recommended, true)}
                            {others.length > 0 && (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => setShowAll((v) => !v)}
                                        className="w-full flex items-center justify-center gap-1 text-sm font-semibold text-slate-500 py-1"
                                    >
                                        {showAll ? '다른 팩 접기' : '다른 팩 보기'}
                                        <ChevronDown className={`w-4 h-4 transition-transform ${showAll ? 'rotate-180' : ''}`} />
                                    </button>
                                    {showAll && others.map((p) => renderPlan(p, false))}
                                </>
                            )}
                        </>
                    )}
                </div>

                {/* Trust & Policy */}
                <div className="px-6 pb-6">
                    <ul className="space-y-2 p-4 bg-slate-50 rounded-2xl text-xs text-slate-600">
                        <li className="flex items-start gap-2">
                            <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                            <span>토스페이먼츠 안전 결제 (카드 정보는 서비스에 저장되지 않아요)</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <Zap className="w-4 h-4 text-amber-500 flex-shrink-0" />
                            <span>결제 완료 후 크레딧이 바로 충전돼요</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <RotateCcw className="w-4 h-4 text-sky-500 flex-shrink-0" />
                            <span>미사용 크레딧은 결제 후 7일 내 전액 환불 (본인만 사용 가능, 유효기간 1년)</span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default CreditPurchaseModal;
