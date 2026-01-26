import React, { useState } from 'react';
import { X, Coins, Sparkles, Check, Zap } from 'lucide-react';
import { COIN_PACKAGES, CoinPackage, getDiscountDaysRemaining } from '../config/coinConfig';
import { requestPayment } from '../utils/paymentHandlers';

interface CoinPurchaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    userEmail: string | undefined;
    onSuccess: (coins: number, paymentId: string, packageId: string) => void;
    requiredCoins?: number;
    currentCoins?: number;
}

const CoinPurchaseModal: React.FC<CoinPurchaseModalProps> = ({
    isOpen,
    onClose,
    userEmail,
    onSuccess,
    requiredCoins,
    currentCoins = 0
}) => {
    const [selectedPackage, setSelectedPackage] = useState<CoinPackage | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    if (!isOpen) return null;

    const discountDays = getDiscountDaysRemaining();
    const needsMore = requiredCoins ? requiredCoins - currentCoins : 0;

    const handlePurchase = async (pkg: CoinPackage) => {
        if (!userEmail) {
            alert('로그인이 필요합니다.');
            return;
        }

        setSelectedPackage(pkg);
        setIsProcessing(true);

        try {
            const { success, error_msg, imp_uid } = await requestPayment({
                name: `코인 ${pkg.coins}개 충전`,
                amount: pkg.price,
                buyer_email: userEmail,
                buyer_name: '사용자',
                buyer_tel: '010-0000-0000',
            });

            if (success && imp_uid) {
                onSuccess(pkg.coins, imp_uid, pkg.id);
                onClose();
            } else {
                alert(`결제 실패: ${error_msg}`);
            }
        } catch (e) {
            console.error(e);
            alert('결제 처리 중 오류가 발생했습니다.');
        } finally {
            setIsProcessing(false);
            setSelectedPackage(null);
        }
    };

    const getDiscountPercent = (pkg: CoinPackage): number => {
        return Math.round((1 - pkg.price / pkg.originalPrice) * 100);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl animate-fade-in-up">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 bg-black/5 rounded-full hover:bg-black/10 transition-colors z-10"
                >
                    <X className="w-5 h-5 text-slate-500" />
                </button>

                {/* Header */}
                <div className="bg-gradient-to-r from-amber-400 to-orange-500 p-6 text-white">
                    <div className="flex items-center gap-2 mb-2">
                        <Coins className="w-6 h-6" />
                        <h3 className="text-xl font-bold">코인 충전</h3>
                    </div>
                    <p className="text-amber-100 text-sm">
                        코인으로 다양한 운세 서비스를 이용하세요
                    </p>

                    {/* Discount Banner */}
                    <div className="mt-4 bg-white/20 backdrop-blur-sm rounded-xl p-3 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-yellow-200 animate-pulse" />
                        <span className="text-sm font-bold">
                            🎉 3개월 특별 할인 이벤트 진행중!
                            {discountDays !== null && ` (${discountDays}일 남음)`}
                        </span>
                    </div>
                </div>

                {/* Coin Shortage Warning */}
                {requiredCoins && needsMore > 0 && (
                    <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-100 rounded-xl">
                        <p className="text-sm text-red-600 font-medium">
                            💡 이 서비스 이용에 <span className="font-bold">{requiredCoins}코인</span>이 필요합니다.
                            현재 {currentCoins}코인 보유 중 (<span className="font-bold">{needsMore}코인</span> 부족)
                        </p>
                    </div>
                )}

                {/* Packages */}
                <div className="p-6 space-y-3">
                    {COIN_PACKAGES.map((pkg, index) => {
                        const discountPercent = getDiscountPercent(pkg);
                        const isRecommended = index === 0; // 100코인 추천
                        const meetsRequirement = requiredCoins ? (currentCoins + pkg.coins >= requiredCoins) : true;

                        return (
                            <button
                                key={pkg.id}
                                onClick={() => handlePurchase(pkg)}
                                disabled={isProcessing}
                                className={`
                  w-full p-4 rounded-2xl border-2 transition-all duration-200
                  flex items-center justify-between group
                  ${isRecommended
                                        ? 'border-amber-400 bg-amber-50 hover:bg-amber-100'
                                        : 'border-slate-200 bg-white hover:border-amber-300 hover:bg-amber-50/50'
                                    }
                  ${isProcessing && selectedPackage?.id === pkg.id ? 'opacity-70' : ''}
                  ${meetsRequirement && requiredCoins ? 'ring-2 ring-green-400 ring-offset-1' : ''}
                `}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`
                    w-12 h-12 rounded-xl flex items-center justify-center
                    ${isRecommended
                                            ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white'
                                            : 'bg-slate-100 text-slate-600'
                                        }
                  `}>
                                        <Coins className="w-6 h-6" />
                                    </div>
                                    <div className="text-left">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-slate-900">{pkg.coins} 코인</span>
                                            {isRecommended && (
                                                <span className="px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full animate-pulse">
                                                    BEST
                                                </span>
                                            )}
                                            {meetsRequirement && requiredCoins && (
                                                <Check className="w-4 h-4 text-green-500" />
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-slate-400 text-sm line-through">
                                                ₩{pkg.originalPrice.toLocaleString()}
                                            </span>
                                            <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded">
                                                {discountPercent}% OFF
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <div className="text-lg font-bold text-slate-900">
                                        ₩{pkg.price.toLocaleString()}
                                    </div>
                                    <div className="text-[11px] text-slate-500">
                                        {Math.round(pkg.price / pkg.coins)}원/코인
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Current Balance */}
                <div className="px-6 pb-6">
                    <div className="flex items-center justify-center gap-2 p-3 bg-slate-50 rounded-xl">
                        <Zap className="w-4 h-4 text-amber-500" />
                        <span className="text-sm text-slate-600">
                            현재 보유: <span className="font-bold text-slate-900">{currentCoins} 코인</span>
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CoinPurchaseModal;
