import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import {
    RotateCcw,
    CheckCircle2,
    XSquare,
    Loader2,
    AlertTriangle,
    Mail,
    Coins } from 'lucide-react';

interface RefundRequest {
    id: string;
    user_id: string;
    price_paid: number;
    purchased_credits: number;
    status: string;
    purchased_at: string;
    refund_requested_at: string;
    payment_id: string;
    profiles: {
        name: string;
        email: string;
        credits: number;
    };
}

const RefundManagement: React.FC = () => {
    const [requests, setRequests] = useState<RefundRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('credit_purchases')
                .select(`
          *,
          profiles:user_id (name, email, credits)
        `)
                .eq('status', 'pending_refund')
                .order('refund_requested_at', { ascending: true });

            if (error) throw error;
            setRequests(data || []);
        } catch (err) {
            console.error('Error fetching refund requests:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const handleRefundAction = async (requestId: string, action: 'approve' | 'reject') => {
        const request = requests.find(r => r.id === requestId);
        if (!request) return;

        if (!window.confirm(`환불 요청을 ${action === 'approve' ? '승인' : '거절'}하시겠습니까?`)) return;

        try {
            setProcessingId(requestId);

            if (action === 'approve') {
                // 1. Check if user has enough credits to deduct (optional, policy dependent)
                // For simplicity, we just process status change and credit deduction.
                const { error: profileError } = await supabase.rpc('deduct_credits_for_refund', {
                    p_user_id: request.user_id,
                    p_amount: request.purchased_credits
                });

                if (profileError) throw profileError;

                const { error: updateError } = await supabase
                    .from('credit_purchases')
                    .update({ status: 'refunded' })
                    .eq('id', requestId);

                if (updateError) throw updateError;
            } else {
                const { error: updateError } = await supabase
                    .from('credit_purchases')
                    .update({ status: 'active', refund_requested_at: null })
                    .eq('id', requestId);

                if (updateError) throw updateError;
            }

            alert(`${action === 'approve' ? '환불 승인' : '거절'} 처리가 완료되었습니다.`);
            fetchRequests();
        } catch (err: any) {
            alert(`처리 오류: ${err.message}`);
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">환불 관리</h2>
                <p className="text-slate-500 font-medium">환불 요청 건을 검토하고 승인 또는 거절 처리합니다.</p>
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-6 py-4 text-sm font-bold text-slate-400">요청 정보</th>
                                <th className="px-6 py-4 text-sm font-bold text-slate-400">결제 정보</th>
                                <th className="px-6 py-4 text-sm font-bold text-slate-400">현재 보유 크레딧</th>
                                <th className="px-6 py-4 text-sm font-bold text-slate-400">요청 일시</th>
                                <th className="px-6 py-4 text-sm font-bold text-slate-400 text-center">관리</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center">
                                        <Loader2 className="animate-spin text-indigo-600 mx-auto" size={32} />
                                    </td>
                                </tr>
                            ) : requests.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center text-slate-400 font-medium">환불 대기 건이 없습니다.</td>
                                </tr>
                            ) : (
                                requests.map((r) => (
                                    <tr key={r.id} className="hover:bg-amber-50/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                                                    <RotateCcw size={20} />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-800">{r.profiles?.name || '미설정'}</div>
                                                    <div className="text-xs font-medium text-slate-400 flex items-center gap-1"><Mail size={12} />{r.profiles?.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-slate-800 font-bold">{r.price_paid?.toLocaleString()}원</div>
                                            <div className="text-xs font-black text-indigo-600">({r.purchased_credits?.toLocaleString()} C 구매 건)</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5 font-bold text-slate-700">
                                                <Coins size={16} className="text-amber-500" />
                                                {r.profiles?.credits?.toLocaleString()}
                                            </div>
                                            {r.profiles?.credits < r.purchased_credits && (
                                                <div className="text-[10px] text-red-500 font-black flex items-center gap-1 mt-1">
                                                    <AlertTriangle size={10} /> 잔액 부족
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-slate-500">
                                            {new Date(r.refund_requested_at).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-3">
                                                <button
                                                    onClick={() => handleRefundAction(r.id, 'reject')}
                                                    disabled={!!processingId}
                                                    className="px-4 py-2 bg-slate-100 text-slate-500 text-xs font-black rounded-xl hover:bg-slate-200 transition-all flex items-center gap-1.5"
                                                >
                                                    <XSquare size={14} /> 거절
                                                </button>
                                                <button
                                                    onClick={() => handleRefundAction(r.id, 'approve')}
                                                    disabled={!!processingId}
                                                    className="px-4 py-2 bg-emerald-500 text-white text-xs font-black rounded-xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100 flex items-center gap-1.5"
                                                >
                                                    {processingId === r.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                                    승인
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100">
                <h4 className="flex items-center gap-2 text-blue-800 font-black mb-2 tracking-tight">
                    <AlertTriangle size={18} /> 환불 처리 유의사항
                </h4>
                <ul className="text-sm text-blue-600/80 space-y-1 ml-6 list-disc font-medium">
                    <li>환불 승인 시 결제 금액은 <strong>토스페이먼츠 관리자 센터에서 직접 취소</strong>해야 합니다. (연동 필요)</li>
                    <li>본 시스템에서는 DB의 크레딧 차감 및 상태 변경만 처리합니다.</li>
                    <li>사용자의 보유 크레딧이 환불 요청 크레딧보다 적을 경우 처리에 주의하세요.</li>
                </ul>
            </div>
        </div>
    );
};

export default RefundManagement;
