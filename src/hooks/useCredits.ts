import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Session } from '@supabase/supabase-js';
import { SERVICE_COSTS, ServiceType, REFUND_PERIOD_DAYS } from '../config/creditConfig';

export interface CreditPurchase {
    id: string;
    user_id: string;
    plan_id: string | null;
    purchased_credits: number;
    remaining_credits: number;
    price_paid: number;
    payment_id: string | null;
    status: 'active' | 'pending_refund' | 'refunded';
    purchased_at: string;
    refund_requested_at: string | null;
}

export interface CreditUsage {
    id: string;
    user_id: string;
    purchase_id: string;
    credits_used: number;
    service_type: string;
    used_at: string;
}

export interface PricingPlan {
    id: string;
    name: string;
    credits: number;
    price: number;
    original_price: number;
    description: string | null;
    is_popular: boolean;
    sort_order: number;
    is_active: boolean;
}

interface UseCreditsReturn {
    credits: number;
    loading: boolean;
    purchases: CreditPurchase[];
    refreshCredits: () => Promise<void>;
    useCredits: (serviceType: ServiceType) => Promise<boolean>;
    purchaseCredits: (planId: string, pricePaid: number, credits: number, paymentId?: string) => Promise<boolean>;
    checkSufficientCredits: (serviceType: ServiceType) => boolean;
    getCost: (serviceType: ServiceType) => number;
    requestRefund: (purchaseId: string) => Promise<{ success: boolean; error?: string }>;
    getPurchases: () => Promise<CreditPurchase[]>;
    getUsageHistory: () => Promise<CreditUsage[]>;
}

