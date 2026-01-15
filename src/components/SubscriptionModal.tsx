import React from 'react';
import { X, Check, Star, Zap, Crown } from 'lucide-react';
import { requestPayment } from '../utils/paymentHandlers';
import { supabase } from '../supabaseClient';
import { Tier } from '../hooks/useSubscription';

interface SubscriptionModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentTier: Tier;
    userEmail?: string;
    onSuccess: () => void; // Refresh subscription state
}

const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ isOpen, onClose, currentTier, userEmail, onSuccess }) => {
    if (!isOpen) return null;

    const handleUpgrade = async (targetTier: 'basic' | 'deep', price: number, planName: string) => {
        if (!userEmail) {
            alert('로그인이 필요합니다.');
            return;
        }

        try {
            const { success, error_msg, imp_uid, merchant_uid } = await requestPayment({
                name: `구독: ${planName}`,
                amount: price,
                buyer_email: userEmail,
                buyer_name: '사용자', // Should be passed if available
                buyer_tel: '010-0000-0000', // Optional
            });

            if (success) {
                // Update DB
                const { error } = await supabase
                    .from('profiles')
                    .update({
                        tier: targetTier,
                        expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // +30 days
                    })
                    .eq('id', (await supabase.auth.getUser()).data.user?.id);

                if (error) throw error;

                alert('구독이 완료되었습니다! 모든 기능을 자유롭게 이용하세요.');
                onSuccess();
                onClose();
            } else {
                alert(`결제 실패: ${error_msg}`);
            }
        } catch (e) {
            console.error(e);
            alert('결제 처리 중 오류가 발생했습니다.');
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-4xl bg-white rounded-3xl overflow-hidden shadow-2xl animate-fade-in-up flex flex-col md:flex-row max-h-[90vh] md:max-h-none overflow-y-auto md:overflow-visible">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 bg-black/5 rounded-full hover:bg-black/10 transition-colors z-10"
                >
                    <X className="w-5 h-5 text-slate-500" />
                </button>

                {/* BASIC PLAN */}
                <div className="flex-1 p-6 md:p-8 border-b md:border-b-0 md:border-r border-slate-100 flex flex-col relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-indigo-500"></div>
                    <div className="flex items-center gap-2 mb-4">
                        <Zap className="w-6 h-6 text-indigo-500" />
                        <h3 className="text-xl font-bold text-slate-800">Basic</h3>
                        <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded-full">33% OFF</span>
                    </div>
                    <div className="mb-6">
                        <div className="flex items-end gap-2">
                            <span className="text-slate-400 text-lg line-through font-medium">₩5,900</span>
                            <span className="text-3xl font-bold text-slate-900">₩3,900</span>
                        </div>
                        <span className="text-slate-500 text-sm">/월</span>
                    </div>

                    <ul className="space-y-3 mb-8 flex-1">
                        <li className="flex items-start gap-2 text-sm text-slate-600">
                            <Check className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                            <span>MBTI & 사주 융합 정밀 분석</span>
                        </li>
                        <li className="flex items-start gap-2 text-sm text-slate-600">
                            <Check className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                            <span>맞춤형 힐링/여행/직업 추천</span>
                        </li>
                        <li className="flex items-start gap-2 text-sm text-slate-600">
                            <Check className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                            <span>친구와의 궁합 정밀 분석</span>
                        </li>
                        <li className="flex items-start gap-2 text-sm text-slate-400">
                            <X className="w-4 h-4 shrink-0 mt-0.5" />
                            <span className="line-through">AI 점술가 심층 상담</span>
                        </li>
                        <li className="flex items-start gap-2 text-sm text-slate-400">
                            <X className="w-4 h-4 shrink-0 mt-0.5" />
                            <span className="line-through">타로 카드 운세</span>
                        </li>
                    </ul>

                    <button
                        onClick={() => handleUpgrade('basic', 3900, 'Basic Plan (Discount)')}
                        disabled={currentTier === 'basic' || currentTier === 'deep'}
                        className={`w-full py-3 rounded-xl font-bold transition-all ${currentTier === 'basic'
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:scale-[1.02]'
                            }`}
                    >
                        {currentTier === 'basic' ? '현재 이용 중' : currentTier === 'deep' ? '상위 플랜 이용 중' : 'Basic 시작하기'}
                    </button>
                </div>

                {/* DEEP PLAN */}
                <div className="flex-1 p-6 md:p-8 flex flex-col relative overflow-hidden bg-gradient-to-b from-slate-900 to-slate-800 text-white">
                    <div className="absolute top-0 right-0 p-2 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[10px] font-bold rounded-bl-xl shadow-lg">
                        BEST VALUE
                    </div>

                    <div className="flex items-center gap-2 mb-4">
                        <Crown className="w-6 h-6 text-amber-400" />
                        <h3 className="text-xl font-bold text-white">DEEP</h3>
                        <span className="px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full animate-pulse">25% OFF</span>
                    </div>
                    <div className="mb-6">
                        <div className="flex items-end gap-2">
                            <span className="text-slate-500 text-lg line-through font-medium">₩7,900</span>
                            <span className="text-3xl font-bold text-white">₩5,900</span>
                        </div>
                        <span className="text-slate-400 text-sm">/월</span>
                    </div>

                    <ul className="space-y-3 mb-8 flex-1">
                        <li className="flex items-start gap-2 text-sm text-slate-300">
                            <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                            <span className="font-bold text-white">Basic의 모든 기능 포함</span>
                        </li>
                        <li className="flex items-start gap-2 text-sm text-slate-300">
                            <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                            <span>AI 점술가와 무제한 심층 상담</span>
                        </li>
                        <li className="flex items-start gap-2 text-sm text-slate-300">
                            <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                            <span>프리미엄 타로 운세</span>
                        </li>
                        <li className="flex items-start gap-2 text-sm text-slate-300">
                            <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                            <span>우선적인 신기능 액세스 권한</span>
                        </li>
                    </ul>

                    <button
                        onClick={() => handleUpgrade('deep', 5900, 'DEEP Plan (Discount)')}
                        disabled={currentTier === 'deep'}
                        className={`w-full py-3 rounded-xl font-bold shadow-lg shadow-amber-500/20 transition-all ${currentTier === 'deep'
                            ? 'bg-white/10 text-white/50 cursor-not-allowed'
                            : 'bg-gradient-to-r from-amber-400 to-orange-500 text-white hover:scale-[1.02] hover:shadow-amber-500/40'
                            }`}
                    >
                        {currentTier === 'deep' ? '현재 이용 중' : 'DEEP 시작하기'}
                    </button>
                    <p className="text-center text-xs text-slate-500 mt-3">
                        언제든지 해지 가능합니다.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SubscriptionModal;
