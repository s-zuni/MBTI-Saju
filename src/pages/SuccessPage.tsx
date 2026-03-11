import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

import { useCredits } from '../hooks/useCredits';

export default function SuccessPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { refreshCredits } = useCredits(null); // Fetch new credits on mount

    const [status, setStatus] = useState<'loading' | 'success' | 'fail'>('loading');
    const [message, setMessage] = useState<string>('결제 승인을 진행 중입니다...');

    useEffect(() => {
        const confirmPayment = async () => {
            const paymentKey = searchParams.get('paymentKey');
            const orderId = searchParams.get('orderId');
            const amount = searchParams.get('amount');

            if (!paymentKey || !orderId || !amount) {
                setStatus('fail');
                setMessage('잘못된 접근입니다. 필요한 결제 정보가 없습니다.');
                return;
            }

            try {
                // 백엔드 API 호출을 통한 결제 승인
                // TODO: Vercel serverless function /api/confirm-payment 라우트 연결
                const response = await fetch('/api/confirm-payment', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ paymentKey, orderId, amount: Number(amount) }),
                });

                if (response.ok) {
                    setStatus('success');
                    setMessage('결제가 성공적으로 반영되었습니다.');
                    refreshCredits(); // Refresh credits after success
                } else {
                    const errorData = await response.json();
                    setStatus('fail');
                    setMessage(`승인 실패: ${errorData.message || '알 수 없는 오류'}`);
                }
            } catch (err) {
                console.error(err);
                setStatus('fail');
                setMessage('결제 승인 과정에서 네트워크 오류가 발생했습니다.');
            }
        };

        confirmPayment();
    }, [searchParams, refreshCredits]);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col pt-14 md:pt-20">

            <div className="flex-1 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-lg max-w-sm w-full text-center">
                    {status === 'loading' && (
                        <div className="flex flex-col items-center gap-4">
                            <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
                            <h2 className="text-xl font-bold text-slate-800">결제 처리 중</h2>
                            <p className="text-slate-500 text-sm">{message}</p>
                        </div>
                    )}
                    {status === 'success' && (
                        <div className="flex flex-col items-center gap-4">
                            <CheckCircle2 className="w-16 h-16 text-emerald-500" />
                            <h2 className="text-xl font-bold text-slate-800">결제 성공!</h2>
                            <p className="text-slate-500 text-sm mb-4">{message}</p>
                            <button
                                onClick={() => navigate('/store')}
                                className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition"
                            >
                                돌아가기
                            </button>
                        </div>
                    )}
                    {status === 'fail' && (
                        <div className="flex flex-col items-center gap-4">
                            <XCircle className="w-16 h-16 text-red-500" />
                            <h2 className="text-xl font-bold text-slate-800">결제 실패</h2>
                            <p className="text-slate-500 text-sm mb-4">{message}</p>
                            <button
                                onClick={() => navigate('/store')}
                                className="w-full bg-slate-100 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-200 transition"
                            >
                                상점으로
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
