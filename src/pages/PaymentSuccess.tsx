import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2, Home, Receipt, Copy, Check } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { clearPendingCheckout } from '../utils/pendingCheckout';
import { getPendingServiceOrder, promotePendingOrderToTicket } from '../utils/servicePayCheckout';
import { track } from '../utils/analytics';

const PaymentSuccess: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [approvedServiceName, setApprovedServiceName] = useState<string>('');
    const [returnTargetPath, setReturnTargetPath] = useState<string>('/');
    const [copiedOrderId, setCopiedOrderId] = useState(false);

    const paymentKey = searchParams.get('paymentKey');
    const orderId = searchParams.get('orderId');
    const amount = searchParams.get('amount');
    const retryPath = getPendingServiceOrder()?.returnPath || '/pricing';

    const handleCopyOrderId = async () => {
        if (!orderId) return;
        try {
            await navigator.clipboard.writeText(orderId);
            setCopiedOrderId(true);
            setTimeout(() => setCopiedOrderId(false), 2000);
        } catch {
            // ignore clipboard errors
        }
    };

    useEffect(() => {
        const confirmAndSync = async () => {
            const userIdFromUrl = searchParams.get('userId');
            const userIdFromStorage = localStorage.getItem('pending_payment_user_id');
            const { data: { session: currentSession } } = await supabase.auth.getSession();

            const finalUserId = currentSession?.user?.id || userIdFromUrl || userIdFromStorage;

            if (!paymentKey || !orderId || !amount) {
                setError('결제 정보가 누락되었습니다.');
                setLoading(false);
                return;
            }

            try {
                const headers: Record<string, string> = { 'Content-Type': 'application/json' };
                if (currentSession?.access_token) {
                    headers['Authorization'] = `Bearer ${currentSession.access_token}`;
                }

                const response = await fetch('/api/confirm-payment', {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        paymentKey,
                        orderId,
                        amount: Number(amount),
                        userId: finalUserId,
                    }),
                });

                localStorage.removeItem('pending_payment_user_id');
                if (orderId && orderId.startsWith('SHOP')) {
                    localStorage.removeItem('pending_shop_order');
                }

                const rawBody = await response.text();
                let data: any = null;
                try {
                    data = rawBody ? JSON.parse(rawBody) : null;
                } catch {
                    throw new Error(
                        response.ok
                            ? '결제 승인 응답 형식이 올바르지 않습니다.'
                            : `서버 오류가 발생했습니다 (HTTP ${response.status}). 잠시 후 다시 시도해 주세요.`
                    );
                }

                if (!response.ok || !data || data.success === false) {
                    console.error('Failed API Response:', data || rawBody);
                    const errorMessage = data?.error || data?.message || `결제 승인 중 오류가 발생했습니다 (HTTP ${response.status}).`;
                    throw new Error(errorMessage);
                }

                if (orderId.startsWith('ord_')) clearPendingCheckout();
                track('checkout_success', { amount: Number(amount), kind: orderId.split('_')[0] ?? 'unknown' });

                if (currentSession?.user) {
                    await supabase.auth.refreshSession();
                    await supabase.from('profiles').select('id').eq('id', currentSession.user.id).maybeSingle();
                }

                if (orderId?.startsWith('SVC_')) {
                    const ticket = promotePendingOrderToTicket(
                        orderId,
                        data?.data?.receiptToken,
                        data?.data?.remainingUses
                    );
                    const nextPath = ticket?.returnPath || '/myluck?type=today';
                    setApprovedServiceName(ticket?.serviceName || '운세 서비스');
                    setReturnTargetPath(nextPath);
                    setLoading(false);
                    setTimeout(() => navigate(nextPath, { replace: true }), 400);
                    return;
                }

                if (orderId?.startsWith('DEEPREPORT')) {
                    setIsGenerating(true);
                    fetch('/api/generate-and-save-report', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ orderId }),
                    }).catch(err => console.error('Auto-generation trigger failed:', err))
                      .finally(() => setIsGenerating(false));
                }

                setLoading(false);

                if (orderId?.startsWith('DEEPREPORT')) {
                    // DEEPREPORT keeps the confirmation screen visible
                } else {
                    setTimeout(() => navigate('/myluck?type=today'), 3000);
                }
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
                <Loader2 className="w-12 h-12 text-slate-950 animate-spin mb-4" />
                <h2 className="text-xl font-bold text-slate-900">결제 승인을 완료하는 중...</h2>
                <p className="text-slate-500 mt-2 font-medium">안전하게 결제를 처리하고 있습니다.</p>
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
                    <p className="text-slate-500 mb-4 font-medium">{error}</p>
                    {orderId && (
                        <div className="bg-slate-50 rounded-xl p-3 mb-6 text-xs text-slate-600 flex items-center justify-between gap-2">
                            <span className="font-mono truncate">주문번호: {orderId}</span>
                            <button
                                type="button"
                                onClick={handleCopyOrderId}
                                className="shrink-0 inline-flex items-center gap-1 px-2 py-1 bg-white border border-slate-200 rounded-lg font-bold text-slate-700 hover:bg-slate-100"
                            >
                                {copiedOrderId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                {copiedOrderId ? '복사됨' : '복사'}
                            </button>
                        </div>
                    )}
                    <button onClick={() => navigate(retryPath)} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all">다시 시도하기</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4">
            <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center border border-slate-100 animate-fade-in">
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-2">결제 완료!</h2>
                {orderId?.startsWith('DEEPREPORT_ZH') ? (
                    <div className="space-y-3 mb-6">
                        <p className="text-slate-900 font-black text-lg">3年深度命理分析報告 預約成功！</p>
                        <p className="text-slate-500 font-medium text-sm leading-relaxed">
                            感謝您的訂購！命理大師與系統正在為您排盤分析，<br/>
                            <span className="text-violet-600 font-bold">將於約定交付日期前，以 A4 20頁完整 PDF</span><br/>
                            發送至您填寫的接收信箱。<br/>
                            <span className="text-xs text-slate-400 mt-2 block">客服信箱：support@mbtiju.com</span>
                        </p>
                        {isGenerating && (
                            <div className="mt-4 flex items-center justify-center gap-2 bg-violet-50 py-3 px-4 rounded-xl text-violet-600 text-xs font-bold animate-pulse">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                正在啟動後台真太陽時八字排盤計算中...
                            </div>
                        )}
                        <button onClick={() => navigate('/zh')} className="mt-4 w-full bg-slate-950 text-white py-3.5 rounded-xl text-xs font-bold hover:bg-slate-800 transition-all">
                            返回繁中版首頁
                        </button>
                    </div>
                ) : orderId?.startsWith('DEEPREPORT') ? (
                    <div className="space-y-3 mb-6">
                        <p className="text-slate-900 font-black text-lg">심층 리포트 신청 완료!</p>
                        <p className="text-slate-500 font-medium text-sm leading-relaxed">
                            전문가의 심층 분석 및 데이터 검증에 시간이 소요되어,<br/>
                            <span className="text-violet-600 font-bold">빠르면 다음 날, 늦어도 2일 이내</span>에<br/>
                            입력하신 메일과 카카오톡으로 발송됩니다.
                        </p>
                        {isGenerating && (
                            <div className="mt-4 flex items-center justify-center gap-2 bg-violet-50 py-3 px-4 rounded-xl text-violet-600 text-xs font-bold animate-pulse">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                인공지능이 분석 리포트 초안을 작성 중입니다...
                            </div>
                        )}
                    </div>
                ) : orderId?.startsWith('SVC_') ? (
                    <div className="space-y-3 mb-6">
                        <p className="text-slate-900 font-black text-lg">{approvedServiceName || '운세 분석'} 결제 완료!</p>
                        <p className="text-slate-500 font-medium text-sm leading-relaxed">
                            결제가 정상 승인되었습니다.<br />
                            지금 바로 결과 화면으로 이동하여 풀이를 시작합니다.
                        </p>
                    </div>
                ) : (
                    <p className="text-slate-500 mb-6 font-medium">결제가 성공적으로 반영되었습니다.</p>
                )}

                <div className="bg-slate-50 rounded-2xl p-4 mb-8 text-left space-y-2.5">
                    <div className="flex justify-between text-sm font-bold">
                        <span className="text-slate-400">결제 금액</span>
                        <span className="text-slate-950">₩{Number(amount).toLocaleString()}</span>
                    </div>
                    {orderId && (
                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/70 text-xs">
                            <span className="text-slate-400 font-bold shrink-0">주문번호</span>
                            <div className="flex items-center gap-1.5 min-w-0">
                                <span className="font-mono text-slate-700 truncate">{orderId}</span>
                                <button
                                    type="button"
                                    onClick={handleCopyOrderId}
                                    className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-slate-200 rounded-md font-bold text-slate-600 hover:text-slate-900"
                                >
                                    {copiedOrderId ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                    {copiedOrderId ? '복사됨' : '복사'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => navigate('/')} className="flex items-center justify-center gap-2 bg-slate-100 text-slate-700 py-4 rounded-2xl font-bold hover:bg-slate-200 transition-all text-sm">
                        <Home size={18} /> 홈으로
                    </button>
                    {orderId?.startsWith('SVC_') ? (
                        <button onClick={() => navigate(returnTargetPath)} className="flex items-center justify-center gap-2 bg-slate-950 text-white py-4 rounded-2xl font-bold hover:bg-black shadow-lg shadow-slate-200 transition-all text-sm">
                            <Receipt size={18} /> 결과 바로 보기
                        </button>
                    ) : (
                        <button onClick={() => navigate('/myluck?type=today')} className="flex items-center justify-center gap-2 bg-slate-950 text-white py-4 rounded-2xl font-bold hover:bg-black shadow-lg shadow-slate-200 transition-all text-sm">
                            <Receipt size={18} /> 운세 보러가기
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PaymentSuccess;
