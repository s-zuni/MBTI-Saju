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
    debugInfo: {
        phase: string;
        purchaseCount: number;
        profileCredits: number;
        lastRefresh: string;
        error?: string;
        host?: string;
        urlStatus?: string;
        authStatus?: string;
    } | undefined;
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
    const [debugInfo, setDebugInfo] = useState<UseCreditsReturn['debugInfo']>();

    // 사용 가능한 크레딧 합계 조회 (active 상태 구매건만)
    const refreshCredits = useCallback(async () => {
        let currentUserId = session?.user?.id;

        // 1. Initial State Trace
        setDebugInfo({
            phase: '1. 세션 확인 시작',
            purchaseCount: 0,
            profileCredits: 0,
            lastRefresh: new Date().toLocaleTimeString(),
            host: window.location.host,
            urlStatus: (process.env.REACT_APP_SUPABASE_URL || 'missing').substring(0, 15) + '...',
            authStatus: session ? 'Session 존재 (Props)' : 'Session 없음 (Props)'
        });

        // Double check session if not provided (important for mobile tab recovery)
        if (!currentUserId) {
            try {
                // geUser() is more rigorous than getSession() as it verifies with the server
                // We try getSession first as it's faster, then getUser as fallback.
                const { data: { session: currentSession }, error: sessErr } = await supabase.auth.getSession();
                if (sessErr) throw sessErr;
                
                if (currentSession) {
                    currentUserId = currentSession.user.id;
                    setDebugInfo(prev => ({ ...prev!, authStatus: 'getSession 성공' }));
                } else {
                    const { data: { user }, error: userErr } = await supabase.auth.getUser();
                    if (userErr) throw userErr;
                    currentUserId = user?.id;
                    setDebugInfo(prev => ({ ...prev!, authStatus: currentUserId ? 'getUser 성공' : '유저 정보 없음' }));
                }
            } catch (authErr: any) {
                setDebugInfo(prev => ({ ...prev!, phase: '에러: 세션 확인 실패', authStatus: '에러', error: authErr.message }));
            }
        } else {
            // Even if we have ID, verify user state once for Safari context
            supabase.auth.getSession().then(({ data }) => {
                if (data.session) setDebugInfo(prev => ({ ...prev!, authStatus: '세션 유효성 확인됨' }));
            }).catch(() => {});
        }

        if (!currentUserId) {
            // Safari ITP Fallback: If still no user, wait 1s and try one last time
            await new Promise(resolve => setTimeout(resolve, 1000));
            const { data: { session: finalSession } } = await supabase.auth.getSession();
            currentUserId = finalSession?.user?.id;
            
            if (!currentUserId) {
                setCredits(0);
                setPurchases([]);
                setLoading(false);
                setDebugInfo(prev => ({ ...prev!, phase: '종료: 유저 ID 최종 없음' }));
                return;
            }
        }

        try {
            setLoading(true);
            setDebugInfo(prev => ({ ...prev!, phase: '2. 통합 정보(RPC) 조회 중 (Wait 30s...)' }));
            
            // Single RPC call to skip multiple round-trips (Critical for mobile)
            const fetchSummary = async () => {
                const { data, error } = await supabase.rpc('get_user_available_credits_v2', {
                    p_user_id: currentUserId
                });
                if (error) throw error;
                return data;
            };

            // Increased timeout to 30s for slow mobile networks
            const queryTimeout = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('통합 정보 조회 타임아웃 (30초 초과)')), 30000)
            );

            const result = await Promise.race([fetchSummary(), queryTimeout]) as any;

            if (!result) throw new Error('조회 결과가 없습니다.');

            const activePurchases = (result.purchases || []) as CreditPurchase[];

            setPurchases(activePurchases);
            // profiles.credits 테이블이 전체 누적 크레딧(무료+결제)을 담고 있는 단일 소스이므로
            // totalPurchaseCredits와 합산하지 않고, 오직 profile_credits 만을 기준으로 UI를 업데이트합니다.
            // (만약 activePurchases.reduce를 사용하면 회원가입 시 지급된 25크레딧 등 무료 크레딧이 누락됩니다)
            const actualTotalCredits = result.profile_credits ?? 0;
            setCredits(actualTotalCredits);

            setDebugInfo({
                phase: '4. 조회 완료(RPC)',
                purchaseCount: activePurchases.length,
                profileCredits: actualTotalCredits,
                lastRefresh: new Date().toLocaleTimeString(),
                host: window.location.host,
                urlStatus: (process.env.REACT_APP_SUPABASE_URL || 'N/A').substring(0, 15) + '...',
                authStatus: '성공'
            });
        } catch (err: any) {
            console.error('Error fetching credits via RPC:', err);
            setDebugInfo(prev => ({ ...prev!, phase: '에러: 조회 실패', error: err.message || JSON.stringify(err) }));
        } finally {
            setLoading(false);
        }
    }, [session]);

    useEffect(() => {
        refreshCredits();

        // Window focus listener to refresh credits (important for Safari/mobile coming back from background)
        const handleFocus = () => {
            console.log('Window focused, refreshing credits...');
            refreshCredits();
        };
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
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

            // 3. 로컬 상태 업데이트 (Optimistic Update)
            setCredits(prev => Math.max(0, prev - cost));
            
            // 4. 서버 데이터와 최종 동기화 (Force Refresh)
            await refreshCredits();
            console.log('Credit deduction & refresh completed');
            return true;
        } catch (err: any) {
            console.error('Error using credits:', err);
            alert(`크레딧 사용 중 오류가 발생했습니다: ${err.message || '네트워크 상태를 확인해주세요.'}`);
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
        debugInfo,
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
