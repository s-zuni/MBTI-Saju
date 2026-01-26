import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Session } from '@supabase/supabase-js';
import { SERVICE_COSTS, ServiceType } from '../config/coinConfig';

interface UseCoinsReturn {
    coins: number;
    loading: boolean;
    refreshCoins: () => Promise<void>;
    useCoins: (serviceType: ServiceType) => Promise<boolean>;
    addCoins: (amount: number, paymentId?: string, packageId?: string) => Promise<boolean>;
    checkSufficientCoins: (serviceType: ServiceType) => boolean;
    getCost: (serviceType: ServiceType) => number;
}

export const useCoins = (session: Session | null): UseCoinsReturn => {
    const [coins, setCoins] = useState<number>(0);
    const [loading, setLoading] = useState(true);

    const refreshCoins = useCallback(async () => {
        if (!session?.user?.id) {
            setCoins(0);
            setLoading(false);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('coins')
                .eq('id', session.user.id)
                .single();

            if (error) throw error;
            setCoins(data?.coins ?? 0);
        } catch (err) {
            console.error('Error fetching coins:', err);
            setCoins(0);
        } finally {
            setLoading(false);
        }
    }, [session]);

    useEffect(() => {
        refreshCoins();
    }, [refreshCoins]);

    const getCost = useCallback((serviceType: ServiceType): number => {
        return SERVICE_COSTS[serviceType];
    }, []);

    const checkSufficientCoins = useCallback((serviceType: ServiceType): boolean => {
        const cost = getCost(serviceType);
        return coins >= cost;
    }, [coins, getCost]);

    const useCoins = useCallback(async (serviceType: ServiceType): Promise<boolean> => {
        if (!session?.user?.id) return false;

        const cost = getCost(serviceType);
        if (cost === 0) return true; // 무료 서비스
        if (coins < cost) return false;

        try {
            // 1. coins 차감
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ coins: coins - cost })
                .eq('id', session.user.id);

            if (updateError) throw updateError;

            // 2. 거래 내역 기록
            const { error: txError } = await supabase
                .from('coin_transactions')
                .insert({
                    user_id: session.user.id,
                    amount: -cost,
                    type: 'usage',
                    service_type: serviceType.toLowerCase()
                });

            if (txError) console.error('Transaction log failed:', txError);

            // 3. 로컬 상태 업데이트
            setCoins(prev => prev - cost);
            return true;
        } catch (err) {
            console.error('Error using coins:', err);
            return false;
        }
    }, [session, coins, getCost]);

    const addCoins = useCallback(async (
        amount: number,
        paymentId?: string,
        packageId?: string
    ): Promise<boolean> => {
        if (!session?.user?.id) return false;

        try {
            // 1. coins 추가
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ coins: coins + amount })
                .eq('id', session.user.id);

            if (updateError) throw updateError;

            // 2. 거래 내역 기록
            const { error: txError } = await supabase
                .from('coin_transactions')
                .insert({
                    user_id: session.user.id,
                    amount: amount,
                    type: 'purchase',
                    service_type: packageId,
                    payment_id: paymentId
                });

            if (txError) console.error('Transaction log failed:', txError);

            // 3. 로컬 상태 업데이트
            setCoins(prev => prev + amount);
            return true;
        } catch (err) {
            console.error('Error adding coins:', err);
            return false;
        }
    }, [session, coins]);

    return {
        coins,
        loading,
        refreshCoins,
        useCoins,
        addCoins,
        checkSufficientCoins,
        getCost
    };
};
