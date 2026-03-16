import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2, Home, Receipt } from 'lucide-react';
import { supabase } from '../supabaseClient';

const PaymentSuccess: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const paymentKey = searchParams.get('paymentKey');
    const orderId = searchParams.get('orderId');
    const amount = searchParams.get('amount');

    useEffect(() => {
        const confirmAndSync = async () => {
            // 1. 사용자 식별자를 여러 경로에서 시도 (URL -> LocalStorage -> Current Session)
            const userIdFromUrl = searchParams.get('userId');
            const userIdFromStorage = localStorage.getItem('pending_payment_user_id');
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            
            const finalUserId = userIdFromUrl || userIdFromStorage || currentUser?.id;

            if (!paymentKey || !orderId || !amount) {
                setError('결제 정보가 누락되었습니다.');
                setLoading(false);
                return;
            }

            try {
                // 2. 서버리스 함수 호출하여 결제 승인 및 DB 반영
                const response = await fetch('/api/confirm-payment', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        paymentKey,
                        orderId,
                        amount: Number(amount),
                        userId: finalUserId, 
                    }),
                });

                // 승인 요청 후 임시 데이터 삭제 (성공/실패 여부와 상관없이 시도했으므로 정리)
                localStorage.removeItem('pending_payment_user_id');

                const data = await response.json();

                if (!response.ok || data.success === false) {
                    console.error('Failed API Response:', data);
                    throw new Error(data.message || data.error || '결제 승인 중 오류가 발생했습니다.');
                }

                // 3. 세션 및 프로필 데이터 강제 동기화 (크레딧 즉시 반영 핵심)
                await supabase.auth.refreshSession();
                
                // 추가적으로 프로필 데이터를 다시 불러와서 UI 상태를 확실히 함
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                   await supabase.from('profiles').select('*').eq('id', user.id).single();
                }

                setLoading(false);
                
                // 3초 후 내역 페이지로 자동 이동
                setTimeout(() => {
                    navigate('/usage-history', { replace: true });
                }, 3000);

            } catch (err: any) {
                console.error('Payment Confirmation Error:', err);
                setError(err.message || '결제 승인 중 오류가 발생했습니다.');
                setLoading(false);
            }
        };

        confirmAndSync();
    }, [paymentKey, orderId, amount, navigate, searchParams]);

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
                <h2 className="text-xl font-bold text-slate-900">결제 승인을 완료하는 중...</h2>
                <p className="text-slate-500 mt-2 font-medium">크레딧을 안전하게 충전하고 있습니다.</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4">
                <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center border border-slate-100">
                    <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-8 h-8 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 mb-2">결제 처리 실패</h2>
                    <p className="text-slate-500 mb-8 font-medium">{error}</p>
                    <button onClick={() => navigate('/store')} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all">다시 시도하기</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4">
            <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center border border-indigo-100 animate-fade-in">
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-2">충전 완료!</h2>
                <p className="text-slate-500 mb-6 font-medium">크레딧이 성공적으로 반영되었습니다.</p>
                
                <div className="bg-slate-50 rounded-2xl p-4 mb-8 text-left space-y-2">
                    <div className="flex justify-between text-sm font-bold">
                        <span className="text-slate-400">결제 금액</span>
                        <span className="text-indigo-600">₩{Number(amount).toLocaleString()}</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => navigate('/')} className="flex items-center justify-center gap-2 bg-slate-100 text-slate-700 py-4 rounded-2xl font-bold hover:bg-slate-200 transition-all text-sm">
                        <Home size={18} /> 홈으로
                    </button>
                    <button onClick={() => navigate('/usage-history')} className="flex items-center justify-center gap-2 bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all text-sm">
                        <Receipt size={18} /> 내역 확인
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PaymentSuccess;
