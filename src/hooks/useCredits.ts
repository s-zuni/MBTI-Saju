import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase, ensureValidSession } from '../supabaseClient';
import { Session } from '@supabase/supabase-js';
import { SERVICE_COSTS, ServiceType, REFUND_PERIOD_DAYS } from '../config/creditConfig';
import { onTokenRefreshed } from './useAuth';

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

// RPC 호출 함수 (재시도 로직 포함 - Hook 외부로 이동하여 의존성 경고 방지)
const fetchCreditsViaRPC = async (userId: string, retryCount = 0): Promise<any> => {
    const { data, error } = await supabase.rpc('get_user_available_credits_v2', {
        p_user_id: userId
    });

    if (error) {
        // 인증 오류(JWT 만료 등)인 경우 토큰 갱신 후 1회 재시도
        const isAuthError = error.message?.includes('JWT') || 
                           error.message?.includes('token') ||
                           error.message?.includes('401') ||
                           error.code === 'PGRST301';
        
        if (isAuthError && retryCount < 1) {
            console.log('[useCredits] RPC 인증 오류 감지, 토큰 갱신 후 재시도...');
            const refreshedSession = await ensureValidSession();
            if (refreshedSession) {
                return fetchCreditsViaRPC(userId, retryCount + 1);
            }
        }
        throw error;
    }
    return data;
};

export const useCredits = (session: Session | null): UseCreditsReturn => {
    const [credits, setCredits] = useState<number>(0);
    const [loading, setLoading] = useState(true);
    const [purchases, setPurchases] = useState<CreditPurchase[]>([]);
    const [debugInfo, setDebugInfo] = useState<UseCreditsReturn['debugInfo']>();
    const isRefreshing = useRef(false);

    // 사용 가능한 크레딧 합계 조회 (active 상태 구매건만)
    const refreshCredits = useCallback(async () => {
        // 중복 호출 방지
        if (isRefreshing.current) return;
        isRefreshing.current = true;

        setDebugInfo({
            phase: '1. 세션 검증 시작',
            purchaseCount: 0,
            profileCredits: 0,
            lastRefresh: new Date().toLocaleTimeString(),
            host: window.location.host,
            urlStatus: (process.env.REACT_APP_SUPABASE_URL || 'missing').substring(0, 15) + '...',
            authStatus: session ? 'Session 존재 (Props)' : 'Session 없음 (Props)'
        });

        try {
            setLoading(true);
            
            // Safari ITP 대응: 
            // Safari 환경에서는 페이지 마운트 직후 전역 상태의 session 토큰이 Supabase Client에 즉시 반영되지 않을 수 있습니다.
            // 명시적으로 getSession()을 호출하여 최신 세션을 확보합니다.
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            
            // Props로 전달받은 세션보다 getSession()으로 가져온 세션을 우선시합니다.
            const validSession = currentSession || session;
            const currentUserId = validSession?.user?.id;

            if (!currentUserId) {
                setCredits(0);
                setPurchases([]);
                setDebugInfo(prev => ({ ...prev!, phase: '종료: 유저 ID 없음', authStatus: '세션 없음' }));
                return;
            }

            setDebugInfo(prev => ({ ...prev!, phase: '2. 통합 정보(RPC) 조회 중', authStatus: '세션 유효' }));

            // Increased timeout to 30s for slow mobile networks
            const queryTimeout = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('통합 정보 조회 타임아웃 (30초 초과)')), 30000)
            );

            const result = await Promise.race([fetchCreditsViaRPC(currentUserId), queryTimeout]) as any;

            if (!result) throw new Error('조회 결과가 없습니다.');

            const activePurchases = (result.purchases || []) as CreditPurchase[];

            setPurchases(activePurchases);
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
            console.error('[useCredits] Error fetching credits:', err);
            setDebugInfo(prev => ({ ...prev!, phase: '에러: 조회 실패', error: err.message || JSON.stringify(err) }));
            // Safari 등 환경에서 무한 로딩을 방지하기 위해 에러 발생 시에도 loading을 꺼야 함 (finally에서 처리됨)
        } finally {
            setLoading(false);
            isRefreshing.current = false;
        }
    }, [session]);

    useEffect(() => {
        refreshCredits();

        // TOKEN_REFRESHED 이벤트 구독: 토큰 갱신 시 자동 크레딧 재조회
        const unsubscribeTokenRefresh = onTokenRefreshed(() => {
            console.log('[useCredits] Token refreshed event received, re-fetching credits...');
            isRefreshing.current = false; // 중복 방지 플래그 리셋
            refreshCredits();
        });

        // Window focus listener to refresh credits (important for Safari/mobile coming back from background)
        const handleFocus = () => {
            console.log('Window focused, refreshing credits...');
            isRefreshing.current = false;
            refreshCredits();
        };
        window.addEventListener('focus', handleFocus);

        return () => {
            window.removeEventListener('focus', handleFocus);
            unsubscribeTokenRefresh();
        };
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
