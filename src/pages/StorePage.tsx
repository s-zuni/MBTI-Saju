import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, ArrowLeft, Check, Loader2 } from 'lucide-react';
import { requestPayment } from '../utils/paymentHandlers';
import { supabase } from '../supabaseClient';

const CREDIT_PACKAGES = [
    { id: 'credit_100', name: '100 크레딧', price: 1000, amount: 100, popular: false },
    { id: 'credit_500', name: '500 크레딧', price: 4500, amount: 500, popular: true },
    { id: 'credit_1000', name: '1000 크레딧', price: 8000, amount: 1000, popular: false },
];

const StorePage: React.FC = () => {
    const navigate = useNavigate();
    const [loadingId, setLoadingId] = useState<string | null>(null);

    const handlePurchase = async (pkg: typeof CREDIT_PACKAGES[0]) => {
        try {
            setLoadingId(pkg.id);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                alert("로그인이 필요합니다.");
                navigate('/login');
                return;
            }

            const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

            const currentUserId = user.id;
            
            // [FAILSAFE] 리다이렉트 시 세션 유실이나 파라미터 누락에 대비하여 로컬 스토리지에 임시 저장
            localStorage.setItem('pending_payment_user_id', currentUserId);

            const response = await requestPayment({
                name: pkg.name,
                amount: pkg.price,
                orderId: orderId,
                customerKey: currentUserId,
                metadata: {
                    userId: currentUserId,
                    productId: pkg.id
                },
                successUrl: `${window.location.origin}/payment/success?userId=${currentUserId}`,
                ...(user.email && { customerEmail: user.email }),
            });

            if (!response.success) {
                alert(response.error_msg || "결제에 실패했습니다.");
            }
        } catch (error: any) {
            alert(error.message || "오류가 발생했습니다.");
        } finally {
            setLoadingId(null);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Header */}
            <header className="bg-white px-4 py-4 sticky top-0 z-50 shadow-sm flex items-center gap-3">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
                    <ArrowLeft size={24} className="text-slate-700" />
                </button>
                <h1 className="text-xl font-bold text-slate-800">크레딧 충전</h1>
            </header>

            <main className="max-w-xl mx-auto px-4 py-8">
                <div className="text-center mb-10">
                    <div className="bg-indigo-100 text-indigo-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <CreditCard size={32} />
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 mb-2">프리미엄 운세 크레딧</h2>
                    <p className="text-slate-500">필요한 만큼 충전하고 심층 운세를 확인해보세요!</p>
                </div>

                <div className="space-y-4">
                    {CREDIT_PACKAGES.map((pkg) => (
                        <div
                            key={pkg.id}
                            className={`relative bg-white rounded-3xl p-6 border-2 transition-all ${pkg.popular ? 'border-indigo-500 shadow-md transform -translate-y-1' : 'border-slate-100 hover:border-indigo-200'}`}
                        >
                            {pkg.popular && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-sm">
                                    <Check size={12} /> BEST VALUE
                                </div>
                            )}

                            <div className="flex justify-between items-center">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-xl font-bold text-slate-800">{pkg.name}</h3>
                                    </div>
                                    <p className="text-slate-400 text-sm">{pkg.price.toLocaleString()}원</p>
                                </div>
                                <button
                                    onClick={() => handlePurchase(pkg)}
                                    disabled={loadingId === pkg.id}
                                    className={`px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all ${pkg.popular ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                                >
                                    {loadingId === pkg.id ? <Loader2 className="animate-spin w-5 h-5" /> : '구매하기'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-12 p-6 bg-white rounded-3xl border border-slate-100 shadow-sm">
                    <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-sm">
                        <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                        결제 및 환불 안내
                    </h4>
                    <ul className="space-y-2 text-xs text-slate-500 leading-relaxed font-medium">
                        <li>• 충전한 크레딧의 유효기간 및 환불 가능 기간은 결제일로부터 1년입니다.</li>
                        <li>• 환불 시 결제 시 사용된 동일한 결제 수단으로 환불됩니다.</li>
                        <li>• 크레딧은 회원 본인만 사용 가능하며 타인에게 양도할 수 없습니다.</li>
                        <li>• 1회 최대 충전 가능 금액은 100,000원입니다.</li>
                    </ul>
                </div>
            </main>
        </div>
    );
};

export default StorePage;
