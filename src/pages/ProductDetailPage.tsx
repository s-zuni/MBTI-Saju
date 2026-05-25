import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { useShopCart } from '../hooks/useShopCart';
import { useShopWishlist } from '../hooks/useShopWishlist';
import { useShopPayment } from '../hooks/useShopPayment';
import {
    ArrowLeft,
    Heart,
    ShoppingCart,
    Minus,
    Plus,
    Loader2,
    Package,
    Zap,
    Truck
} from 'lucide-react';

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

const ProductDetailPage: React.FC = () => {
    const { productId } = useParams<{ productId: string }>();
    const navigate = useNavigate();
    const { session } = useAuth();
    const { addToCart } = useShopCart();
    const { isWishlisted, toggleWishlist } = useShopWishlist();
    const { requestDirectPurchase, loading: paymentLoading } = useShopPayment();

    const [product, setProduct] = useState<ShopProduct | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeImage, setActiveImage] = useState<string | null>(null);
    const [quantity, setQuantity] = useState(1);

    // Shipping info form
    const [shippingName, setShippingName] = useState('');
    const [shippingPhone, setShippingPhone] = useState('');
    const [shippingAddress, setShippingAddress] = useState('');
    const [shippingMemo, setShippingMemo] = useState('');

    const [cartAdding, setCartAdding] = useState(false);

    const fetchProduct = useCallback(async () => {
        if (!productId) return;
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('shop_products')
                .select('*')
                .eq('id', productId)
                .eq('is_active', true)
                .maybeSingle();

            if (error) throw error;
            if (data) {
                setProduct(data as ShopProduct);
                setActiveImage(data.thumbnail_url);
            } else {
                setProduct(null);
            }
        } catch (err) {
            console.error('Error fetching product:', err);
        } finally {
            setLoading(false);
        }
    }, [productId]);

    useEffect(() => {
        fetchProduct().catch(err => console.error(err));
    }, [fetchProduct]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <Loader2 className="animate-spin text-violet-600" size={32} />
            </div>
        );
    }

    if (!product) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
                <Package size={48} className="text-slate-300 mb-4" />
                <h2 className="text-lg font-black text-slate-800">상품을 찾을 수 없습니다.</h2>
                <p className="text-sm text-slate-400 mt-1">존재하지 않거나 판매 중단된 상품입니다.</p>
                <button
                    onClick={() => navigate('/shop')}
                    className="mt-6 px-6 py-3 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-black transition-colors"
                >
                    상점으로 이동
                </button>
            </div>
        );
    }

    const allImages = [product.thumbnail_url, ...(product.images || [])].filter((url): url is string => !!url);
    const wished = isWishlisted(product.id);
    const isSoldOut = product.stock === 0;

    const handleIncrement = () => {
        if (quantity < product.stock) {
            setQuantity(prev => prev + 1);
        }
    };

    const handleDecrement = () => {
        if (quantity > 1) {
            setQuantity(prev => prev - 1);
        }
    };

    const handleAddToCart = async () => {
        if (!session?.user) {
            alert('로그인이 필요합니다.');
            return;
        }

        try {
            setCartAdding(true);
            const success = await addToCart(product.id, quantity);
            if (success) {
                alert('장바구니에 상품을 담았습니다.');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setCartAdding(false);
        }
    };

    const handleBuyNow = async () => {
        if (!session?.user) {
            alert('로그인이 필요합니다.');
            return;
        }

        // Validate shipping fields for physical products
        if (product.product_type === 'physical') {
            if (!shippingName.trim()) {
                alert('수령인 이름을 입력해주세요.');
                return;
            }
            if (!shippingPhone.trim()) {
                alert('연락처를 입력해주세요.');
                return;
            }
            if (!shippingAddress.trim()) {
                alert('배송 주소를 입력해주세요.');
                return;
            }
        }

        const item = {
            product_id: product.id,
            product_name: product.name,
            product_price: product.price,
            quantity
        };

        const shippingInfo = product.product_type === 'physical' ? {
            name: shippingName,
            phone: shippingPhone,
            address: shippingAddress,
            memo: shippingMemo
        } : undefined;

        await requestDirectPurchase(item, shippingInfo);
    };

    return (
        <div className="bg-white min-h-screen pb-24">
            <div className="max-w-6xl mx-auto px-4 py-6">
                {/* Back Button */}
                <button
                    onClick={() => navigate('/shop')}
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold text-sm mb-6 transition-colors"
                >
                    <ArrowLeft size={16} />
                    목록으로 돌아가기
                </button>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                    {/* Images Column */}
                    <div className="space-y-4">
                        <div className="aspect-square w-full rounded-3xl overflow-hidden bg-slate-50 border border-slate-100 relative">
                            {activeImage ? (
                                <img src={activeImage} alt={product.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-300">
                                    <Package size={48} />
                                </div>
                            )}

                            {isSoldOut && (
                                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center">
                                    <span className="px-6 py-3 rounded-2xl bg-white/95 text-slate-800 font-black text-sm shadow">
                                        일시 품절
                                    </span>
                                </div>
                            )}
                        </div>

                        {allImages.length > 1 && (
                            <div className="flex gap-2 overflow-x-auto pb-2">
                                {allImages.map((url, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setActiveImage(url)}
                                        className={`w-20 h-20 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all ${
                                            activeImage === url ? 'border-violet-600' : 'border-slate-100 hover:border-slate-300'
                                        }`}
                                    >
                                        <img src={url} alt={`Detail view ${idx + 1}`} className="w-full h-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Information Column */}
                    <div className="space-y-6 flex flex-col justify-between">
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                    product.product_type === 'physical'
                                        ? 'bg-blue-50 text-blue-600 border border-blue-100'
                                        : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                }`}>
                                    {product.product_type === 'physical' ? '실물 상품' : '디지털 상품'}
                                </span>
                                <span className={`text-xs font-bold ${isSoldOut ? 'text-red-500' : 'text-slate-400'}`}>
                                    {isSoldOut ? '품절' : `남은 수량: ${product.stock}개`}
                                </span>
                            </div>

                            <h1 className="text-2xl md:text-3xl font-black text-slate-900 leading-snug">
                                {product.name}
                            </h1>

                            <div className="text-3xl font-black text-violet-600">
                                ₩{product.price.toLocaleString()}
                            </div>

                            <div className="border-t border-slate-100 pt-4">
                                <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">
                                    {product.description}
                                </p>
                            </div>
                        </div>

                        {/* Quantity Selector & Shipping Address */}
                        <div className="space-y-6 mt-6 border-t border-slate-100 pt-6">
                            {!isSoldOut && (
                                <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl">
                                    <span className="font-bold text-slate-700 text-sm">구매 수량</span>
                                    <div className="flex items-center gap-4 bg-white rounded-xl border border-slate-200 p-1">
                                        <button
                                            onClick={handleDecrement}
                                            disabled={quantity <= 1}
                                            className="p-2 hover:bg-slate-50 text-slate-500 rounded-lg transition-colors disabled:opacity-30"
                                        >
                                            <Minus size={14} />
                                        </button>
                                        <span className="font-black text-slate-800 text-sm w-8 text-center">{quantity}</span>
                                        <button
                                            onClick={handleIncrement}
                                            disabled={quantity >= product.stock}
                                            className="p-2 hover:bg-slate-50 text-slate-500 rounded-lg transition-colors disabled:opacity-30"
                                        >
                                            <Plus size={14} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Shipping info Form */}
                            {!isSoldOut && product.product_type === 'physical' && (
                                <div className="space-y-4 bg-slate-50/50 p-5 rounded-3xl border border-slate-100/80">
                                    <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                                        <Truck size={16} className="text-violet-600" />
                                        배송지 정보 입력
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                        <div>
                                            <label className="block text-slate-400 font-bold mb-1.5">수령인</label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="이름"
                                                value={shippingName}
                                                onChange={e => setShippingName(e.target.value)}
                                                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white font-semibold focus:outline-none focus:border-violet-500 text-slate-800"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-slate-400 font-bold mb-1.5">연락처</label>
                                            <input
                                                type="tel"
                                                required
                                                placeholder="ex) 010-0000-0000"
                                                value={shippingPhone}
                                                onChange={e => setShippingPhone(e.target.value)}
                                                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white font-semibold focus:outline-none focus:border-violet-500 text-slate-800"
                                            />
                                        </div>
                                        <div className="sm:col-span-2">
                                            <label className="block text-slate-400 font-bold mb-1.5">배송 주소</label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="기본주소 및 상세주소 입력"
                                                value={shippingAddress}
                                                onChange={e => setShippingAddress(e.target.value)}
                                                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white font-semibold focus:outline-none focus:border-violet-500 text-slate-800"
                                            />
                                        </div>
                                        <div className="sm:col-span-2">
                                            <label className="block text-slate-400 font-bold mb-1.5">배송 요청사항 (선택)</label>
                                            <input
                                                type="text"
                                                placeholder="부재 시 문앞에 놓아주세요"
                                                value={shippingMemo}
                                                onChange={e => setShippingMemo(e.target.value)}
                                                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white font-semibold focus:outline-none focus:border-violet-500 text-slate-800"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Total price & Actions */}
                            <div className="space-y-4">
                                {!isSoldOut && (
                                    <div className="flex justify-between items-baseline">
                                        <span className="font-bold text-slate-500 text-sm">최종 결제 금액</span>
                                        <span className="text-2xl font-black text-slate-900">
                                            ₩{(product.price * quantity).toLocaleString()}
                                        </span>
                                    </div>
                                )}

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => toggleWishlist(product.id).catch(err => console.error(err))}
                                        className={`p-4 rounded-2xl border transition-all ${
                                            wished
                                                ? 'border-red-100 bg-red-50 text-red-500'
                                                : 'border-slate-200 hover:bg-slate-50 text-slate-400'
                                        }`}
                                    >
                                        <Heart size={20} className={wished ? 'fill-red-500 text-red-500' : ''} />
                                    </button>

                                    <button
                                        onClick={handleAddToCart}
                                        disabled={isSoldOut || cartAdding}
                                        className="flex-1 py-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold rounded-2xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                                    >
                                        {cartAdding ? <Loader2 className="animate-spin" size={18} /> : <ShoppingCart size={18} />}
                                        장바구니
                                    </button>

                                    <button
                                        onClick={handleBuyNow}
                                        disabled={isSoldOut || paymentLoading}
                                        className="flex-1 py-4 bg-slate-900 hover:bg-black text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-slate-200 transition-colors disabled:opacity-50"
                                    >
                                        {paymentLoading ? (
                                            <Loader2 className="animate-spin" size={18} />
                                        ) : (
                                            <Zap size={18} className="fill-white text-white" />
                                        )}
                                        {isSoldOut ? '품절' : '바로 구매'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductDetailPage;
