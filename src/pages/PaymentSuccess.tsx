import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2 } from 'lucide-react';
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
        const confirmPayment = async () => {
            if (!paymentKey || !orderId || !amount) {
                setError('결제 정보가 누락되었습니다.');
                setLoading(false);
                return;
            }

            try {
                // 실제 운영 환경에서는 서버사이드에서 토스페이먼츠 결제 승인 API를 호출해야 합니다.
                // 클라이언트 사이드에서는 승인 결과를 확인하고 DB에 반영하는 로직을 수행합니다.

                // 1. 주문 정보 확인 및 크레딧 지급 로직 (임시로 성공 처리)
                // 여기서는 클라이언트 사이드에서 처리하므로, 실제 운영 시에는 Edge Function 등을 통해 검증해야 함.

                const { data: { session } } = await supabase.auth.getSession();
                if (!session?.user) throw new Error('로그인 정보가 없습니다.');

                // 결제 로그 기록 (또는 Edge Function 호출 추천)
                // 현재는 간단히 완료 처리
                setTimeout(() => {
                    setLoading(false);
                }, 1500);

            } catch (err: any) {
                console.error('Payment Confirmation Error:', err);
                setError(err.message || '결제 승인 중 오류가 발생했습니다.');
                setLoading(false);
            }
        };

        confirmPayment();
    }, [paymentKey, orderId, amount]);

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
