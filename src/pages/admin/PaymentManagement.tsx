import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import {
    Search,
    Download,
    Loader2,
    CheckCircle2,
    Clock,
    AlertCircle,
    RotateCcw
} from 'lucide-react';
import { formatSafariDate } from '../../utils/textUtils';

interface Payment {
    id: string;
    type: 'credit' | 'deep_report';
    user_id: string | null;
    price_paid: number;
    purchased_credits: number | null;
    product_name: string;
    status: string;
    purchased_at: string;
    payment_id: string;
    profiles?: {
        name: string;
        email: string;
    } | null;
    email?: string;
}

const PaymentManagement: React.FC = () => {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [refundingId, setRefundingId] = useState<string | null>(null);

    const fetchPayments = React.useCallback(async () => {
        try {
            setLoading(true);
            
            // 1. Fetch credit purchases
            const { data: creditData, error: creditError } = await supabase
                .from('credit_purchases')
                .select(`
                    *,
                    profiles:user_id (name, email)
                `)
                .order('purchased_at', { ascending: false });

            if (creditError) throw creditError;

            // 2. Fetch deep report requests (excluding pending_payment)
            const { data: reportData, error: reportError } = await supabase
                .from('deep_report_requests')
                .select(`
                    *,
                    profiles:user_id (name, email)
                `)
                .neq('status', 'pending_payment')
                .order('created_at', { ascending: false });

            if (reportError) throw reportError;

            // 3. Map credit purchases
            const mappedCredits: Payment[] = (creditData || []).map(p => ({
                id: p.id,
                type: 'credit',
                user_id: p.user_id,
                price_paid: p.price_paid,
                purchased_credits: p.purchased_credits,
                product_name: `${p.purchased_credits} 크레딧`,
                status: p.status,
                purchased_at: p.purchased_at,
                payment_id: p.payment_id,
                profiles: p.profiles
            }));

            // 4. Map deep report requests
            const mappedReports: Payment[] = (reportData || []).map(p => {
                const displayName = p.profiles?.name || p.generated_data?.clientName || (p.email ? p.email.split('@')[0] : '비회원');
                const displayEmail = p.profiles?.email || p.email || '-';
                return {
                    id: p.id,
                    type: 'deep_report',
                    user_id: p.user_id,
                    price_paid: p.amount || 9900,
                    purchased_credits: null,
                    product_name: p.report_type || '심층 리포트',
                    status: p.status,
                    purchased_at: p.created_at,
                    payment_id: p.payment_id || '-',
                    profiles: {
                        name: displayName,
                        email: displayEmail
                    },
                    email: displayEmail
                };
            });

            // 5. Merge and sort by purchased_at descending
            const merged = [...mappedCredits, ...mappedReports].sort((a, b) => {
                return new Date(formatSafariDate(b.purchased_at)).getTime() - new Date(formatSafariDate(a.purchased_at)).getTime();
            });

            setPayments(merged);
        } catch (err) {
            console.error('Error fetching payments:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPayments();
    }, [fetchPayments]);

    const handleRefund = async (payment: Payment) => {
        const productName = payment.type === 'deep_report' ? payment.product_name : `${payment.purchased_credits} 크레딧`;
        const confirmRefund = window.confirm(`[${payment.profiles?.name}]님의 ${productName} 결제를 환불하시겠습니까? 토스페이먼츠 승인이 취소됩니다.`);
        if (!confirmRefund) return;

        setRefundingId(payment.id);
        try {
            const response = await fetch('/api/payment?action=cancel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    purchaseId: payment.id,
                    type: payment.type,
                    cancelReason: '관리자 페이지를 통한 직접 환불 처리'
                }),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || '환불 처리 중 오류가 발생했습니다.');
            }

            alert('환불 처리가 완료되었습니다.');
            fetchPayments();
        } catch (error: any) {
            console.error('Refund error:', error);
            alert(error.message || '환불 중 오류가 발생했습니다.');
        } finally {
            setRefundingId(null);
        }
    };

    const filteredPayments = payments.filter(p =>
        p.profiles?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.payment_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.product_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusBadge = (p: Payment) => {
        const isActive = p.status === 'active' || p.status === 'paid';
        const isPendingRefund = p.status === 'pending_refund' || p.status === 'refund_pending';
        const isRefunded = p.status === 'refunded';

        if (isActive) {
            return (
                <div className="flex flex-col gap-2">
                    <span className="bg-emerald-100 text-emerald-600 px-3 py-1 rounded-lg text-xs font-black flex items-center gap-1 w-fit"><CheckCircle2 size={12} /> 결제완료</span>
                    <button 
                        onClick={() => handleRefund(p)}
                        disabled={refundingId === p.id}
                        className="text-[10px] text-slate-400 hover:text-rose-500 font-bold flex items-center gap-1 transition-colors disabled:opacity-50"
                    >
                        {refundingId === p.id ? <Loader2 size={10} className="animate-spin" /> : <RotateCcw size={10} />} 환불처리
                    </button>
                </div>
            );
        }

        if (isPendingRefund) {
            return (
                <div className="flex flex-col gap-2">
                    <span className="bg-amber-100 text-amber-600 px-3 py-1 rounded-lg text-xs font-black flex items-center gap-1 w-fit"><Clock size={12} /> 환불요청</span>
                    <button 
                        onClick={() => handleRefund(p)}
                        disabled={refundingId === p.id}
                        className="bg-rose-50 text-rose-600 px-3 py-1 rounded-lg text-[10px] font-black hover:bg-rose-100 transition-all flex items-center gap-1 disabled:opacity-50"
                    >
                         {refundingId === p.id ? <Loader2 size={10} className="animate-spin" /> : <RotateCcw size={10} />} 즉시 환불 승인
                    </button>
                </div>
            );
        }

        if (isRefunded) {
            return <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-lg text-xs font-black flex items-center gap-1 w-fit"><AlertCircle size={12} /> 환불완료</span>;
        }

        return <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-lg text-xs font-black w-fit">{p.status}</span>;
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">결제 관리</h2>
                    <p className="text-slate-500 font-medium">전체 결제 내역 및 매출 현황을 확인합니다.</p>
                </div>
                <div className="flex gap-3">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="이름, 이메일, 주문번호 검색"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-slate-950 focus:border-transparent outline-none transition-all w-80 font-medium"
                        />
                    </div>
                    <button className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-colors text-slate-500">
                        <Download size={20} />
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-6 py-4 text-sm font-bold text-slate-400">구분 / 주문 정보</th>
                                <th className="px-6 py-4 text-sm font-bold text-slate-400">결제 금액</th>
                                <th className="px-6 py-4 text-sm font-bold text-slate-400">상품 정보</th>
                                <th className="px-6 py-4 text-sm font-bold text-slate-400">상태</th>
                                <th className="px-6 py-4 text-sm font-bold text-slate-400">결제 일시</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center">
                                        <Loader2 className="animate-spin text-slate-950 mx-auto" size={32} />
                                    </td>
                                </tr>
                            ) : filteredPayments.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center text-slate-400">결제 내역이 없습니다.</td>
                                </tr>
                            ) : (
                                filteredPayments.map((p) => (
                                    <tr key={`${p.type}-${p.id}`} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-start gap-2.5">
                                                {p.type === 'deep_report' ? (
                                                    <span className="bg-violet-50 text-violet-600 text-[10px] px-2 py-0.5 rounded-md font-black whitespace-nowrap mt-0.5">심층리포트</span>
                                                ) : (
                                                    <span className="bg-blue-50 text-blue-600 text-[10px] px-2 py-0.5 rounded-md font-black whitespace-nowrap mt-0.5">크레딧충전</span>
                                                )}
                                                <div>
                                                    <div className="text-slate-800 font-bold">{p.profiles?.name || '비회원'}</div>
                                                    <div className="text-xs text-slate-400">{p.profiles?.email || '-'}</div>
                                                    <div className="text-[10px] text-slate-300 mt-1 font-mono">{p.payment_id}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-900 font-black">
                                            {p.price_paid?.toLocaleString()}원
                                        </td>
                                        <td className="px-6 py-4 text-slate-950 font-black">
                                            {p.type === 'deep_report' ? (
                                                <span className="text-slate-800 font-bold">{p.product_name}</span>
                                            ) : (
                                                <span>{p.purchased_credits?.toLocaleString()} C</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {getStatusBadge(p)}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500">
                                            {new Date(formatSafariDate(p.purchased_at)).toLocaleString()}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default PaymentManagement;
