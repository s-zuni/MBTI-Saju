import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import {
    RotateCcw,
    Loader2,
    AlertTriangle,
    Mail,
    ChevronRight,
    ArrowLeft,
    ShieldCheck,
    ShieldAlert
} from 'lucide-react';

interface RefundInquiry {
    id: string;
    user_id: string;
    category: string;
    title: string;
    content: string;
    answer: string | null;
    status: 'pending' | 'answered';
    created_at: string;
    linked_purchase_id: string;
    profiles: {
        name: string;
        email: string;
        credits: number;
    };
    linked_purchase: {
        id: string;
        price_paid: number;
        purchased_credits: number;
        remaining_credits: number;
        status: string;
        purchased_at: string;
        payment_id: string;
    };
}

const RefundManagement: React.FC = () => {
    const [inquiries, setInquiries] = useState<RefundInquiry[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedInquiry, setSelectedInquiry] = useState<RefundInquiry | null>(null);
    const [processing, setProcessing] = useState(false);
    const [answerText, setAnswerText] = useState('');

    const fetchInquiries = useCallback(async () => {
        try {
            setLoading(true);
            const { data } = await supabase
                .from('support_inquiries')
                .select(`
                    *,
                    profiles:user_id (name, email, credits),
                    linked_purchase:linked_purchase_id (*)
                `)
                .eq('category', 'refund')
                .order('created_at', { ascending: false });

            if (data) {
                setInquiries(data);
                setSelectedInquiry(prev => {
                    if (!prev) return null;
                    const updated = data.find(i => i.id === prev.id);
                    return updated || prev;
                });
            }
        } catch (err) {
            console.error('Error fetching refund inquiries:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchInquiries();
    }, [fetchInquiries]);

    const handleRefundAndReply = async () => {
        if (!selectedInquiry) return;
        
        const confirmMsg = selectedInquiry.linked_purchase.status === 'refunded' 
            ? '이미 환불된 주문입니다. 답변만 등록하시겠습니까?' 
            : '실제 환불(Toss)을 실행하고 답변을 등록하시겠습니까?';
            
        if (!window.confirm(confirmMsg)) return;

        setProcessing(true);
        try {
            // 1. If not already refunded, call Toss Cancel API
            if (selectedInquiry.linked_purchase.status !== 'refunded') {
                const response = await fetch('/api/payment?action=cancel', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        purchaseId: selectedInquiry.linked_purchase_id,
                        cancelReason: '관리자 페이지 환불 관리 검토 승인'
                    }),
                });

                const result = await response.json();
                if (!response.ok || !result.success) {
                    throw new Error(result.message || '환불 시스템 API 오류가 발생했습니다.');
                }
            }

            // 2. Update Inquiry Status & Answer
            const { error: inquiryError } = await supabase
                .from('support_inquiries')
                .update({
                    answer: answerText || '환불 처리가 완료되었습니다.',
                    status: 'answered',
                    answered_at: new Date().toISOString()
                })
                .eq('id', selectedInquiry.id);

            if (inquiryError) throw inquiryError;

            alert('환불 처리 및 답변 등록이 완료되었습니다.');
            setSelectedInquiry(null);
            setAnswerText('');
            fetchInquiries();
        } catch (err: any) {
            alert(`처리 오류: ${err.message}`);
        } finally {
            setProcessing(false);
        }
    };

    const checkPolicy = (inquiry: RefundInquiry) => {
        const p = inquiry.linked_purchase;
        if (!p) return { is7Days: false, isUnused: false, allOk: false };
        
        const purchasedAt = new Date(p.purchased_at);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - purchasedAt.getTime()) / (1000 * 60 * 60 * 24));
        
        const is7Days = diffDays <= 7;
        const isUnused = p.remaining_credits === p.purchased_credits;
        
        return { is7Days, isUnused, allOk: is7Days && isUnused };
    };

    if (selectedInquiry) {
        const policy = checkPolicy(selectedInquiry);
        return (
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 animate-in slide-in-from-right duration-300">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <button
                        onClick={() => setSelectedInquiry(null)}
                        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors font-semibold"
                    >
                        <ArrowLeft size={20} /> 목록으로
                    </button>
                    <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            selectedInquiry.status === 'answered' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                            {selectedInquiry.status === 'answered' ? '해결됨' : '본인 검토 중'}
                        </span>
                    </div>
                </div>

                <div className="p-8 grid md:grid-cols-2 gap-12">
                    <div className="space-y-8">
                        <div>
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">환불 요청 상세</h3>
                            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                                        <Mail size={18} className="text-slate-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900">{selectedInquiry.profiles?.name} ({selectedInquiry.profiles?.email})</p>
                                        <p className="text-[10px] text-slate-400">요청일: {new Date(selectedInquiry.created_at).toLocaleString()}</p>
                                    </div>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-slate-100 mb-6">
                                    <h4 className="text-sm font-black text-slate-800 mb-2">{selectedInquiry.title}</h4>
                                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{selectedInquiry.content}</p>
                                </div>

                                {selectedInquiry.linked_purchase && (
                                    <div className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100">
                                        <h4 className="text-xs font-black text-indigo-600 uppercase mb-4 flex items-center gap-2">
                                            <RotateCcw size={14} /> 결제 정보
                                        </h4>
                                        <div className="grid grid-cols-2 gap-y-4 text-sm">
                                            <div>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase">상품명</p>
                                                <p className="font-bold text-slate-700">{selectedInquiry.linked_purchase.purchased_credits} 크레딧</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase">금액</p>
                                                <p className="font-bold text-slate-700">{selectedInquiry.linked_purchase.price_paid.toLocaleString()}원</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase">결제일</p>
                                                <p className="font-bold text-slate-700">{new Date(selectedInquiry.linked_purchase.purchased_at).toLocaleDateString()}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase">현재 상태</p>
                                                <p className={`font-black ${selectedInquiry.linked_purchase.status === 'refunded' ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                    {selectedInquiry.linked_purchase.status === 'refunded' ? '이미 환불됨' : '결제 완료'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="mt-6 pt-6 border-t border-indigo-100">
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase mb-3">환불 정책 준수 여부</h4>
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-100">
                                                    <span className="text-xs font-bold text-slate-600">구매 7일 이내</span>
                                                    {policy.is7Days ? <ShieldCheck className="text-emerald-500" size={18} /> : <ShieldAlert className="text-rose-500" size={18} />}
                                                </div>
                                                <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-100">
                                                    <span className="text-xs font-bold text-slate-600">크레딧 미사용</span>
                                                    {policy.isUnused ? <ShieldCheck className="text-emerald-500" size={18} /> : <ShieldAlert className="text-rose-500" size={18} />}
                                                </div>
                                            </div>
                                            {!policy.allOk && (
                                                <div className="mt-3 flex items-start gap-2 p-3 bg-rose-50 rounded-xl border border-rose-100">
                                                    <AlertTriangle size={14} className="text-rose-500 shrink-0 mt-0.5" />
                                                    <p className="text-[10px] text-rose-600 font-bold leading-tight">정책 위반 항목이 있습니다. 환불 불가 사유를 답변에 입력해 주세요.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">환불 승인 및 답변</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">답변 메시지</label>
                                <textarea
                                    className="w-full p-4 rounded-2xl border border-slate-200 focus:border-indigo-500 outline-none h-60 transition-all text-sm"
                                    value={answerText}
                                    onChange={(e) => setAnswerText(e.target.value)}
                                    placeholder="환불 처리 결과나 사유를 입력하세요..."
                                />
                            </div>
                            
                            <button
                                onClick={handleRefundAndReply}
                                disabled={processing}
                                className={`w-full py-4 rounded-2xl font-bold transition-all shadow-lg flex items-center justify-center gap-2 ${
                                    selectedInquiry.linked_purchase.status === 'refunded'
                                    ? 'bg-slate-900 text-white hover:bg-slate-800'
                                    : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-100'
                                }`}
                            >
                                {processing ? <Loader2 size={18} className="animate-spin" /> : <RotateCcw size={18} />}
                                {selectedInquiry.linked_purchase.status === 'refunded' ? '답변만 완료하기' : '환불 승인 및 답변 전송'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h2 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
                    <RotateCcw className="w-8 h-8 text-rose-500" /> 환불 요청 관리
                </h2>
                <p className="text-slate-500 font-medium">사용자들의 환불 문의를 검토하고 Toss 결제 취소를 직접 실행합니다.</p>
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">요청자</th>
                                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">문의 내용</th>
                                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">결제 금액</th>
                                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">상태</th>
                                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">관리</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center">
                                        <Loader2 className="animate-spin text-indigo-600 mx-auto" size={32} />
                                    </td>
                                </tr>
                            ) : inquiries.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center text-slate-400">대기 중인 환불 문의가 없습니다.</td>
                                </tr>
                            ) : (
                                inquiries.map((si) => (
                                    <tr key={si.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="font-bold text-slate-900">{si.profiles?.name || '익명'}</div>
                                            <div className="text-[10px] text-slate-400">{si.profiles?.email}</div>
                                        </td>
                                        <td className="px-6 py-4 max-w-xs">
                                            <div className="font-bold text-slate-800 truncate">{si.title}</div>
                                            <div className="text-[10px] text-slate-400 font-medium">{new Date(si.created_at).toLocaleDateString()} 요참</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-slate-900 font-black">{si.linked_purchase?.price_paid?.toLocaleString()}원</div>
                                            <div className="text-[10px] text-indigo-500 font-black">{si.linked_purchase?.purchased_credits} C</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-lg text-[10px] font-black tracking-tighter ${
                                                si.status === 'answered' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'
                                            }`}>
                                                {si.status === 'answered' ? '해결됨' : '대기중'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => {
                                                    setSelectedInquiry(si);
                                                    setAnswerText(si.answer || '');
                                                }}
                                                className="flex items-center gap-1 px-4 py-2 bg-slate-900 text-white text-xs font-black rounded-xl hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-100"
                                            >
                                                검토 및 환불 <ChevronRight size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-amber-50/50 p-6 rounded-3xl border border-amber-100 flex items-start gap-4">
                <div className="p-3 bg-white rounded-2xl shadow-sm text-amber-500 shrink-0">
                    <AlertTriangle size={24} />
                </div>
                <div>
                    <h4 className="text-amber-900 font-black tracking-tight mb-1">관리자 환불 처리 안내</h4>
                    <p className="text-sm text-amber-700/80 font-medium leading-relaxed">
                        환불 승인 시 시스템이 자동으로 **토스페이먼츠 승인 취소**를 호출하며, 사용자 프로필에서 **해당 크레딧을 즉시 차감**합니다. 
                        차감 후 답변이 자동으로 등록되어 사용자에게 전달됩니다. 정책 위반 사항을 꼼꼼히 검토 후 신중히 처리해 주세요.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default RefundManagement;
