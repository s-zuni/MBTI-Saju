import React from 'react';
import { X, AlertTriangle } from 'lucide-react';
import type { CreditPurchase } from '../hooks/useCredits';

interface RefundRequestModalProps {
    isOpen: boolean;
    purchase: CreditPurchase | null;
    onClose: () => void;
    onConfirm: () => void;
}

const RefundRequestModal: React.FC<RefundRequestModalProps> = ({
    isOpen,
    purchase,
    onClose,
    onConfirm,
}) => {
    if (!isOpen || !purchase) return null;

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric', month: '2-digit', day: '2-digit',
        });
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-red-500 to-rose-600 p-6 text-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                                <AlertTriangle className="w-5 h-5" />
                            </div>
                            <h2 className="text-xl font-bold">환불 요청</h2>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="p-6">
                    {/* Purchase Info */}
                    <div className="bg-slate-50 rounded-xl p-4 mb-6">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-slate-500">구매 크레딧</span>
                            <span className="font-bold text-slate-900">{purchase.purchased_credits} 크레딧</span>
                        </div>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-slate-500">결제 금액</span>
                            <span className="font-bold text-slate-900">₩{purchase.price_paid.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-500">구매일</span>
                            <span className="font-medium text-slate-700">{formatDate(purchase.purchased_at)}</span>
                        </div>
                    </div>

                    {/* Warning */}
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                        <p className="text-sm text-amber-800 font-medium">
                            ⚠️ 환불 요청 시 해당 구매건의 크레딧은 즉시 사용이 중지되며, 관리자 승인 후 환불이 처리됩니다.
                        </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 border border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors"
                        >
                            취소
                        </button>
                        <button
                            onClick={onConfirm}
                            className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors"
                        >
                            환불 요청
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RefundRequestModal;
