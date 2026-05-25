import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from './useAuth';

export interface ShopWishlistItem {
    id: string;
    product_id: string;
    created_at: string;
    product: {
        name: string;
        price: number;
        thumbnail_url: string | null;
        product_type: 'physical' | 'digital';
        stock: number;
    } | null;
}

export function useShopWishlist() {
    const { session } = useAuth();
    const [wishlist, setWishlist] = useState<ShopWishlistItem[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchWishlist = useCallback(async () => {
        if (!session?.user) {
            setWishlist([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('shop_wishlist')
                .select(`
                    id,
                    product_id,
                    created_at,
                    product:shop_products (
                        name,
                        price,
                        thumbnail_url,
                        product_type,
                        stock
                    )
                `)
                .eq('user_id', session.user.id);

            if (error) throw error;

            const mappedData: ShopWishlistItem[] = (data || []).map((item: any) => {
                const prod = Array.isArray(item.product) ? item.product[0] : item.product;
                return {
                    id: item.id,
                    product_id: item.product_id,
                    created_at: item.created_at,
                    product: prod ? {
                        name: prod.name,
                        price: prod.price,
                        thumbnail_url: prod.thumbnail_url,
                        product_type: prod.product_type as 'physical' | 'digital',
                        stock: prod.stock
                    } : null
                };
            });

            setWishlist(mappedData);
        } catch (error) {
            console.error('Error fetching wishlist:', error);
        } finally {
            setLoading(false);
        }
    }, [session]);

    useEffect(() => {
        fetchWishlist().catch(err => console.error(err));
    }, [session, fetchWishlist]);

    const wishlistIds = useMemo(() => new Set(wishlist.map(item => item.product_id)), [wishlist]);

    const isWishlisted = useCallback((productId: string) => {
        return wishlistIds.has(productId);
    }, [wishlistIds]);

    const toggleWishlist = async (productId: string): Promise<boolean> => {
        if (!session?.user) {
            alert('로그인이 필요합니다.');
            return false;
        }

        try {
            const exists = isWishlisted(productId);

            if (exists) {
                const { error } = await supabase
                    .from('shop_wishlist')
                    .delete()
                    .eq('user_id', session.user.id)
                    .eq('product_id', productId);

                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('shop_wishlist')
                    .insert({
                        user_id: session.user.id,
                        product_id: productId
                    });

                if (error) throw error;
            }

            await fetchWishlist();
            return true;
        } catch (error) {
            console.error('Error toggling wishlist:', error);
            return false;
        }
    };

    return {
        wishlist,
        loading,
        wishlistIds,
        toggleWishlist,
        isWishlisted,
        fetchWishlist
    };
}
