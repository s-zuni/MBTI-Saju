import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from './useAuth';

export interface ShopProductInfo {
    name: string;
    price: number;
    stock: number;
    thumbnail_url: string | null;
    product_type: 'physical' | 'digital';
}

export interface ShopCartItem {
    id: string;
    product_id: string;
    quantity: number;
    created_at: string;
    product: ShopProductInfo | null;
}

export function useShopCart() {
    const { session } = useAuth();
    const [cart, setCart] = useState<ShopCartItem[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchCart = useCallback(async () => {
        if (!session?.user) {
            setCart([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('shop_cart')
                .select(`
                    id,
                    product_id,
                    quantity,
                    created_at,
                    product:shop_products (
                        name,
                        price,
                        stock,
                        thumbnail_url,
                        product_type
                    )
                `)
                .eq('user_id', session.user.id);

            if (error) throw error;

            // Map and safely assert types
            const mappedData: ShopCartItem[] = (data || []).map((item: any) => {
                const prod = Array.isArray(item.product) ? item.product[0] : item.product;
                return {
                    id: item.id,
                    product_id: item.product_id,
                    quantity: item.quantity,
                    created_at: item.created_at,
                    product: prod ? {
                        name: prod.name,
                        price: prod.price,
                        stock: prod.stock,
                        thumbnail_url: prod.thumbnail_url,
                        product_type: prod.product_type as 'physical' | 'digital'
                    } : null
                };
            });

            setCart(mappedData);
        } catch (error) {
            console.error('Error fetching cart:', error);
        } finally {
            setLoading(false);
        }
    }, [session]);

    useEffect(() => {
        fetchCart().catch(err => console.error(err));
    }, [session, fetchCart]);

    const addToCart = async (productId: string, quantity = 1): Promise<boolean> => {
        if (!session?.user) {
            alert('로그인이 필요합니다.');
            return false;
        }

        try {
            // Check if product already in cart
            const { data: existing, error: checkError } = await supabase
                .from('shop_cart')
                .select('id, quantity')
                .eq('user_id', session.user.id)
                .eq('product_id', productId)
                .maybeSingle();

            if (checkError) throw checkError;

            if (existing) {
                const { error: updateError } = await supabase
                    .from('shop_cart')
                    .update({ quantity: existing.quantity + quantity })
                    .eq('id', existing.id);
                if (updateError) throw updateError;
            } else {
                const { error: insertError } = await supabase
                    .from('shop_cart')
                    .insert({
                        user_id: session.user.id,
                        product_id: productId,
                        quantity
                    });
                if (insertError) throw insertError;
            }

            await fetchCart();
            return true;
        } catch (error) {
            console.error('Error adding to cart:', error);
            return false;
        }
    };

    const removeFromCart = async (cartItemId: string): Promise<boolean> => {
        try {
            const { error } = await supabase
                .from('shop_cart')
                .delete()
                .eq('id', cartItemId);

            if (error) throw error;
            await fetchCart();
            return true;
        } catch (error) {
            console.error('Error removing from cart:', error);
            return false;
        }
    };

    const updateQuantity = async (cartItemId: string, quantity: number): Promise<boolean> => {
        if (quantity <= 0) return removeFromCart(cartItemId);

        try {
            const { error } = await supabase
                .from('shop_cart')
                .update({ quantity })
                .eq('id', cartItemId);

            if (error) throw error;
            await fetchCart();
            return true;
        } catch (error) {
            console.error('Error updating quantity:', error);
            return false;
        }
    };

    const clearCart = async (): Promise<boolean> => {
        if (!session?.user) return false;

        try {
            const { error } = await supabase
                .from('shop_cart')
                .delete()
                .eq('user_id', session.user.id);

            if (error) throw error;
            setCart([]);
            return true;
        } catch (error) {
            console.error('Error clearing cart:', error);
            return false;
        }
    };

    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cart.reduce((sum, item) => {
        const itemPrice = item.product?.price ?? 0;
        return sum + itemPrice * item.quantity;
    }, 0);

    return {
        cart,
        loading,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartCount,
        totalPrice,
        fetchCart
    };
}
