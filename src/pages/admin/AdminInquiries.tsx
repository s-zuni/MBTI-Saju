import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import {
    ChevronRight,
    ArrowLeft,
    Send,
    Loader2,
    MessageCircle,
    CheckCircle2,
    Clock,
    RotateCcw,
    AlertTriangle
} from 'lucide-react';
import { formatSafariDate } from '../../utils/textUtils';

interface Message {
    id: string;
    sender_role: 'user' | 'admin';
    content: string;
    created_at: string;
}

interface Inquiry {
    id: string;
    user_id: string;
    category: string;
    title: string;
    content: string;
    answer: string | null;
    status: 'pending' | 'answered';
    created_at: string;
    linked_purchase_id: string | null;
    profiles: {
        name: string;
        email: string;
        credits?: number;
    } | null;
    linked_purchase?: {
        id: string;
        price_paid: number;
        purchased_credits: number;
        remaining_credits: number;
        status: string;
        purchased_at: string;
        payment_id: string;
    } | null;
}

const AdminInquiries: React.FC = () => {
    const [inquiries, setInquiries] = useState<Inquiry[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'general' | 'refund'>('general');
    const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
    
    // Message thread states
    const [messages, setMessages] = useState<Message[]>([]);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [replying, setReplying] = useState(false);

    // Refund processing state
    const [refundProcessing, setRefundProcessing] = useState(false);

    const fetchInquiries = useCallback(async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('support_inquiries')
                .select(`
                    *,
                    profiles:user_id (name, email, credits),
                    linked_purchase:linked_purchase_id (*)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Map profiles and linked purchases safely
            const mappedData: Inquiry[] = (data || []).map((item: any) => {
                const profile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
                const purchase = Array.isArray(item.linked_purchase) ? item.linked_purchase[0] : item.linked_purchase;
                return {
                    ...item,
                    profiles: profile ? {
                        name: profile.name || '',
                        email: profile.email || '',
                        credits: profile.credits ?? 0
                    } : null,
                    linked_purchase: purchase ? {
                        id: purchase.id,
                        price_paid: purchase.price_paid,
                        purchased_credits: purchase.purchased_credits,
                        remaining_credits: purchase.remaining_credits,
                        status: purchase.status,
                        purchased_at: purchase.purchased_at,
                        payment_id: purchase.payment_id
                    } : null
                };
            });

            setInquiries(mappedData);

            // Sync selected inquiry data if open
            // Sync selected inquiry data if open
            setSelectedInquiry(prev => {
                if (!prev) return null;
                const updated = mappedData.find(i => i.id === prev.id);
                return updated || prev;
            });
        } catch (err) {
            console.error('Error fetching inquiries:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchMessages = useCallback(async (inquiryId: string) => {
        try {
            setLoadingMessages(true);
            const { data, error } = await supabase
                .from('support_inquiry_messages')
                .select('*')
                .eq('inquiry_id', inquiryId)
                .order('created_at', { ascending: true });

            if (error) throw error;
            setMessages(data || []);
        } catch (err) {
            console.error('Error fetching messages:', err);
        } finally {
            setLoadingMessages(false);
        }
    }, []);

    useEffect(() => {
        fetchInquiries().catch(err => console.error(err));
    }, [fetchInquiries]);

    useEffect(() => {
        if (selectedInquiry) {
            fetchMessages(selectedInquiry.id).catch(err => console.error(err));
        }
    }, [selectedInquiry, fetchMessages]);

    const handleSendReply = async () => {
        if (!selectedInquiry || !replyText.trim()) return;

        try {
            setReplying(true);
            // 1. Add message
            const { error: msgError } = await supabase
                .from('support_inquiry_messages')
                .insert({
                    inquiry_id: selectedInquiry.id,
                    sender_role: 'admin',
                    content: replyText
                });

            if (msgError) throw msgError;

            // 2. Mark answered
            const { error: inquiryError } = await supabase
                .from('support_inquiries')
                .update({
                    status: 'answered',
                    answered_at: new Date().toISOString()
                })
                .eq('id', selectedInquiry.id);

            if (inquiryError) throw inquiryError;

            alert('답변이 전송되었습니다.');
            setReplyText('');
            await fetchMessages(selectedInquiry.id);
            await fetchInquiries();
        } catch (err: any) {
            alert(`답변 전송 실패: ${err.message}`);
        } finally {
            setReplying(false);
        }
    };

    const handleProcessRefund = async () => {
        if (!selectedInquiry || !selectedInquiry.linked_purchase) return;
        if (selectedInquiry.linked_purchase.status === 'refunded') {
            alert('이미 환불 처리된 주문입니다.');
            return;
        }

        if (!window.confirm('실제 토스페이먼츠 환불 처리를 실행하시겠습니까? 구매했던 크레딧이 전액 회수됩니다.')) return;

        try {
            setRefundProcessing(true);
            const response = await fetch('/api/payment?action=cancel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    purchaseId: selectedInquiry.linked_purchase_id,
                    cancelReason: '관리자 페이지 통합 고객지원 환불 검증 승인'
                })
            });

            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.message || '환불 처리 중 결제 모듈 오류가 발생했습니다.');
            }

            alert('환불 처리가 성공적으로 완료되었습니다.');
            await fetchInquiries();
        } catch (err: any) {
            alert(`환불 처리 실패: ${err.message}`);
        } finally {
            setRefundProcessing(false);
        }
    };

    const checkRefundPolicy = (inquiry: Inquiry) => {
        const p = inquiry.linked_purchase;
        if (!p) return { is7Days: false, isUnused: false, allOk: false };

        const purchasedAt = new Date(formatSafariDate(p.purchased_at));
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - purchasedAt.getTime()) / (1000 * 60 * 60 * 24));

        const is7Days = diffDays <= 7;
        const isUnused = p.remaining_credits === p.purchased_credits;

        return {
            is7Days,
            isUnused,
            allOk: is7Days && isUnused
        };
    };

    // Filter inquiries locally by tab
    const filteredInquiries = inquiries.filter(i => {
        if (activeTab === 'refund') {
            return i.category === 'refund';
        } else {
            return i.category !== 'refund';
        }
    });

    if (selectedInquiry) {
        const policy = selectedInquiry.category === 'refund' ? checkRefundPolicy(selectedInquiry) : null;

        return (
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 animate-in slide-in-from-right duration-300 min-h-[600px] flex flex-col">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <button
                        onClick={() => setSelectedInquiry(null)}
                        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors font-semibold"
                    >
                        <ArrowLeft size={20} /> 목록으로
                    </button>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-sm font-bold text-slate-900">{selectedInquiry.profiles?.name || '익명'}</p>
                            <p className="text-[10px] text-slate-400">{selectedInquiry.profiles?.email}</p>
                        </div>
                        <span className={`px-4 py-1.5 rounded-full text-xs font-black ${
                            selectedInquiry.status === 'answered' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                            {selectedInquiry.status === 'answered' ? '답변완료' : '답변대기'}
                        </span>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-5 min-h-[500px]">
                    {/* Chat Thread */}
                    <div className={`flex flex-col bg-slate-50/30 ${selectedInquiry.category === 'refund' ? 'md:col-span-3' : 'md:col-span-3'} border-r border-slate-100`}>
                        <div className="p-6 border-b border-slate-100 bg-white">
                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-slate-100 text-slate-500 mr-2 uppercase">
                                {selectedInquiry.category === 'bug' ? '버그리포트' : selectedInquiry.category === 'feature' ? '기능제안' : selectedInquiry.category === 'refund' ? '환불' : '기타'}
                            </span>
                            <h2 className="text-base font-black text-slate-900 leading-tight mt-2">{selectedInquiry.title}</h2>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-[400px]">
                            {loadingMessages ? (
                                <div className="flex justify-center p-8"><Loader2 className="animate-spin text-slate-950" /></div>
                            ) : (
                                messages.map(msg => (
                                    <div key={msg.id} className={`flex flex-col ${msg.sender_role === 'admin' ? 'items-end' : 'items-start'}`}>
                                        <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ${
                                            msg.sender_role === 'admin'
                                                ? 'bg-slate-900 text-white rounded-tr-none'
                                                : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none shadow-sm'
                                        }`}>
                                            {msg.content}
                                        </div>
                                        <span className="text-[10px] text-slate-400 mt-1.5 px-1 font-bold">
                                            {msg.sender_role === 'admin' ? '운영진' : '사용자'} • {new Date(formatSafariDate(msg.created_at)).toLocaleString([], { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Actions and Replies Area */}
                    <div className="md:col-span-2 p-6 bg-white flex flex-col justify-between space-y-6">
                        {/* Refund Info Section */}
                        {selectedInquiry.category === 'refund' && selectedInquiry.linked_purchase && policy && (
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                                <h4 className="text-xs font-black text-slate-900 flex items-center gap-2">
                                    <RotateCcw size={14} className="text-rose-500" />
                                    환불 정책 검토
                                </h4>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <p><span className="text-slate-400 font-bold">결제금액:</span> {selectedInquiry.linked_purchase.price_paid.toLocaleString()}원</p>
                                    <p><span className="text-slate-400 font-bold">충전크레딧:</span> {selectedInquiry.linked_purchase.purchased_credits} C</p>
                                    <p><span className="text-slate-400 font-bold">남은크레딧:</span> {selectedInquiry.linked_purchase.remaining_credits} C</p>
                                    <p><span className="text-slate-400 font-bold">결제상태:</span> {selectedInquiry.linked_purchase.status === 'refunded' ? '환불완료' : '결제완료'}</p>
                                </div>
                                <div className="space-y-1.5 pt-2 border-t border-slate-200">
                                    <div className="flex justify-between text-xs font-semibold">
                                        <span>7일 이내 요청 여부:</span>
                                        <span>{policy.is7Days ? '예 (적합)' : '아니오 (검토필요)'}</span>
                                    </div>
                                    <div className="flex justify-between text-xs font-semibold">
                                        <span>크레딧 미사용 여부:</span>
                                        <span>{policy.isUnused ? '예 (적합)' : '아니오 (사용됨)'}</span>
                                    </div>
                                </div>

                                <button
                                    onClick={handleProcessRefund}
                                    disabled={refundProcessing || selectedInquiry.linked_purchase.status === 'refunded'}
                                    className="w-full py-3.5 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 text-white text-xs font-bold rounded-xl transition-all shadow shadow-rose-100 flex items-center justify-center gap-2"
                                >
                                    {refundProcessing ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />}
                                    {selectedInquiry.linked_purchase.status === 'refunded' ? '환불 승인 완료됨' : '환불 승인 (Toss 실행)'}
                                </button>
                            </div>
                        )}

                        {/* Reply Form */}
                        <div className="flex-1 flex flex-col space-y-3">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">답변 작성하기</h3>
                            <textarea
                                className="flex-1 w-full p-4 rounded-2xl border border-slate-200 focus:border-slate-950 outline-none transition-all text-xs resize-none min-h-[120px]"
                                value={replyText}
                                onChange={e => setReplyText(e.target.value)}
                                placeholder="사용자에게 보낼 상세한 답변을 입력하세요..."
                            />
                            <button
                                onClick={handleSendReply}
                                disabled={replying || !replyText.trim()}
                                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black hover:bg-black transition-all flex items-center justify-center gap-2 disabled:opacity-30 shadow-lg text-xs"
                            >
                                {replying ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                답변 전송하기
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-end border-b border-slate-100 pb-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2 tracking-tight">
                        <MessageCircle className="w-6 h-6 text-violet-600" />
                        고객 문의 및 환불 관리
                    </h2>
                    <p className="text-xs text-slate-500">고객의 일반 문의사항 확인 및 환불 요청 건에 대한 Toss 결제 취소를 하나의 화면에서 처리합니다.</p>
                </div>

                <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200">
                    <button
                        onClick={() => { setActiveTab('general'); setSelectedInquiry(null); }}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                            activeTab === 'general' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        일반 문의
                    </button>
                    <button
                        onClick={() => { setActiveTab('refund'); setSelectedInquiry(null); }}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                            activeTab === 'refund' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        환불 요청
                    </button>
                </div>
            </div>

            {/* Inquiries Table */}
            <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-widest">
                                <th className="px-6 py-4">분류</th>
                                <th className="px-6 py-4">사용자</th>
                                <th className="px-6 py-4">문의 제목 / 내용</th>
                                <th className="px-6 py-4">요청일자</th>
                                <th className="px-6 py-4 text-center">상태</th>
                                <th className="px-6 py-4 text-right">상세보기</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-sm">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-20 text-center">
                                        <Loader2 className="animate-spin text-slate-950 mx-auto" size={32} />
                                    </td>
                                </tr>
                            ) : filteredInquiries.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-20 text-center text-slate-400 text-xs font-bold">
                                        {activeTab === 'refund' ? '대기 중인 환불 요청이 없습니다.' : '등록된 고객 문의가 없습니다.'}
                                    </td>
                                </tr>
                            ) : (
                                filteredInquiries.map(i => (
                                    <tr key={i.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${
                                                i.category === 'refund'
                                                    ? 'bg-rose-50 text-rose-600 border border-rose-100'
                                                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                                            }`}>
                                                {i.category === 'bug' ? '버그리포트' : i.category === 'feature' ? '기능제안' : i.category === 'refund' ? '환불요청' : '기타'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="font-bold text-slate-900">{i.profiles?.name || '익명'}</div>
                                            <div className="text-[10px] text-slate-400">{i.profiles?.email}</div>
                                        </td>
                                        <td className="px-6 py-4 max-w-xs">
                                            <div className="font-bold text-slate-800 truncate">{i.title}</div>
                                            <div className="text-xs text-slate-400 font-medium truncate">{i.content}</div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 text-xs">
                                            {new Date(formatSafariDate(i.created_at)).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full ${
                                                i.status === 'answered' ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-amber-50 text-amber-600 border border-amber-200'
                                            }`}>
                                                {i.status === 'answered' ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                                                {i.status === 'answered' ? '답변완료' : '답변대기'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => setSelectedInquiry(i)}
                                                className="inline-flex items-center gap-1 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black rounded-xl transition-all shadow-md shadow-slate-100"
                                            >
                                                상세보기 <ChevronRight size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Policy Guide Note under Refunds */}
            {activeTab === 'refund' && (
                <div className="bg-amber-50/50 p-6 rounded-3xl border border-amber-100 flex items-start gap-4 shadow-sm">
                    <div className="p-3 bg-white rounded-2xl shadow-sm text-amber-500 shrink-0">
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <h4 className="text-amber-900 font-black tracking-tight mb-1">통합 환불 검토 정책 안내</h4>
                        <p className="text-xs text-amber-700/80 font-medium leading-relaxed">
                            환불 요청 건의 [상세보기]를 클릭하면 결제일 기준 7일 초과 여부와 충전 크레딧의 사용 여부를 정책 기준에 따라 자동으로 분석해 줍니다. 
                            **환불 승인** 시 토스페이먼츠 API 취소와 회원의 크레딧 차감이 동시에 실행됩니다. 정책을 철저하게 확인한 후 작업을 실행해 주세요.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminInquiries;
