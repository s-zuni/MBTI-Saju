import React, { useState } from 'react';
import { X, Check, Loader2, Sparkles } from 'lucide-react';
import { requestPayment } from '../payment';
import { CONSULTATION_PACKAGES } from '../config/creditConfig';
import { supabase } from '../supabaseClient';

interface ConsultationPurchaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    userEmail?: string | undefined;
    onSuccess: (planId: string, pricePaid: number, questionsGranted: number, paymentId: string) => void;
}

const ConsultationPurchaseModal: React.FC<ConsultationPurchaseModalProps> = ({
    isOpen,
    onClose,
    userEmail,
    onSuccess
}) => {
    const [selectedPlan, setSelectedPlan] = useState<string>(CONSULTATION_PACKAGES.PACKAGE.id);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handlePurchase = async () => {
        setIsProcessing(true);
        setError(null);

        const plan = selectedPlan === CONSULTATION_PACKAGES.PACKAGE.id 
            ? CONSULTATION_PACKAGES.PACKAGE 
            : CONSULTATION_PACKAGES.EXTRA;

        try {
            const timestamp = Date.now();
            const random = Math.floor(Math.random() * 1000);
            const orderId = `CONSULTATION_${timestamp}_${random}`; // 결제 완료 페이지 식별용 접두사

            // 유저 ID를 기반으로 customerKey 생성
            const { data: { user } } = await supabase.auth.getUser();
            const customerKey = user?.id.replace(/[^a-zA-Z0-9_\-:]/g, '').substring(0, 50) || 'ANONYMOUS';

            const paymentResult = await requestPayment({
                name: plan.name,
                amount: plan.price,
                orderId: orderId,
                customerKey: customerKey,
                customerEmail: userEmail || 'user@example.com',
                metadata: { productId: plan.id },
            });

            if (!paymentResult.success && paymentResult.error_msg) {
                // 사용자가 취소한 경우 등
                if (paymentResult.error_msg.includes('취소')) {
                    return;
                }
                throw new Error(paymentResult.error_msg || '결제가 실패했습니다.');
            }
            
            // 리다이렉트 방식이므로 아래 코드는 실행되지 않음
        } catch (err: any) {
            console.error('Payment Error:', err);
            setError(err.message || '결제 처리 중 오류가 발생했습니다.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={!isProcessing ? onClose : undefined} />
            
            <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6">
                    <button 
                        onClick={onClose}
                        disabled={isProcessing}
                        className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors disabled:opacity-50"
                    >
                        <X size={20} />
                    </button>

                    <div className="mb-6">
                        <div className="w-12 h-12 bg-violet-100 text-violet-600 rounded-2xl flex items-center justify-center mb-4">
                            <Sparkles size={24} />
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 mb-2">전문가 심층 상담권</h2>
                        <p className="text-slate-500 text-sm font-medium">
                            공인된 전문가가 사주와 MBTI를 결합하여 맞춤형 운명 상담을 제공합니다.
                        </p>
                    </div>

                    <div className="space-y-3 mb-6">
                        {/* 3회권 패키지 */}
                        <div 
                            onClick={() => setSelectedPlan(CONSULTATION_PACKAGES.PACKAGE.id)}
                            className={`relative p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                                selectedPlan === CONSULTATION_PACKAGES.PACKAGE.id 
                                ? 'border-violet-600 bg-violet-50' 
                                : 'border-slate-200 hover:border-violet-200 bg-white'
                            }`}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-slate-900">{CONSULTATION_PACKAGES.PACKAGE.name}</h3>
                                        <span className="px-2 py-0.5 bg-violet-600 text-white text-[10px] font-bold rounded">추천</span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">{CONSULTATION_PACKAGES.PACKAGE.description}</p>
                                </div>
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                    selectedPlan === CONSULTATION_PACKAGES.PACKAGE.id ? 'border-violet-600' : 'border-slate-300'
                                }`}>
                                    {selectedPlan === CONSULTATION_PACKAGES.PACKAGE.id && <div className="w-2.5 h-2.5 bg-violet-600 rounded-full" />}
                                </div>
                            </div>
                            <div className="mt-3 text-lg font-black text-violet-700">
                                {CONSULTATION_PACKAGES.PACKAGE.price.toLocaleString()}원
                            </div>
                        </div>

                        {/* 1회 추가권 */}
                        <div 
                            onClick={() => setSelectedPlan(CONSULTATION_PACKAGES.EXTRA.id)}
                            className={`relative p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                                selectedPlan === CONSULTATION_PACKAGES.EXTRA.id 
                                ? 'border-violet-600 bg-violet-50' 
                                : 'border-slate-200 hover:border-violet-200 bg-white'
                            }`}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <div>
                                    <h3 className="font-bold text-slate-900">{CONSULTATION_PACKAGES.EXTRA.name}</h3>
                                    <p className="text-xs text-slate-500 mt-1">{CONSULTATION_PACKAGES.EXTRA.description}</p>
                                </div>
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                    selectedPlan === CONSULTATION_PACKAGES.EXTRA.id ? 'border-violet-600' : 'border-slate-300'
                                }`}>
                                    {selectedPlan === CONSULTATION_PACKAGES.EXTRA.id && <div className="w-2.5 h-2.5 bg-violet-600 rounded-full" />}
                                </div>
                            </div>
                            <div className="mt-3 text-lg font-black text-slate-900">
                                {CONSULTATION_PACKAGES.EXTRA.price.toLocaleString()}원
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-rose-50 text-rose-600 text-sm font-medium rounded-xl border border-rose-100">
                            {error}
                        </div>
                    )}

                    <button
                        onClick={handlePurchase}
                        disabled={isProcessing}
                        className="w-full py-4 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl font-black transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-violet-200"
                    >
                        {isProcessing ? (
                            <>
                                <Loader2 className="animate-spin" size={20} />
                                결제 진행 중...
                            </>
                        ) : (
                            <>
                                <Check size={20} />
                                토스페이먼츠로 안전하게 결제하기
                            </>
                        )}
                    </button>
                    <p className="text-center text-[10px] text-slate-400 mt-4">
                        평일 기준 24시간 이내에 답변이 제공되며, 상황에 따라 다소 지연될 수 있습니다.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ConsultationPurchaseModal;

