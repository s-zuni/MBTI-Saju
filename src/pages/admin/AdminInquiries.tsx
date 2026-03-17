import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import {
    MessageSquare,
    Search,
    Clock,
    CheckCircle2,
    AlertCircle,
    ChevronRight,
    Coins,
    User,
    ArrowLeft,
    RotateCcw,
    Loader2
} from 'lucide-react';

interface Inquiry {
    id: string;
    user_id: string;
    category: string;
    title: string;
    content: string;
    answer: string | null;
    status: 'pending' | 'answered';
    credits_rewarded: number;
    created_at: string;
    answered_at: string | null;
    linked_purchase_id: string | null;
    user_email?: string;
    linked_purchase?: any;
}

const AdminInquiries: React.FC = () => {
    const [inquiries, setInquiries] = useState<Inquiry[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
    const [answerText, setAnswerText] = useState('');
    const [rewardCredits, setRewardCredits] = useState(0);
    const [filter, setFilter] = useState<'all' | 'pending' | 'answered'>('all');
    const [refunding, setRefunding] = useState(false);

    const fetchInquiries = useCallback(async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('support_inquiries')
                .select(`
                    *,
                    profiles!left(email),
                    linked_purchase:linked_purchase_id(*)
                `);

            if (filter !== 'all') {
                query = query.eq('status', filter);
            }

            const { data, error } = await query.order('created_at', { ascending: false });

            if (error) throw error;

            const formattedData = (data || []).map((item: any) => ({
                ...item,
                user_email: item.profiles?.email || '이메일 정보 없음'
            }));

            setInquiries(formattedData);
            
            // If currently selected inquiry is in the list, update it
            if (selectedInquiry) {
                const updated = formattedData.find(i => i.id === selectedInquiry.id);
                if (updated) setSelectedInquiry(updated);
            }
        } catch (error) {
            console.error('Fetch error:', error);
        } finally {
            setLoading(false);
        }
    }, [filter, selectedInquiry?.id]);

    useEffect(() => {
        fetchInquiries();
    }, [filter]); // fetchInquiries depends on filter

    const handleAnswer = async () => {
        if (!selectedInquiry) return;

        try {
            const { error: updateError } = await supabase
                .from('support_inquiries')
                .update({
                    answer: answerText,
                    status: 'answered',
                    credits_rewarded: rewardCredits,
                    answered_at: new Date().toISOString(),
                })
                .eq('id', selectedInquiry.id);

            if (updateError) throw updateError;

            if (rewardCredits > 0) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('credits')
                    .eq('id', selectedInquiry.user_id)
                    .single();

                if (profile) {
                    await supabase
                        .from('profiles')
                        .update({ credits: (profile.credits || 0) + rewardCredits })
                        .eq('id', selectedInquiry.user_id);
                }
            }

            alert('답변이 등록되었습니다.');
            setSelectedInquiry(null);
            setAnswerText('');
            setRewardCredits(0);
            fetchInquiries();
        } catch (error: any) {
            console.error('Answer error:', error);
            alert('답변 등록 중 오류가 발생했습니다.');
        }
    };

    const handleRefund = async () => {
        if (!selectedInquiry?.linked_purchase_id) return;
        
        const confirmRefund = window.confirm('정말로 환불을 실행하시겠습니까? 토스페이먼츠 결제가 취소되고 사용자 크레딧이 차감됩니다.');
        if (!confirmRefund) return;

        setRefunding(true);
        try {
            const response = await fetch('/api/cancel-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    purchaseId: selectedInquiry.linked_purchase_id,
                    cancelReason: '고객센터 문의를 통한 관리자 환불 처리'
                }),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || '환불 처리 중 오류가 발생했습니다.');
            }

            alert('환불 처리가 완료되었습니다.');
            fetchInquiries();
        } catch (error: any) {
            console.error('Refund error:', error);
            alert(error.message || '환불 중 오류가 발생했습니다.');
        } finally {
            setRefunding(false);
        }
    };

    const getCategoryLabel = (cat: string) => {
        const labels: Record<string, string> = {
            'refund': '환불 요청',
            'payment': '결제 문의',
            'error': '오류 제보',
            'other': '기타'
        };
        return labels[cat] || cat;
    };

    return (
        <div className="p-8 max-w-7xl mx-auto">
            {selectedInquiry ? (
                <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 animate-in slide-in-from-right duration-300">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                        <button
                            onClick={() => setSelectedInquiry(null)}
                            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors font-semibold"
                        >
                            <ArrowLeft size={20} /> 목록으로 돌아가기
                        </button>
                        <div className="flex items-center gap-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                selectedInquiry.status === 'answered' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                                {selectedInquiry.status === 'answered' ? '답변 완료' : '답변 대기'}
                            </span>
                        </div>
                    </div>

                    <div className="p-8 grid md:grid-cols-2 gap-12">
                        {/* Inquiry Details */}
                        <div className="space-y-8">
                            <div>
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">문의 상세 정보</h3>
                                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                                            <User size={20} className="text-slate-400" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-900">{selectedInquiry.user_email}</p>
                                            <p className="text-[10px] text-slate-400">{new Date(selectedInquiry.created_at).toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-[10px] font-bold text-indigo-500 uppercase mb-1">{getCategoryLabel(selectedInquiry.category)}</p>
                                            <h2 className="text-xl font-black text-slate-900">{selectedInquiry.title}</h2>
                                        </div>
                                        <div className="p-4 bg-white rounded-xl border border-slate-100 text-slate-700 text-sm leading-relaxed whitespace-pre-wrap mb-4">
                                            {selectedInquiry.content}
                                        </div>

                                        {selectedInquiry.linked_purchase && (
                                            <div className="p-6 bg-white rounded-2xl border-2 border-indigo-50 shadow-sm animate-in fade-in zoom-in duration-300">
                                                <h4 className="text-xs font-black text-indigo-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                                    <RotateCcw size={14} /> 연결된 구매 내역
                                                </h4>
                                                <div className="grid grid-cols-2 gap-4 mb-6">
                                                    <div>
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase">상품(크레딧)</p>
                                                        <p className="text-sm font-black text-slate-800">{selectedInquiry.linked_purchase.purchased_credits} C</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase">결제 금액</p>
                                                        <p className="text-sm font-black text-slate-800">₩{selectedInquiry.linked_purchase.price_paid.toLocaleString()}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase">상태</p>
                                                        <p className={`text-sm font-black ${
                                                            selectedInquiry.linked_purchase.status === 'refunded' ? 'text-slate-400' : 'text-indigo-600'
                                                        }`}>
                                                            {selectedInquiry.linked_purchase.status === 'active' ? '결제 완료' : 
                                                             selectedInquiry.linked_purchase.status === 'pending_refund' ? '환불 대기' : '환불 완료'}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase">주문 일시</p>
                                                        <p className="text-[11px] font-bold text-slate-800">{new Date(selectedInquiry.linked_purchase.purchased_at).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                                
                                                {selectedInquiry.linked_purchase.status !== 'refunded' && (
                                                    <button
                                                        onClick={handleRefund}
                                                        disabled={refunding}
                                                        className="w-full py-3 bg-rose-50 text-rose-600 rounded-xl font-bold text-sm hover:bg-rose-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                                    >
                                                        {refunding ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />}
                                                        즉시 환불 실행 (Toss Payments)
                                                    </button>
                                                )}
                                                {selectedInquiry.linked_purchase.status === 'refunded' && (
                                                    <div className="w-full py-3 bg-slate-50 text-slate-400 rounded-xl font-bold text-sm flex items-center justify-center gap-2 border border-slate-100">
                                                        <CheckCircle2 size={16} /> 이미 환불 처리된 항목입니다.
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Answer Form */}
                        <div className="space-y-6">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">관리자 답변 작성</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">답변 내용</label>
                                    <textarea
                                        className="w-full p-4 rounded-2xl border border-slate-200 focus:border-indigo-500 outline-none h-48 transition-all"
                                        value={answerText}
                                        onChange={(e) => setAnswerText(e.target.value)}
                                        placeholder="사용자에게 보낼 상세 답변을 입력하세요..."
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                        <Coins size={16} className="text-amber-500" /> 보상 크레딧 지급 (Optional)
                                    </label>
                                    <input
                                        type="number"
                                        className="w-full p-4 rounded-2xl border border-slate-200 focus:border-indigo-500 outline-none transition-all"
                                        value={rewardCredits}
                                        onChange={(e) => setRewardCredits(parseInt(e.target.value) || 0)}
                                    />
                                    <p className="text-[10px] text-slate-400 mt-2 px-1">* 오류 보상 등으로 크레딧을 지급할 경우 입력하세요.</p>
                                </div>
                                <button
                                    onClick={handleAnswer}
                                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all active:scale-[0.98]"
                                >
                                    답변 완료 및 발송
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-8 animate-in fade-in duration-500">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
                                <MessageSquare className="w-8 h-8 text-indigo-600" /> 고객 문의 관리
                            </h1>
                            <p className="text-slate-500 font-medium">사용자들의 문의 내역을 확인하고 답변을 등록하세요.</p>
                        </div>

                        <div className="flex gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100">
                            {(['all', 'pending', 'answered'] as const).map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${
                                        filter === f ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'
                                    }`}
                                >
                                    {f === 'all' ? '전체' : f === 'pending' ? '대기 중' : '답변 완료'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {loading ? (
                        <div className="grid gap-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-24 bg-white rounded-2xl animate-pulse" />
                            ))}
                        </div>
                    ) : inquiries.length === 0 ? (
                        <div className="bg-white rounded-3xl p-20 text-center border-2 border-dashed border-slate-100">
                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Search className="text-slate-300 w-10 h-10" />
                            </div>
                            <p className="text-slate-400 font-bold">내역이 없습니다.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {inquiries.map((inquiry) => (
                                <button
                                    key={inquiry.id}
                                    onClick={() => {
                                        setSelectedInquiry(inquiry);
                                        setAnswerText(inquiry.answer || '');
                                        setRewardCredits(inquiry.credits_rewarded || 0);
                                    }}
                                    className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex items-center justify-between group text-left w-full"
                                >
                                    <div className="flex items-center gap-6">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                            inquiry.status === 'answered' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'
                                        }`}>
                                            {inquiry.status === 'answered' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-tighter">
                                                    {getCategoryLabel(inquiry.category)}
                                                </span>
                                                <span className="text-[10px] text-slate-300">•</span>
                                                <span className="text-[10px] font-bold text-slate-400">{inquiry.user_email}</span>
                                            </div>
                                            <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{inquiry.title}</h3>
                                            <div className="flex items-center gap-3 mt-2">
                                                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                                    <Clock size={12} /> {new Date(inquiry.created_at).toLocaleDateString()}
                                                </span>
                                                {inquiry.credits_rewarded > 0 && (
                                                    <span className="text-[10px] text-amber-500 font-bold flex items-center gap-1">
                                                        <Coins size={12} /> {inquiry.credits_rewarded} 지급됨
                                                    </span>
                                                )}
                                                {inquiry.linked_purchase_id && (
                                                    <span className="text-[10px] text-indigo-500 font-black flex items-center gap-1">
                                                        <RotateCcw size={10} /> 환불 정보 포함
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <ChevronRight className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" size={24} />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AdminInquiries;
