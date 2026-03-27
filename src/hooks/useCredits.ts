import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase, ensureValidSession } from '../supabaseClient';
import { Session } from '@supabase/supabase-js';
import { SERVICE_COSTS, ServiceType, REFUND_PERIOD_DAYS } from '../config/creditConfig';
import { onTokenRefreshed } from './useAuth';
import { formatSafariDate } from '../utils/textUtils';

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
    const [isInitialized, setIsInitialized] = useState(false);
    const isRefreshing = useRef(false);

    // 사용 가능한 크레딧 합계 조회 (active 상태 구매건만)
    const refreshCredits = useCallback(async (force = false, passedSession: Session | null = null) => {
        // 초기화 전에는 호출 방지 (force가 true인 경우 제외)
        if (!isInitialized && !force) return;
        
        // 중복 호출 방지
        if (isRefreshing.current) return;
        isRefreshing.current = true;

        const maxRetries = 3;
        let attempt = 0;
        let success = false;

        setLoading(true);

        while (attempt < maxRetries && !success) {
            try {
                attempt++;
                setDebugInfo({
                    phase: `시도 ${attempt}/${maxRetries}: 세션 검증`,
                    purchaseCount: 0,
                    profileCredits: 0,
                    lastRefresh: new Date().toLocaleTimeString(),
                    host: window.location.host,
                    urlStatus: (process.env.REACT_APP_SUPABASE_URL || 'missing').substring(0, 15) + '...',
                    authStatus: (passedSession || session) ? 'Session 존재' : 'Session 확인 중'
                });

                // ⭐️ Task 2: 외부 주입 세션 우선, 없으면 타임아웃 보호된 ensureValidSession 사용
                let currentSession = passedSession || session;
                if (!currentSession) {
                    currentSession = await ensureValidSession();
                }

                const currentUserId = currentSession?.user?.id;

                // ⭐️ Task 2: 유저 ID가 없으면 0으로 덮어쓰지 말고 재시도하거나 대기합니다.
                if (!currentUserId) {
                    if (attempt < maxRetries) {
                        setDebugInfo(prev => ({ ...prev!, phase: `시도 ${attempt} 실패: 세션 대기 중...` }));
                        await new Promise(resolve => setTimeout(resolve, 1500)); // 1.5초 대기 후 재시도
                        continue;
                    }
                    console.warn("[useCredits] 최종 시도 실패: 세션을 찾을 수 없습니다.");
                    setDebugInfo(prev => ({ ...prev!, phase: '종료: 세션 유실', authStatus: '실패' }));
                    break;
                }

                setDebugInfo(prev => ({ ...prev!, phase: '정보 조회 중 (RPC)', authStatus: '세션 유효' }));

                const queryTimeout = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('조회 타임아웃')), 10000)
                );

                const result = await Promise.race([fetchCreditsViaRPC(currentUserId), queryTimeout]) as any;

                if (!result) throw new Error('조회 결과 없음');

                const activePurchases = (result.purchases || []) as CreditPurchase[];
                setPurchases(activePurchases);
                setCredits(result.profile_credits ?? 0);

                setDebugInfo({
                    phase: '조회 완료',
                    purchaseCount: activePurchases.length,
                    profileCredits: result.profile_credits ?? 0,
                    lastRefresh: new Date().toLocaleTimeString(),
                    host: window.location.host,
                    urlStatus: (process.env.REACT_APP_SUPABASE_URL || 'N/A').substring(0, 15) + '...',
                    authStatus: '성공'
                });
                
                success = true;
            } catch (err: any) {
                console.error(`[useCredits] Attempt ${attempt} failed:`, err);
                if (attempt < maxRetries) {
                    setDebugInfo(prev => ({ ...prev!, phase: `시도 ${attempt} 에러: 재시도 준비...`, error: err.message }));
                    await new Promise(resolve => setTimeout(resolve, 2000)); // 에러 발생 시 2초 대기
                } else {
                    setDebugInfo(prev => ({ ...prev!, phase: '최종 실패', error: err.message }));
                }
            }
        }

        setLoading(false);
        isRefreshing.current = false;
    }, [session, isInitialized]);

    useEffect(() => {
        // Safari 대응: 세션 복원 대기 로직
        // onAuthStateChange의 INITIAL_SESSION 이벤트를 기다려 세션 복원 완료를 확인합니다.
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
            console.log(`[useCredits] Auth Event: ${event}`);
            
            if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
                setIsInitialized(true);
                // 세션이 확정된 후 크레딧 정보 패칭 (force=true로 호출)
                // useCredits(session)의 session prop이 갱신되기 전일 수 있으므로 
                // 내부에서 getSession()을 다시 한 번 수행하는 refreshCredits를 호출합니다.
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    useEffect(() => {
        if (isInitialized) {
            refreshCredits(true);
        }

        // TOKEN_REFRESHED 이벤트 구독: 토큰 갱신 시 자동 크레딧 재조회
        const unsubscribeTokenRefresh = onTokenRefreshed(() => {
            console.log('[useCredits] Token refreshed event received, re-fetching credits...');
            isRefreshing.current = false; // 중복 방지 플래그 리셋
            refreshCredits(true);
        });

        // Window focus listener to refresh credits (important for Safari/mobile coming back from background)
        const handleFocus = () => {
            console.log('Window focused, refreshing credits...');
            isRefreshing.current = false;
            refreshCredits(true);
        };
        window.addEventListener('focus', handleFocus);

        return () => {
            window.removeEventListener('focus', handleFocus);
            unsubscribeTokenRefresh();
        };
    }, [isInitialized, refreshCredits]);

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

            const purchasedAt = new Date(formatSafariDate(purchase.purchased_at));
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
