import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2 } from 'lucide-react';

const PaymentSuccess: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const paymentKey = searchParams.get('paymentKey');
    const orderId = searchParams.get('orderId');
    const amount = searchParams.get('amount');

    useEffect(() => {
        const confirmPayment = async () => {
            if (!paymentKey || !orderId || !amount) {
                setError('결제 정보가 누락되었습니다.');
                setLoading(false);
                return;
            }

            try {
                // 1. 서버리스 함수 호출하여 결제 승인 및 DB 반영
                const response = await fetch('/api/confirm-payment', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        paymentKey,
                        orderId,
                        amount: Number(amount),
                    }),
                });

                const contentType = response.headers.get('content-type');
                let data: any;

                if (contentType && contentType.includes('application/json')) {
                    data = await response.json();
                } else {
                    const text = await response.text();
                    throw new Error(`서버 응답 오류 (JSON이 아님): ${response.status} ${response.statusText}\n${text.substring(0, 100)}...`);
                }

                if (!response.ok) {
                    throw new Error(data.message || `결제 승인 중 오류가 발생했습니다. (상태 코드: ${response.status})`);
                }

                // 성공적으로 처리됨
                // 2. 세션 강제 새로고침하여 profiles 상태 동기화 (크레딧 즉시 반영 유도)
                const { supabase } = await import('../supabaseClient');
                await supabase.auth.refreshSession();
                
                setLoading(false);

                // 3초 후 내역 페이지로 자동 이동하여 내역 확인 유도
                setTimeout(() => {
                    navigate('/usage-history', { replace: true });
                }, 2000);

            } catch (err: any) {
                console.error('Payment Confirmation Error:', err);
                setError(err.message || '결제 승인 중 오류가 발생했습니다.');
                setLoading(false);
            }
        };

        confirmPayment();
    }, [paymentKey, orderId, amount, navigate]);

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
                <h2 className="text-xl font-bold text-slate-900">결제 승인 중...</h2>
                <p className="text-slate-500 mt-2">잠시만 기다려주세요.</p>
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
                    <p className="text-slate-500 mb-8">{error}</p>
                    <button
                        onClick={() => navigate('/pricing')}
                        className="btn-primary w-full py-3"
                    >
                        다시 시도하기
                    </button>
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
                <h2 className="text-2xl font-black text-slate-900 mb-2">결제 완료!</h2>
                <p className="text-slate-500 mb-2">크레딧 충전이 성공적으로 완료되었습니다.</p>
                <div className="bg-slate-50 rounded-2xl p-4 my-6 text-left">
                    <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-400">주문명</span>
                        <span className="font-bold text-slate-700">크레딧 충전</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-400">결제금액</span>
                        <span className="font-bold text-indigo-600">₩{Number(amount).toLocaleString()}</span>
                    </div>
                </div>
                <button
                    onClick={() => navigate('/mypage')}
                    className="btn-primary w-full py-3"
                >
                    마이페이지로 이동
                </button>
            </div>
        </div>
    );
};

export default PaymentSuccess;