export const useCredits = (session: Session | null): UseCreditsReturn => {
    const [credits, setCredits] = useState<number>(0);
    const [loading, setLoading] = useState(true);
    const [purchases, setPurchases] = useState<CreditPurchase[]>([]);

    // 사용 가능한 크레딧 합계 조회 (active 상태 구매건만)
    const refreshCredits = useCallback(async () => {
        let currentUserId = session?.user?.id;

        // Double check session if not provided (important for mobile tab recovery)
        if (!currentUserId) {
            const { data: { session: activeSession } } = await supabase.auth.getSession();
            currentUserId = activeSession?.user?.id;
        }

        if (!currentUserId) {
            setCredits(0);
            setPurchases([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            // credit_purchases에서 remaining_credits 합계 조회
            const { data, error } = await supabase
                .from('credit_purchases')
                .select('*')
                .eq('user_id', currentUserId)
                .eq('status', 'active')
                .gt('remaining_credits', 0)
                .order('purchased_at', { ascending: true });

            if (error) throw error;

            const activePurchases = (data || []) as CreditPurchase[];
            setPurchases(activePurchases);
            const totalCredits = activePurchases.reduce((sum, p) => sum + p.remaining_credits, 0);

            // profiles 테이블도 함께 조회하여 합산
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('credits')
                .eq('id', currentUserId);

            let profileCredits = 0;
            if (profileError) {
                console.error('Error fetching profile for credits:', profileError);
            } else if (profileData && profileData.length > 0) {
                profileCredits = profileData[0]?.credits ?? 0;
            }

            setCredits(totalCredits + profileCredits);
        } catch (err) {
            console.error('Error fetching credits:', err);
            // Don't reset to 0 immediately on transient network errors on mobile
        } finally {
            setLoading(false);
        }
    }, [session]);

    useEffect(() => {
        refreshCredits();
    }, [refreshCredits]);

    const getCost = useCallback((serviceType: ServiceType): number => {
        return SERVICE_COSTS[serviceType];
    }, []);

    const checkSufficientCredits = useCallback((serviceType: ServiceType): boolean => {
        const cost = getCost(serviceType);
        return credits >= cost;
    }, [credits, getCost]);

    // FIFO 크레딧 사용 (RPC 전환)
    const useCreditsFunc = useCallback(async (serviceType: ServiceType): Promise<boolean> => {
        if (!session?.user?.id) return false;

        const cost = getCost(serviceType);
        if (cost === 0) return true;
        if (credits < cost) return false;

        try {
            // 서버 사이드 RPC 호출로 원자적 차감 수행
            const { data, error } = await supabase.rpc('deduct_credits', {
                p_user_id: session.user.id,
                p_service_type: serviceType,
                p_cost: cost
            });

            if (error) {
                console.error('RPC Error during credit deduction:', error);
                return false;
            }

            if (data && data.success === false) {
                console.error('Credit deduction failed:', data.error);
                return false;
            }

            // 3. 로컬 상태 업데이트
            setCredits(prev => prev - cost);
            await refreshCredits();
            return true;
        } catch (err) {
            console.error('Error using credits:', err);
            return false;
        }
    }, [session, credits, getCost, refreshCredits]);

    // 크레딧 구매
    const purchaseCredits = useCallback(async (
        planId: string,
        pricePaid: number,
        creditAmount: number,
        paymentId?: string
    ): Promise<boolean> => {
        if (!session?.user?.id) return false;

        try {
            const { error } = await supabase
                .from('credit_purchases')
                .insert({
                    user_id: session.user.id,
                    plan_id: planId,
                    purchased_credits: creditAmount,
                    remaining_credits: creditAmount,
                    price_paid: pricePaid,
                    payment_id: paymentId || null,
                    status: 'active',
                });

            if (error) throw error;

            await refreshCredits();
            return true;
        } catch (err) {
            console.error('Error purchasing credits:', err);
            return false;
        }
    }, [session, refreshCredits]);

    // 환불 요청
    const requestRefund = useCallback(async (
        purchaseId: string
    ): Promise<{ success: boolean; error?: string }> => {
        if (!session?.user?.id) return { success: false, error: '로그인이 필요합니다.' };

        try {
            // 1. 구매건 조회
            const { data: purchase, error: fetchError } = await supabase
                .from('credit_purchases')
                .select('*')
                .eq('id', purchaseId)
                .eq('user_id', session.user.id)
                .single();

            if (fetchError || !purchase) {
                return { success: false, error: '구매건을 찾을 수 없습니다.' };
            }

            // 2. 환불 조건 검증
            if (purchase.status !== 'active') {
                return { success: false, error: '이미 처리된 구매건입니다.' };
            }

            if (purchase.remaining_credits !== purchase.purchased_credits) {
                return { success: false, error: '이미 사용된 크레딧이 있어 환불이 불가능합니다.' };
            }

            const purchasedAt = new Date(purchase.purchased_at);
            const now = new Date();
            const daysSincePurchase = Math.floor((now.getTime() - purchasedAt.getTime()) / (1000 * 60 * 60 * 24));

            if (daysSincePurchase > REFUND_PERIOD_DAYS) {
                return { success: false, error: `구매 후 ${REFUND_PERIOD_DAYS}일이 지나 환불이 불가능합니다.` };
            }

            // 3. 상태 변경
            const { error: updateError } = await supabase
                .from('credit_purchases')
                .update({
                    status: 'pending_refund',
                    refund_requested_at: new Date().toISOString(),
                })
                .eq('id', purchaseId);

            if (updateError) throw updateError;

            await refreshCredits();
            return { success: true };
        } catch (err: any) {
            console.error('Error requesting refund:', err);
            return { success: false, error: err.message || '환불 요청 중 오류가 발생했습니다.' };
        }
    }, [session, refreshCredits]);

    // 전체 구매 내역 조회 (모든 상태)
    const getPurchases = useCallback(async (): Promise<CreditPurchase[]> => {
        if (!session?.user?.id) return [];

        try {
            const { data, error } = await supabase
                .from('credit_purchases')
                .select('*')
                .eq('user_id', session.user.id)
                .order('purchased_at', { ascending: false });

            if (error) throw error;
            return (data || []) as CreditPurchase[];
        } catch (err) {
            console.error('Error fetching purchases:', err);
            return [];
        }
    }, [session]);

    // 사용 내역 조회
    const getUsageHistory = useCallback(async (): Promise<CreditUsage[]> => {
        if (!session?.user?.id) return [];

        try {
            const { data, error } = await supabase
                .from('credit_usages')
                .select('*')
                .eq('user_id', session.user.id)
                .order('used_at', { ascending: false });

            if (error) throw error;
            return (data || []) as CreditUsage[];
        } catch (err) {
            console.error('Error fetching usage history:', err);
            return [];
        }
    }, [session]);

    return {
        credits,
        loading,
        purchases,
        refreshCredits,
        useCredits: useCreditsFunc,
        purchaseCredits,
        checkSufficientCredits,
        getCost,
        requestRefund,
        getPurchases,
        getUsageHistory,
    };
};
