import React, { useState } from 'react';
import { X, Loader2, CreditCard, MapPin } from 'lucide-react';
import { useShopPayment, ShopPaymentItem } from '../hooks/useShopPayment';

interface ShopCheckoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    items: ShopPaymentItem[];
}

const ShopCheckoutModal: React.FC<ShopCheckoutModalProps> = ({ isOpen, onClose, items }) => {
    const { requestShopPayment, loading: paymentLoading } = useShopPayment();

    // Form fields
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [roadAddress, setRoadAddress] = useState('');
    const [detailAddress, setDetailAddress] = useState('');
    const [memo, setMemo] = useState('');

    const hasPhysicalProduct = items.some(item => item.product_type === 'physical');

    // Calculations
    const subtotal = items.reduce((sum, item) => sum + item.product_price * item.quantity, 0);
    const physicalTotal = items
        .filter(item => item.product_type === 'physical')
        .reduce((sum, item) => sum + item.product_price * item.quantity, 0);
    const shippingFee = (hasPhysicalProduct && physicalTotal < 50000) ? 3000 : 0;
    const finalTotal = subtotal + shippingFee;

    const loadDaumPostcode = (): Promise<boolean> => {
        return new Promise((resolve) => {
            if ((window as any).daum && (window as any).daum.Postcode) {
                resolve(true);
                return;
            }
            const script = document.createElement('script');
            script.src = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
            script.async = true;
            script.onload = () => resolve(true);
            document.body.appendChild(script);
        });
    };

    const handleSearchAddress = async () => {
        await loadDaumPostcode();
        new (window as any).daum.Postcode({
            oncomplete: (data: any) => {
                setRoadAddress(data.roadAddress);
            }
        }).open();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (hasPhysicalProduct) {
            if (!name.trim() || !phone.trim() || !roadAddress.trim()) {
                alert('배송지 정보를 모두 입력해주세요.');
                return;
            }
        }

        const shippingInfo = hasPhysicalProduct ? {
            name: name.trim(),
            phone: phone.trim(),
            address: `${roadAddress} ${detailAddress.trim()}`.trim(),
            memo: memo.trim()
        } : undefined;

        await requestShopPayment(items, shippingInfo);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] border border-slate-100 animate-fade-in">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                        <CreditCard className="text-violet-600" size={20} />
                        주문서 작성
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:bg-slate-50 rounded-xl transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 text-sm font-semibold">
                    {/* Item list brief */}
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                        <h4 className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">주문 상품 정보</h4>
                        <div className="divide-y divide-slate-100 max-h-32 overflow-y-auto pr-1">
                            {items.map((item, idx) => (
                                <div key={idx} className="py-2 flex justify-between text-xs text-slate-700">
                                    <span className="truncate pr-4">
                                        {item.product_name}
                                        {item.selected_option && <span className="text-[10px] text-slate-400 ml-1">({item.selected_option})</span>}
                                    </span>
                                    <span className="font-bold text-slate-900 shrink-0">
                                        ₩{item.product_price.toLocaleString()} x {item.quantity}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Shipping form (Only if physical product exists) */}
                    {hasPhysicalProduct ? (
                        <div className="space-y-3.5">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                <MapPin size={14} className="text-violet-600" />
                                배송 정보 입력 (필수)
                            </h4>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5">수령인 *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="이름을 입력해주세요"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:border-violet-500 font-semibold"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5">연락처 *</label>
                                <input
                                    type="tel"
                                    required
                                    placeholder="ex) 010-0000-0000"
                                    value={phone}
                                    onChange={e => setPhone(e.target.value)}
                                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:border-violet-500 font-semibold"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5">배송 주소 *</label>
                                <div className="flex gap-2 mb-2">
                                    <input
                                        type="text"
                                        readOnly
                                        required
                                        placeholder="주소찾기 버튼을 눌러주세요"
                                        value={roadAddress}
                                        className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 font-semibold text-slate-600 focus:outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleSearchAddress}
                                        className="px-5 py-3 bg-slate-900 hover:bg-black text-white text-xs rounded-2xl transition-all font-bold shrink-0"
                                    >
                                        주소찾기
                                    </button>
                                </div>
                                <input
                                    type="text"
                                    placeholder="상세 주소를 입력해주세요"
                                    value={detailAddress}
                                    onChange={e => setDetailAddress(e.target.value)}
                                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:border-violet-500 font-semibold"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5">배송 요청사항 (선택)</label>
                                <input
                                    type="text"
                                    placeholder="부재 시 문앞에 놓아주세요"
                                    value={memo}
                                    onChange={e => setMemo(e.target.value)}
                                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:border-violet-500 font-semibold"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl text-xs font-bold">
                            📦 디지털 상품 주문으로 별도의 배송지가 필요하지 않습니다. 결제 성공 후 즉시 제공됩니다.
                        </div>
                    )}

                    {/* Order summary calculations */}
                    <div className="border-t border-slate-100 pt-4 space-y-2">
                        <div className="flex justify-between text-xs text-slate-500">
                            <span>상품 금액 합계</span>
                            <span>₩{subtotal.toLocaleString()}</span>
                        </div>
                        {hasPhysicalProduct && (
                            <div className="flex justify-between text-xs text-slate-500">
                                <span>배송비</span>
                                <span>{shippingFee > 0 ? `₩${shippingFee.toLocaleString()}` : '무료'}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-baseline pt-2 border-t border-dashed border-slate-100">
                            <span className="text-sm font-bold text-slate-800">최종 결제 금액</span>
                            <span className="text-xl font-black text-violet-600">₩{finalTotal.toLocaleString()}</span>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-2 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-4 bg-slate-50 text-slate-500 font-bold rounded-2xl hover:bg-slate-100 transition-colors"
                        >
                            취소
                        </button>
                        <button
                            type="submit"
                            disabled={paymentLoading}
                            className="flex-1 py-4 bg-violet-600 hover:bg-violet-750 text-white font-bold rounded-2xl shadow-lg shadow-violet-100 flex items-center justify-center gap-2 transition-all"
                        >
                            {paymentLoading ? (
                                <Loader2 className="animate-spin" size={18} />
                            ) : (
                                <CreditCard size={18} />
                            )}
                            결제하기
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ShopCheckoutModal;
