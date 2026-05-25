import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useShopWishlist } from '../hooks/useShopWishlist';
import { Heart, Package, Sparkles } from 'lucide-react';

interface ShopProduct {
    id: string;
    name: string;
    description: string;
    price: number;
    stock: number;
    product_type: 'physical' | 'digital';
    thumbnail_url: string | null;
    images: string[];
    is_active: boolean;
    created_at: string;
}

const ShopPage: React.FC = () => {
    const navigate = useNavigate();
    const { isWishlisted, toggleWishlist } = useShopWishlist();

    const [products, setProducts] = useState<ShopProduct[]>([]);
    const [filter, setFilter] = useState<'all' | 'physical' | 'digital'>('all');
    const [loading, setLoading] = useState(true);

    const fetchProducts = useCallback(async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('shop_products')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setProducts((data || []) as ShopProduct[]);
        } catch (err) {
            console.error('Error fetching products:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProducts().catch(err => console.error(err));
    }, [fetchProducts]);

    const filteredProducts = products.filter(product => {
        if (filter === 'all') return true;
        return product.product_type === filter;
    });

    return (
        <div className="bg-slate-50 min-h-screen pb-12">
            {/* Hero Section */}
            <div className="relative overflow-hidden bg-gradient-to-b from-violet-100/40 via-transparent to-transparent py-16 px-6 text-center">
                <div className="max-w-xl mx-auto">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-violet-50 text-violet-600 mb-4">
                        <Sparkles size={12} className="animate-pulse" />
                        특별한 행운과 치유의 운세템 자사몰
                    </span>
                    <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                        운세템 자사몰
                    </h1>
                    <p className="mt-3 text-sm md:text-base text-slate-500 font-medium leading-relaxed">
                        당신의 사주와 MBTI에 꼭 맞는 기운을 불어넣어 줄<br />
                        소장 가치 가득한 실물 굿즈와 디지털 솔루션을 만나보세요.
                    </p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 md:px-6">
                {/* Tabs */}
                <div className="flex justify-center gap-2 mb-8">
                    {(['all', 'physical', 'digital'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setFilter(tab)}
                            className={`px-6 py-2.5 rounded-full font-bold text-sm transition-all ${
                                filter === tab
                                    ? 'bg-slate-900 text-white shadow-lg shadow-slate-200'
                                    : 'bg-white text-slate-500 hover:bg-slate-100/50 border border-slate-100'
                            }`}
                        >
                            {tab === 'all' && '전체'}
                            {tab === 'physical' && '실물 상품'}
                            {tab === 'digital' && '디지털 상품'}
                        </button>
                    ))}
                </div>

                {/* Grid */}
                {loading ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
                        {Array.from({ length: 8 }).map((_, idx) => (
                            <div key={idx} className="bg-white rounded-3xl p-3 border border-slate-100/80 animate-pulse space-y-3">
                                <div className="aspect-square w-full bg-slate-100 rounded-2xl" />
                                <div className="h-4 bg-slate-100 rounded w-3/4" />
                                <div className="h-4 bg-slate-100 rounded w-1/2" />
                            </div>
                        ))}
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div className="bg-white rounded-3xl p-16 text-center border border-slate-100 max-w-lg mx-auto">
                        <Package size={48} className="mx-auto text-slate-300 mb-4" />
                        <p className="text-slate-500 font-bold">등록된 상품이 없습니다.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
                        {filteredProducts.map(product => {
                            const isSoldOut = product.stock === 0;
                            const wished = isWishlisted(product.id);

                            return (
                                <div
                                    key={product.id}
                                    onClick={() => navigate(`/shop/${product.id}`)}
                                    className="group bg-white rounded-3xl p-2.5 md:p-3 border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer relative flex flex-col justify-between"
                                >
                                    <div>
                                        {/* Image wrapper */}
                                        <div className="aspect-square w-full rounded-2xl overflow-hidden bg-slate-50 relative border border-slate-50">
                                            {product.thumbnail_url ? (
                                                <img
                                                    src={product.thumbnail_url}
                                                    alt={product.name}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-300 bg-slate-50">
                                                    <Package size={24} />
                                                </div>
                                            )}

                                            {/* Wishlist toggle overlay */}
                                            <button
                                                onClick={e => {
                                                    e.stopPropagation();
                                                    toggleWishlist(product.id).catch(err => console.error(err));
                                                }}
                                                className="absolute top-2 right-2 p-1.5 rounded-xl bg-white/90 hover:bg-white text-slate-400 hover:text-red-500 shadow-sm transition-all"
                                            >
                                                <Heart
                                                    size={14}
                                                    className={wished ? 'fill-red-500 text-red-500 scale-110 transition-transform' : ''}
                                                />
                                            </button>

                                            {/* Category badge */}
                                            <span className={`absolute bottom-2 left-2 px-2 py-0.5 rounded-lg text-[9px] font-bold shadow-sm ${
                                                product.product_type === 'physical'
                                                    ? 'bg-blue-600/90 text-white'
                                                    : 'bg-emerald-600/90 text-white'
                                            }`}>
                                                {product.product_type === 'physical' ? '실물' : '디지털'}
                                            </span>

                                            {/* Sold Out Overlay */}
                                            {isSoldOut && (
                                                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center">
                                                    <span className="px-3 py-1.5 rounded-xl bg-white/95 text-slate-800 font-black text-[10px] shadow">
                                                        일시 품절
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Product Details */}
                                        <div className="mt-2.5 px-0.5">
                                            <h3 className="font-bold text-slate-800 group-hover:text-violet-600 transition-colors text-xs md:text-sm line-clamp-2 min-h-[32px] md:min-h-[36px] leading-snug">
                                                {product.name}
                                            </h3>
                                        </div>
                                    </div>

                                    <div className="mt-1.5 px-0.5 pb-0.5 flex justify-between items-center">
                                        <span className="text-sm md:text-base font-black text-slate-900">
                                            ₩{product.price.toLocaleString()}
                                        </span>
                                        {product.stock > 0 && product.stock <= 5 && (
                                            <span className="text-[9px] md:text-[10px] font-bold text-red-500 whitespace-nowrap">
                                                품절임박 {product.stock}개
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ShopPage;
