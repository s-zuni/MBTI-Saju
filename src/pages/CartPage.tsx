import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShopCart } from '../hooks/useShopCart';
import { useShopPayment } from '../hooks/useShopPayment';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import {
    Trash2,
    Minus,
    Plus,
    Loader2,
    ShoppingBag,
    ArrowLeft,
    Truck,
    CreditCard
} from 'lucide-react';

const CartPage: React.FC = () => {
    const navigate = useNavigate();
    const {
        cart,
        loading,
        removeFromCart,
        updateQuantity,
        totalPrice
    } = useShopCart();

    const { requestShopPayment, loading: paymentLoading } = useShopPayment();

    // Shipping info form
    const [shippingName, setShippingName] = useState('');
    const [shippingPhone, setShippingPhone] = useState('');
    const [shippingAddress, setShippingAddress] = useState('');
    const [shippingMemo, setShippingMemo] = useState('');

    const [isShippingExpanded, setIsShippingExpanded] = useState(true);

    const hasPhysicalProduct = cart.some(item => item.product?.product_type === 'physical');

    // Calculate shipping fee
    const physicalTotal = cart
        .filter(item => item.product?.product_type === 'physical')
        .reduce((sum, item) => {
            const prod = item.product;
            if (!prod) return sum;
            const price = (prod.discount_price !== undefined && prod.discount_price !== null && prod.discount_price > 0 && prod.discount_price < prod.price)
                ? prod.discount_price
                : prod.price;
            return sum + price * item.quantity;
        }, 0);

    const shippingFee = (hasPhysicalProduct && physicalTotal < 50000) ? 3000 : 0;
    const finalTotal = totalPrice + shippingFee;

    const freeShippingThreshold = 50000;
    const amountNeededForFreeShipping = freeShippingThreshold - physicalTotal;

    const handleCheckout = async () => {
        if (cart.length === 0) {
            alert('장바구니가 비어 있습니다.');
            return;
        }

        if (hasPhysicalProduct) {
            if (!shippingName.trim() || !shippingPhone.trim() || !shippingAddress.trim()) {
                alert('배송지 정보를 모두 입력해주세요.');
                return;
            }
        }

        const items = cart.map(item => {
            const prod = item.product;
            const price = (prod?.discount_price !== undefined && prod?.discount_price !== null && prod?.discount_price > 0 && prod?.discount_price < (prod?.price ?? 0))
                ? prod.discount_price
                : (prod?.price ?? 0);
            return {
                product_id: item.product_id,
                product_name: prod?.name ?? '상품',
                product_price: price,
                quantity: item.quantity,
                selected_option: item.selected_option ?? undefined,
                product_type: prod?.product_type
            };
        });

        const shippingInfo = hasPhysicalProduct ? {
            name: shippingName,
            phone: shippingPhone,
            address: shippingAddress,
            memo: shippingMemo
        } : undefined;

        await requestShopPayment(items, shippingInfo);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="animate-spin text-violet-600" size={32} />
            </div>
        );
    }

    return (
        <div className="bg-slate-50 min-h-screen pb-24">
            <Navbar />
            
            <div className="max-w-6xl mx-auto px-4 py-24">
                {/* Back Link */}
                <button
                    onClick={() => navigate('/shop')}
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold text-sm mb-6 transition-colors"
                >
                    <ArrowLeft size={16} />
                    상점으로 돌아가기
                </button>

                <h1 className="text-3xl font-black text-slate-900 mb-8 flex items-center gap-2">
                    <ShoppingBag className="text-violet-600" />
                    장바구니
                </h1>

                {cart.length === 0 ? (
                    <div className="bg-white rounded-3xl p-16 text-center border border-slate-100 max-w-lg mx-auto shadow-sm">
                        <ShoppingBag size={48} className="mx-auto text-slate-300 mb-4" />
                        <h2 className="text-lg font-black text-slate-800">장바구니가 비어 있습니다.</h2>
                        <p className="text-sm text-slate-400 mt-1">상점의 멋진 상품들을 담아보세요!</p>
                        <button
                            onClick={() => navigate('/shop')}
                            className="mt-6 px-6 py-3 bg-violet-600 hover:bg-violet-750 text-white rounded-2xl font-bold text-sm shadow-lg shadow-violet-100 transition-colors"
                        >
                            쇼핑하러 가기
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                        {/* Cart items list */}
                        <div className="lg:col-span-2 space-y-4">
                            <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
                                <div className="divide-y divide-slate-100">
                                    {cart.map(item => {
                                        if (!item.product) return null;
                                        return (
                                            <div key={item.id} className="p-5 flex gap-4 items-center">
                                                {/* Image */}
                                                <div className="w-20 h-20 rounded-2xl overflow-hidden border border-slate-100 flex-shrink-0 bg-slate-50">
                                                    {item.product.thumbnail_url ? (
                                                        <img
                                                            src={item.product.thumbnail_url}
                                                            alt={item.product.name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                            <ShoppingBag size={24} />
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Details */}
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-bold text-slate-800 text-sm md:text-base truncate">
                                                        {item.product.name}
                                                    </h3>
                                                    {item.selected_option && (
                                                        <p className="text-xs text-slate-400 font-semibold mt-0.5">
                                                            옵션: {item.selected_option}
                                                        </p>
                                                    )}
                                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                        {item.product.discount_price !== undefined && item.product.discount_price !== null && item.product.discount_price > 0 && item.product.discount_price < item.product.price ? (
                                                            <>
                                                                <span className="text-sm font-black text-violet-600">
                                                                    ₩{item.product.discount_price.toLocaleString()}
                                                                </span>
                                                                <span className="text-xs text-slate-405 line-through">
                                                                    ₩{item.product.price.toLocaleString()}
                                                                </span>
                                                                <span className="text-[10px] px-1.5 py-0.5 bg-red-50 text-red-500 rounded font-black border border-red-100">
                                                                    {Math.round(((item.product.price - item.product.discount_price) / item.product.price) * 100)}%
                                                                </span>
                                                            </>
                                                        ) : (
                                                            <span className="text-sm font-black text-violet-600">
                                                                ₩{item.product.price.toLocaleString()}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Quantity Selector */}
                                                <div className="flex items-center gap-3 bg-slate-50 rounded-xl border border-slate-200/50 p-1">
                                                    <button
                                                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                        className="p-1.5 hover:bg-white text-slate-500 rounded-lg transition-colors"
                                                    >
                                                        <Minus size={12} />
                                                    </button>
                                                    <span className="font-black text-slate-800 text-xs w-6 text-center">
                                                        {item.quantity}
                                                    </span>
                                                    <button
                                                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                        disabled={item.quantity >= item.product.stock}
                                                        className="p-1.5 hover:bg-white text-slate-500 rounded-lg transition-colors disabled:opacity-30"
                                                    >
                                                        <Plus size={12} />
                                                    </button>
                                                </div>

                                                {/* Delete Button */}
                                                <button
                                                    onClick={() => removeFromCart(item.id)}
                                                    className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Shipping address form (Accordion style) */}
                            {hasPhysicalProduct && (
                                <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
                                    <button
                                        type="button"
                                        onClick={() => setIsShippingExpanded(!isShippingExpanded)}
                                        className="w-full p-5 flex justify-between items-center font-bold text-slate-800 text-sm hover:bg-slate-50 transition-colors"
                                    >
                                        <span className="flex items-center gap-2">
                                            <Truck size={16} className="text-violet-600" />
                                            배송지 정보 입력 {(!shippingName.trim() || !shippingPhone.trim() || !shippingAddress.trim()) && <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block animate-pulse ml-0.5" />}
                                        </span>
                                        <span className="text-xs text-slate-400 font-bold">
                                            {isShippingExpanded ? '접기' : '입력하기 ❯'}
                                        </span>
                                    </button>

                                    {isShippingExpanded && (
                                        <div className="p-5 border-t border-slate-100 bg-slate-50/30">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
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
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Order Summary */}
                        <div className="space-y-4">
                            <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-4">
                                <h3 className="font-black text-slate-800 text-base border-b border-slate-100 pb-3">주문 요약</h3>
                                
                                <div className="space-y-2.5 text-sm">
                                    <div className="flex justify-between font-bold text-slate-500">
                                        <span>상품 합계</span>
                                        <span className="text-slate-800">₩{totalPrice.toLocaleString()}</span>
                                    </div>
                                    
                                    {hasPhysicalProduct && (
                                        <div className="flex justify-between font-bold text-slate-500">
                                            <span>배송비</span>
                                            <span className="text-slate-800">
                                                {shippingFee > 0 ? `₩${shippingFee.toLocaleString()}` : '무료배송'}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Free shipping alert bar */}
                                {hasPhysicalProduct && shippingFee > 0 && amountNeededForFreeShipping > 0 && (
                                    <div className="bg-violet-50 text-violet-600 rounded-2xl p-3.5 text-xs font-bold leading-relaxed">
                                        💡 <strong>₩{amountNeededForFreeShipping.toLocaleString()}</strong>원 더 담으시면 <strong>무료배송</strong>이 가능해요!
                                    </div>
                                )}

                                <div className="border-t border-slate-100 pt-4 flex justify-between items-baseline">
                                    <span className="font-bold text-slate-800">총 결제금액</span>
                                    <span className="text-2xl font-black text-violet-600">₩{finalTotal.toLocaleString()}</span>
                                </div>

                                <button
                                    onClick={handleCheckout}
                                    disabled={paymentLoading}
                                    className="w-full py-4 bg-slate-900 hover:bg-black disabled:opacity-50 text-white font-bold rounded-2xl shadow-lg shadow-slate-100 flex items-center justify-center gap-2 transition-all mt-4"
                                >
                                    {paymentLoading ? (
                                        <Loader2 className="animate-spin" size={18} />
                                    ) : (
                                        <CreditCard size={18} />
                                    )}
                                    결제하기
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            
            <Footer />
        </div>
    );
};

export default CartPage;
