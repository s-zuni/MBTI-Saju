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
    options?: { name: string; values: string[] }[] | null;
    discount_price?: number | null;
}

const ProductDetailPage: React.FC = () => {
    const { productId } = useParams<{ productId: string }>();
    const navigate = useNavigate();
    const { session } = useAuth();
    const { addToCart } = useShopCart();
    const { isWishlisted, toggleWishlist } = useShopWishlist();
    const { requestDirectPurchase, loading: paymentLoading } = useShopPayment();

    const [product, setProduct] = useState<ShopProduct | null>(null);

    useEffect(() => {
        alert('운세 상점은 현재 준비 중입니다. 곧 찾아뵙겠습니다!');
        navigate('/');
    }, [navigate]);
    const [loading, setLoading] = useState(true);
    const [activeImage, setActiveImage] = useState<string | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});

    // Shipping info form
    const [shippingName, setShippingName] = useState('');
    const [shippingPhone, setShippingPhone] = useState('');
    const [shippingAddress, setShippingAddress] = useState('');
    const [shippingMemo, setShippingMemo] = useState('');

    const [cartAdding, setCartAdding] = useState(false);

    // Shipping info accordion open/close state
    const [isShippingOpen, setIsShippingOpen] = useState(false);

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

    const hasDiscount = product.discount_price !== undefined && product.discount_price !== null && product.discount_price > 0 && product.discount_price < product.price;
    const currentPrice = hasDiscount ? product.discount_price! : product.price;

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

        // Validate options
        if (product.options && product.options.length > 0) {
            for (const opt of product.options) {
                if (!selectedOptions[opt.name]) {
                    alert(`${opt.name} 옵션을 선택해주세요.`);
                    return;
                }
            }
        }

        const selectedOptionString = product.options && product.options.length > 0
            ? product.options.map(opt => `${opt.name}: ${selectedOptions[opt.name]}`).join(' / ')
            : undefined;

        try {
            setCartAdding(true);
            const success = await addToCart(product.id, quantity, selectedOptionString);
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

        // Validate options
        if (product.options && product.options.length > 0) {
            for (const opt of product.options) {
                if (!selectedOptions[opt.name]) {
                    alert(`${opt.name} 옵션을 선택해주세요.`);
                    return;
                }
            }
        }

        const selectedOptionString = product.options && product.options.length > 0
            ? product.options.map(opt => `${opt.name}: ${selectedOptions[opt.name]}`).join(' / ')
            : undefined;

        // Validate shipping fields for physical products
        if (product.product_type === 'physical') {
            if (!shippingName.trim() || !shippingPhone.trim() || !shippingAddress.trim()) {
                setIsShippingOpen(true);
                alert('배송지 정보를 모두 입력해주세요.');
                return;
            }
        }

        const item = {
            product_id: product.id,
            product_name: product.name,
            product_price: currentPrice,
            quantity,
            selected_option: selectedOptionString,
            product_type: product.product_type
        };

        const shippingInfo = product.product_type === 'physical' ? {
            name: shippingName,
            phone: shippingPhone,
            address: shippingAddress,
            memo: shippingMemo
        } : undefined;

        await requestDirectPurchase(item, shippingInfo);
    };

    const actionButtons = (isMobileSticky = false) => (
        <div className="flex gap-2 w-full">
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
                className="flex-1 py-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold rounded-2xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 text-sm"
            >
                {cartAdding ? <Loader2 className="animate-spin" size={18} /> : <ShoppingCart size={18} />}
                장바구니
            </button>

            <button
                onClick={handleBuyNow}
                disabled={isSoldOut || paymentLoading}
                className="flex-1 py-4 bg-slate-900 hover:bg-black text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-slate-200 transition-colors disabled:opacity-50 text-sm"
            >
                {paymentLoading ? (
                    <Loader2 className="animate-spin" size={18} />
                ) : (
                    <Zap size={18} className="fill-white text-white" />
                )}
                {isSoldOut ? '품절' : '바로 구매'}
            </button>
        </div>
    );

    return (
        <div className="bg-white min-h-screen pb-24 md:pb-24">
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

                            <div className="flex items-center gap-3 flex-wrap">
                                {product.discount_price !== undefined && product.discount_price !== null && product.discount_price > 0 && product.discount_price < product.price ? (
                                    <>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-3xl font-black text-violet-600">
                                                ₩{product.discount_price.toLocaleString()}
                                            </span>
                                            <span className="text-sm font-bold text-slate-400 line-through">
                                                ₩{product.price.toLocaleString()}
                                            </span>
                                        </div>
                                        <span className="px-2.5 py-1 bg-red-50 text-red-500 rounded-xl text-xs font-black border border-red-100">
                                            {Math.round(((product.price - product.discount_price) / product.price) * 100)}% 할인
                                        </span>
                                    </>
                                ) : (
                                    <span className="text-3xl font-black text-violet-600">
                                        ₩{product.price.toLocaleString()}
                                    </span>
                                )}
                            </div>

                            <div className="border-t border-slate-100 pt-4">
                                <p className="text-slate-650 text-sm leading-relaxed whitespace-pre-line font-medium">
                                    {product.description}
                                </p>
                            </div>
                        </div>

                        {/* Quantity Selector & Shipping Address */}
                        <div className="space-y-6 mt-6 border-t border-slate-100 pt-6">
                            {/* Options Selector */}
                            {!isSoldOut && product.options && product.options.length > 0 && (
                                <div className="space-y-4 bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
                                    <h4 className="font-bold text-slate-700 text-sm">옵션 선택</h4>
                                    {product.options.map((opt, idx) => (
                                        <div key={idx} className="space-y-1.5">
                                            <label className="block text-xs font-bold text-slate-500">{opt.name}</label>
                                            <select
                                                value={selectedOptions[opt.name] || ''}
                                                onChange={e => setSelectedOptions(prev => ({ ...prev, [opt.name]: e.target.value }))}
                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-violet-500 font-semibold bg-white text-sm"
                                            >
                                                <option value="">{opt.name} 선택</option>
                                                {opt.values.map((val, vIdx) => (
                                                    <option key={vIdx} value={val}>{val}</option>
                                                ))}
                                            </select>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {!isSoldOut && (
                                <div className="flex justify-between items-center bg-slate-50/70 p-4 rounded-2xl">
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

                            {/* Shipping info Accordion Form */}
                            {!isSoldOut && product.product_type === 'physical' && (
                                <div className="bg-slate-50/50 rounded-3xl border border-slate-100/80 overflow-hidden transition-all duration-300">
                                    <button
                                        type="button"
                                        onClick={() => setIsShippingOpen(!isShippingOpen)}
                                        className="w-full p-5 flex justify-between items-center font-bold text-slate-800 text-sm hover:bg-slate-100/30 transition-colors"
                                    >
                                        <span className="flex items-center gap-2">
                                            <Truck size={16} className="text-violet-600" />
                                            배송지 정보 입력 {(!shippingName.trim() || !shippingPhone.trim() || !shippingAddress.trim()) && <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block animate-pulse ml-0.5" />}
                                        </span>
                                        <span className="text-xs text-slate-400 font-bold">
                                            {isShippingOpen ? '접기' : '입력하기 ❯'}
                                        </span>
                                    </button>
                                    
                                    <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isShippingOpen ? 'max-h-[500px] border-t border-slate-100 p-5' : 'max-h-0'}`}>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                                            <div>
                                                <label className="block text-slate-400 font-bold mb-1.5">수령인</label>
                                                <input
                                                    type="text"
                                                    required
                                                    placeholder="이름"
                                                    value={shippingName}
                                                    onChange={e => setShippingName(e.target.value)}
                                                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white font-semibold focus:outline-none focus:border-violet-500 text-slate-800 text-xs"
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
                                                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white font-semibold focus:outline-none focus:border-violet-500 text-slate-800 text-xs"
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
                                                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white font-semibold focus:outline-none focus:border-violet-500 text-slate-800 text-xs"
                                                />
                                            </div>
                                            <div className="sm:col-span-2">
                                                <label className="block text-slate-400 font-bold mb-1.5">배송 요청사항 (선택)</label>
                                                <input
                                                    type="text"
                                                    placeholder="부재 시 문앞에 놓아주세요"
                                                    value={shippingMemo}
                                                    onChange={e => setShippingMemo(e.target.value)}
                                                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white font-semibold focus:outline-none focus:border-violet-500 text-slate-800 text-xs"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Total price & Actions (Desktop only) */}
                            <div className="space-y-4">
                                {!isSoldOut && (
                                    <div className="flex justify-between items-baseline">
                                        <span className="font-bold text-slate-500 text-sm">최종 결제 금액</span>
                                        <span className="text-2xl font-black text-slate-900">
                                            ₩{(currentPrice * quantity).toLocaleString()}
                                        </span>
                                    </div>
                                )}

                                <div className="hidden md:block">
                                    {actionButtons()}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Sticky CTA Footer */}
            {!isSoldOut && (
                <div className="md:hidden fixed bottom-0 left-0 right-0 z-[99] bg-white/95 backdrop-blur-md border-t border-slate-150 p-4 pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.05)] flex flex-col gap-3">
                    <div className="flex justify-between items-center px-1">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">최종 결제 금액 ({quantity}개)</span>
                            <span className="text-lg font-black text-violet-600">₩{(currentPrice * quantity).toLocaleString()}</span>
                        </div>
                        {product.product_type === 'physical' && (
                            <button
                                onClick={() => setIsShippingOpen(!isShippingOpen)}
                                className={`text-[11px] font-bold px-3 py-1.5 rounded-lg border transition-colors ${
                                    isShippingOpen ? 'bg-slate-100 border-slate-200 text-slate-700' : 'bg-violet-50 border-violet-100 text-violet-600'
                                }`}
                            >
                                {isShippingOpen ? '배송지 닫기' : '배송지 정보 입력'}
                            </button>
                        )}
                    </div>
                    {actionButtons(true)}
                </div>
            )}
        </div>
    );
};

export default ProductDetailPage;
