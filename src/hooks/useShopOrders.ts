import { useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from './useAuth';

export interface ShopOrderItem {
    id: string;
    product_id: string | null;
    product_name: string;
    product_price: number;
    quantity: number;
    subtotal: number;
}

export interface ShopOrder {
    id: string;
    order_number: string;
    total_amount: number;
    status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
    shipping_name: string | null;
    shipping_phone: string | null;
    shipping_address: string | null;
    shipping_memo: string | null;
    payment_key: string | null;
    created_at: string;
    items: ShopOrderItem[];
}

export function useShopOrders() {
    const { session } = useAuth();
    const [orders, setOrders] = useState<ShopOrder[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchOrders = useCallback(async () => {
        if (!session?.user) {
            setOrders([]);
            return;
        }

        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('shop_orders')
                .select(`
                    *,
                    items:shop_order_items(*)
                `)
                .eq('user_id', session.user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            setOrders((data || []) as ShopOrder[]);
        } catch (error) {
            console.error('Error fetching orders:', error);
        } finally {
            setLoading(false);
        }
    }, [session]);

    return {
        orders,
        loading,
        fetchOrders
    };
}
