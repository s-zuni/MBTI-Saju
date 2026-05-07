import React, { useEffect, useState } from 'react';
import { supabase, ensureValidSession } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Coins, Sparkles, Check, Loader2, Zap, AlertCircle } from 'lucide-react';
import { requestPayment, Product } from '../payment';
import { COIN_PACKAGES } from '../config/creditConfig';
import { isTossApp } from '../utils/envUtils';

import type { PricingPlan } from '../hooks/useCredits';

interface PricingPageProps {
    onPurchaseSuccess?: (planId: string, pricePaid: number, credits: number, paymentId: string) => void;
    currentCredits?: number;
    session: any;
}

const PricingPage: React.FC<PricingPageProps> = ({ onPurchaseSuccess, currentCredits = 0, session: initialSession }) => {
    const navigate = useNavigate();
    const [plans, setPlans] = useState<PricingPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
    const [user, setUser] = useState<any>(null);

    const checkUser = React.useCallback(async () => {
        try {
            // Safari ITP 대응: Props로 받은 세션보다 getSession()으로 가져온 최신 세션을 우선시합니다.
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            setUser(currentSession?.user || initialSession?.user || null);
        } catch (err) {
            console.warn('[PricingPage] checkUser error:', err);
            setUser(initialSession?.user || null);
        }
    }, [initialSession]);

    const fetchPlans = React.useCallback(async () => {
        setLoading(true);
        
        const applyFallback = () => {
            const fallbackPlans: PricingPlan[] = COIN_PACKAGES.map(pkg => ({
                id: pkg.id,
                name: pkg.credits === 100 ? '프리미엄 팩' : pkg.credits === 50 ? '베이직 팩' : '스타터 팩',
                description: `${pkg.credits} 크레딧을 즉시 충전합니다.`,
                credits: pkg.credits,
                price: pkg.price,
                original_price: pkg.originalPrice,
                is_active: true,
                is_popular: pkg.credits === 50,
                sort_order: pkg.credits === 100 ? 1 : pkg.credits === 50 ? 2 : 3,
                ait_product_id: pkg.aitProductId, // ⭐️ AIT 상품 ID 매핑 추가
                created_at: new Date().toISOString()
            }));
            setPlans(fallbackPlans);
        };

        // 타임아웃 설정 (10초)
        const timeoutId = setTimeout(() => {
            if (loading && plans.length === 0) {
                console.warn('[PricingPage] Plan fetch timed out, using fallback');
                applyFallback();
                setLoading(false);
            }
        }, 10000);

        try {
            // Safari 대응: 세션 상태 조회를 비동기로 실행(기다리지 않음)
            ensureValidSession().catch(() => {});

            const { data, error } = await supabase
                .from('pricing_plans')
                .select('*')
                .eq('is_active', true)
                .order('sort_order', { ascending: true });

            if (error) throw error;
            
            if (data && data.length > 0) {
                setPlans(data);
            } else {
                applyFallback();
            }
        } catch (err) {
            console.error('[PricingPage] Error fetching plans:', err);
            applyFallback();
        } finally {
            clearTimeout(timeoutId);
            setLoading(false);
        }
    }, [loading, plans.length]);

    useEffect(() => {
        fetchPlans();
        checkUser();
    }, [fetchPlans, checkUser]);

    const getDiscountPercent = (plan: PricingPlan): number => {
        return Math.round((1 - plan.price / plan.original_price) * 100);
    };

    const handlePurchase = async (plan: PricingPlan) => {
        if (!user) {
            alert('로그인이 필요합니다.');
            return;
        }

        setSelectedPlanId(plan.id);
        setIsProcessing(true);

        try {
            // Toss Payments V2용 주문 ID 및 고객 키 생성
            const orderId = `ord_${new Date().getTime()}_${Math.random().toString(36).substring(2, 9)}`;
            const customerKey = user.id.replace(/[^a-zA-Z0-9_\-:]/g, '').substring(0, 50);

            const response = await requestPayment({
                name: `${plan.credits} 크레딧 충전`,
                amount: plan.price,
                orderId: orderId,
                customerKey: customerKey,
                customerEmail: user.email,
                customerName: user.user_metadata?.full_name || user.user_metadata?.name || '사용자',
                aitProductId: plan.ait_product_id || plan.id, // ⭐️ AIT 상품 ID 추가
                onAitGrant: async (oid, pid) => {
                    try {
                        // AIT 결제 성공 시 크레딧 지급 로직
                        if (onPurchaseSuccess) {
                            await onPurchaseSuccess(plan.id, plan.price, plan.credits, oid);
                            return true;
                        }
                        return false;
                    } catch (err) {
                        console.error('AIT Grant Error (PricingPage):', err);
                        return false;
                    }
                }
            });

            if (!response.success && response.error_msg) {
                alert(`결제 오류: ${response.error_msg}`);
            } else if (response.success && isTossApp()) {
                alert('결제가 완료되었습니다!');
                navigate('/usage-history', { replace: true });
            }
            // Toss Payments v2는 리다이렉트 방식이 기본이므로, 
            // 성공/실패 처리는 리다이렉트된 페이지(/payment/success 등)에서 수행됩니다.
        } catch (e) {
            console.error(e);
            alert('결제 처리 중 오류가 발생했습니다.');
        } finally {
            setIsProcessing(false);
            setSelectedPlanId(null);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center pt-14 md:pt-20">
                <Loader2 className="w-8 h-8 text-slate-950 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-24 md:pb-0 pt-14 md:pt-20 animate-fade-in">


            {/* Header */}
            <div className="hidden md:block bg-gradient-to-r from-amber-400 to-orange-500 text-white">
                <div className="max-w-4xl mx-auto px-4 py-12 text-center">
                    <div className="flex items-center justify-center gap-2 mb-3">
                        <Coins className="w-8 h-8" />
                        <h1 className="text-3xl font-black">요금제</h1>
                    </div>
                    <p className="text-amber-100 text-lg">크레딧을 충전하고 다양한 운세 서비스를 이용하세요</p>

                    {/* Current Balance */}
                    <div className="mt-6 inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-6 py-3 rounded-full">
                        <Zap className="w-5 h-5 text-yellow-200" />
                        <span className="font-bold">현재 보유: {currentCredits} 크레딧</span>
                    </div>
                </div>
            </div>

            {/* Mobile Balance */}
            <div className="md:hidden mx-4 mt-4 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-200" />
                    <span className="font-bold">보유 크레딧</span>
                </div>
                <span className="text-2xl font-black">{currentCredits}</span>
            </div>

            {/* Discount Banner */}
            <div className="max-w-4xl mx-auto px-4 mt-6">
                <div className="bg-gradient-to-r from-slate-800 to-slate-950 text-white rounded-2xl p-4 flex items-center gap-3">
                    <Sparkles className="w-6 h-6 text-yellow-300 animate-pulse flex-shrink-0" />
                    <span className="font-bold text-sm">🎉 3개월 특별 할인 이벤트 진행중!</span>
                </div>
            </div>

            {/* Plans Grid */}
            <div className="max-w-4xl mx-auto px-4 py-8">
                <div className="grid md:grid-cols-3 gap-4">
                    {plans.map((plan) => {
                        const discountPercent = getDiscountPercent(plan);
                        const isSelected = selectedPlanId === plan.id;

                        return (
                            <div
                                key={plan.id}
                                className={`relative bg-white rounded-2xl border-2 overflow-hidden transition-all duration-200 flex flex-col ${plan.is_popular
                                    ? 'border-amber-400 shadow-xl shadow-amber-100'
                                    : 'border-slate-200 shadow-lg shadow-slate-100'
                                    }`}
                            >
                                {plan.is_popular && (
                                    <div className="bg-gradient-to-r from-amber-400 to-orange-500 text-white text-center py-1.5 text-xs font-bold uppercase tracking-wider">
                                        🔥 가장 인기있는
                                    </div>
                                )}

                                <div className="p-6 flex-1 flex flex-col">
                                    <h3 className="text-lg font-bold text-slate-900 mb-1">{plan.name}</h3>
                                    <p className="text-sm text-slate-500 mb-4">{plan.description}</p>

                                    <div className="flex items-center gap-3 mb-2">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${plan.is_popular
                                            ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white'
                                            : 'bg-slate-100 text-slate-600'
                                            }`}>
                                            <Coins className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <span className="text-2xl font-black text-slate-900">{plan.credits}</span>
                                            <span className="text-sm text-slate-500 ml-1">크레딧</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="text-slate-400 line-through text-sm">
                                            ₩{plan.original_price.toLocaleString()}
                                        </span>
                                        <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs font-bold rounded">
                                            {discountPercent}% OFF
                                        </span>
                                    </div>

                                    <div className="text-3xl font-black text-slate-900 mb-1">
                                        ₩{plan.price.toLocaleString()}
                                    </div>
                                    <div className="text-xs text-slate-500 mb-6">
                                        크레딧당 {Math.round(plan.price / plan.credits)}원
                                    </div>

                                    <div className="mt-auto">
                                        <button
                                            onClick={() => handlePurchase(plan)}
                                            disabled={isProcessing}
                                            className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${plan.is_popular
                                                ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white hover:from-amber-500 hover:to-orange-600 shadow-md'
                                                : 'bg-slate-900 text-white hover:bg-slate-800'
                                                } ${isProcessing && isSelected ? 'opacity-70' : ''}`}
                                        >
                                            {isProcessing && isSelected ? (
                                                <><Loader2 className="w-4 h-4 animate-spin" /> 처리 중...</>
                                            ) : (
                                                <><Check className="w-4 h-4" /> 구매하기</>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            {/* Usage Flow Section */}
            <div className="max-w-4xl mx-auto px-6 py-8">
                <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
                    <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <Zap className="w-5 h-5 text-amber-500" />
                        크레딧 서비스 이용 안내
                    </h3>
                    <div className="grid md:grid-cols-3 gap-6 relative">
                        {/* Flow Steps */}
                        <div className="flex flex-col items-center text-center p-4 bg-slate-50 rounded-2xl">
                            <div className="w-10 h-10 bg-slate-950 text-white rounded-full flex items-center justify-center font-bold mb-3 shadow-md shadow-slate-200">1</div>
                            <h4 className="font-bold text-slate-800 mb-1 text-sm">회원가입/로그인</h4>
                            <p className="text-xs text-slate-500">소셜 계정으로 3초 만에 간편 가입</p>
                        </div>
                        <div className="flex flex-col items-center text-center p-4 bg-slate-50 rounded-2xl">
                            <div className="w-10 h-10 bg-slate-950 text-white rounded-full flex items-center justify-center font-bold mb-3 shadow-md shadow-slate-200">2</div>
                            <h4 className="font-bold text-slate-800 mb-1 text-sm">크레딧 충전</h4>
                            <p className="text-xs text-slate-500">원하는 패키지를 선택하여 결제</p>
                        </div>
                        <div className="flex flex-col items-center text-center p-4 bg-slate-50 rounded-2xl">
                            <div className="w-10 h-10 bg-slate-950 text-white rounded-full flex items-center justify-center font-bold mb-3 shadow-md shadow-slate-200">3</div>
                            <h4 className="font-bold text-slate-800 mb-1 text-sm">서비스 이용</h4>
                            <p className="text-xs text-slate-500">사주, MBTI, 타로 등 분석 확인</p>
                        </div>
                    </div>
                    <div className="mt-8 p-4 bg-slate-50 rounded-2xl text-xs text-slate-600 border border-slate-200">
                        <p className="font-bold text-slate-950 mb-1">💡 충전한 크레딧으로 이용 가능한 대표 서비스</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>MBTI & 사주 심층 데이터 분석 (Soul Report)</li>
                            <li>신비한 셔플 타로 (운 흐름 및 연애운 등)</li>
                            <li>맞춤형 커리어 컨설팅 및 힐링/여행지 추천</li>
                            <li>AI 전문가 심층 상담 토큰 충전</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Policy Section */}
            <div className="max-w-4xl mx-auto px-6 py-8 pb-16">
                <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
                    <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-slate-950" />
                        결제 및 환불 상세 규정
                    </h3>
                    <div className="space-y-4 text-sm text-slate-600 leading-relaxed font-medium">
                        <p>• <strong>한도 안내</strong>: 1회 결제 시 최대 충전 가능 금액은 100,000원입니다.</p>
                        <p>• <strong>환불 시점</strong>: 결제일로부터 7일 이내에 충전한 크레딧을 전혀 사용하지 않은 경우에 한하여 전액 환불 신청이 가능합니다.</p>
                        <p>• <strong>환불 수단</strong>: 환불 시 “결제에 사용된 동일 결제수단”으로 환불 처리됩니다.</p>
                        <p>• <strong>부분 환불</strong>: 일부 사용 후 잔액 환불 시, 사용한 크레딧을 당시 개별 판매가 기준으로 차감한 후 남은 금액을 환불해 드립니다. (단, 사용 직후 가치가 소멸되는 서비스는 제외)</p>
                        <p>• <strong>유효기간</strong>: 충전된 크레딧의 유효기간 및 환불 가능 기간은 <strong>결제일로부터 1년</strong>입니다. 기간 만료 시 크레딧은 자동 소멸됩니다.</p>
                        <p>• <strong>양도 제한</strong>: 충전한 크레딧은 회원 본인만 사용 가능하며, 타 계정이나 타인에게 양도 및 재판매가 불가합니다.</p>
                    </div>
                    <div className="mt-8 pt-8 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                        <p>이용 중 불편한 점이 있으시다면 언제든 고객센터로 문의해주세요.</p>
                        <button onClick={() => navigate('/support')} className="text-slate-950 font-bold hover:underline">고객센터 바로가기 &rarr;</button>
                    </div>
                </div>
            </div>
            {/* Global Footer will follow */}
        </div>
    );
};

export default PricingPage;
