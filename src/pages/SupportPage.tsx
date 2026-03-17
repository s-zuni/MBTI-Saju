import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Loader2, MessageSquare, Send, ChevronRight, ShieldCheck, AlertCircle, RotateCcw, CreditCard, AlertTriangle, HelpCircle, ChevronDown, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface CreditPurchase {
    id: string;
    user_id: string;
    plan_id: string | null;
    purchased_credits: number;
    remaining_credits: number;
    price_paid: number;
    payment_id: string | null;
    status: 'active' | 'pending_refund' | 'refunded';
    purchased_at: string;
}

interface Inquiry {
// ... existing Inquiry interface remains the same ...
    id: string;
    category: string;
    title: string;
    content: string;
    answer: string | null;
    status: 'pending' | 'answered';
    credits_rewarded: number;
    created_at: string;
    answered_at: string | null;
    user_id: string;
}

const categories = [
    { id: 'refund', label: '환불 요청', icon: <RotateCcw size={16} /> },
    { id: 'payment', label: '결제/요금제 문의', icon: <CreditCard size={16} /> },
    { id: 'error', label: '서비스 오류 제보', icon: <AlertTriangle size={16} /> },
    { id: 'other', label: '기타 문의', icon: <HelpCircle size={16} /> },
];

const SupportPage: React.FC = () => {
    const [inquiries, setInquiries] = useState<Inquiry[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [category, setCategory] = useState('other');
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [user, setUser] = useState<any>(null);
    
    // 구매 내역 관련 상태
    const [purchases, setPurchases] = useState<CreditPurchase[]>([]);
    const [selectedPurchaseId, setSelectedPurchaseId] = useState<string | null>(null);
    const [showPurchaseList, setShowPurchaseList] = useState(false);

    const navigate = useNavigate();

    useEffect(() => {
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                alert('로그인이 필요한 서비스입니다.');
                navigate('/');
                return;
            }
            setUser(session.user);
            fetchInquiries(session.user.id);
        };
        checkUser();
    }, [navigate]);

    const fetchInquiries = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('support_inquiries')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setInquiries(data || []);
        } catch (err) {
            console.error('Error fetching inquiries:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchPurchases = useCallback(async () => {
        if (!user?.id) return;
        const { data, error } = await supabase
            .from('credit_purchases')
            .select('*')
            .eq('user_id', user.id)
            .order('purchased_at', { ascending: false });
        
        if (!error && data) {
            setPurchases(data);
        }
    }, [user?.id]);

    useEffect(() => {
        if (user && category === 'refund') {
            fetchPurchases();
        }
    }, [user, category, fetchPurchases]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) return;

        if (category === 'refund' && !selectedPurchaseId) {
            alert('환불하실 구매 내역을 선택해주세요.');
            return;
        }

        setIsSubmitting(true);
        try {
            const { error } = await supabase
                .from('support_inquiries')
                .insert({
                    user_id: user.id,
                    category,
                    title,
                    content,
                    status: 'pending',
                    linked_purchase_id: selectedPurchaseId
                });

            if (error) throw error;

            alert('문의가 등록되었습니다. 최대한 빨리 답변해 드리겠습니다.');
            setTitle('');
            setContent('');
            setCategory('other');
            setSelectedPurchaseId(null);
            fetchInquiries(user.id);
        } catch (err) {
            console.error('Error submitting inquiry:', err);
            alert('문의 등록 중 오류가 발생했습니다.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const isRefundable = (purchase: CreditPurchase) => {
        if (purchase.status !== 'active') return false;
        if (purchase.remaining_credits !== purchase.purchased_credits) return false;
        
        const purchasedAt = new Date(purchase.purchased_at);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - purchasedAt.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays <= 7;
    };

    const selectedPurchase = purchases.find(p => p.id === selectedPurchaseId);

    const formatDate = (dateStr: string) => {
// ... rest of the file ...
        const date = new Date(dateStr);
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center pt-20">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-24 md:pb-12 pt-14 md:pt-20 lg:pt-24 animate-fade-in">


            <div className="max-w-4xl mx-auto px-6">
                <div className="mb-12">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-indigo-100 rounded-2xl">
                            <MessageSquare className="w-8 h-8 text-indigo-600" />
                        </div>
                        <h1 className="text-3xl font-black text-slate-900">고객센터</h1>
                    </div>
                    <p className="text-slate-500 font-medium">문의사항을 남겨주시면 정성껏 답변해 드리겠습니다.</p>
                </div>

                <div className="grid lg:grid-cols-2 gap-12">
                    {/* Inquiry Form */}
                    <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm h-fit">
                        <h2 className="text-xl font-bold text-slate-900 mb-6">새로운 문의 남기기</h2>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-3">문의 카테고리</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {categories.map((cat) => (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            onClick={() => {
                                                setCategory(cat.id);
                                                if (cat.id !== 'refund') setSelectedPurchaseId(null);
                                            }}
                                            className={`
                                                flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-xs font-bold
                                                ${category === cat.id
                                                    ? 'border-indigo-600 bg-indigo-50 text-indigo-600 shadow-sm'
                                                    : 'border-slate-100 hover:border-slate-200 text-slate-500'}
                                            `}
                                        >
                                            {cat.icon}
                                            {cat.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {category === 'refund' && (
                                <div className="animate-in slide-in-from-top-2 duration-300">
                                    <label className="block text-sm font-bold text-slate-700 mb-2">환불 대상 구매 내역</label>
                                    <div className="relative">
                                        <button
                                            type="button"
                                            onClick={() => setShowPurchaseList(!showPurchaseList)}
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-left hover:border-indigo-300 transition-all font-medium text-sm"
                                        >
                                            {selectedPurchase ? (
                                                <span>
                                                    {selectedPurchase.purchased_credits} 크레딧 (₩{selectedPurchase.price_paid.toLocaleString()})
                                                    <span className="text-[10px] text-slate-400 block">{new Date(selectedPurchase.purchased_at).toLocaleDateString()} 결제</span>
                                                </span>
                                            ) : (
                                                <span className="text-slate-400">환불할 구매 내역을 선택해주세요</span>
                                            )}
                                            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showPurchaseList ? 'rotate-180' : ''}`} />
                                        </button>

                                        {showPurchaseList && (
                                            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-xl z-20 overflow-hidden max-h-60 overflow-y-auto animate-in fade-in zoom-in duration-200">
                                                {purchases.length === 0 ? (
                                                    <p className="p-4 text-center text-xs text-slate-400">구매 내역이 없습니다.</p>
                                                ) : (
                                                    purchases.map(p => {
                                                        const refundable = isRefundable(p);
                                                        return (
                                                            <button
                                                                key={p.id}
                                                                type="button"
                                                                disabled={!refundable}
                                                                onClick={() => {
                                                                    setSelectedPurchaseId(p.id);
                                                                    setShowPurchaseList(false);
                                                                }}
                                                                className={`w-full p-4 border-b border-slate-50 text-left hover:bg-slate-50 transition-all flex items-center justify-between group ${!refundable ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                            >
                                                                <div className="flex flex-col gap-0.5">
                                                                    <span className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                                                        {p.purchased_credits} 크레딧
                                                                        {!refundable && (
                                                                            <span className="px-2 py-0.5 bg-rose-50 text-rose-500 text-[10px] rounded-md">환불 불가</span>
                                                                        )}
                                                                    </span>
                                                                    <span className="text-[10px] text-slate-400 font-medium">₩{p.price_paid.toLocaleString()} • {new Date(p.purchased_at).toLocaleDateString()}</span>
                                                                    {!refundable && p.remaining_credits < p.purchased_credits && (
                                                                        <span className="text-[9px] text-rose-400 italic">이미 사용된 크레딧이 있습니다.</span>
                                                                    )}
                                                                </div>
                                                                {selectedPurchaseId === p.id && <Check className="w-4 h-4 text-indigo-600" />}
                                                            </button>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
                                        <p className="text-[10px] text-amber-700 leading-relaxed font-medium">
                                            <span className="font-black text-amber-800 underline block mb-1">💡 환불 규정 안내</span>
                                            - 결제 후 7일 이내, 한 번도 사용하지 않은 크레딧만 환불 가능합니다.<br/>
                                            - 이미 사용된 크레딧이 포함된 구매 건은 환불이 불가능합니다.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">제목</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="문의 제목을 입력해주세요"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all font-medium"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">내용</label>
                                <textarea
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="궁금하신 내용을 자세히 적어주세요"
                                    className="w-full h-40 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all resize-none font-medium"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-lg shadow-indigo-100 active:scale-[0.98]"
                            >
                                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                문의 등록하기
                            </button>
                        </form>
                    </div>

                    {/* Inquiry List */}
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 mb-6 font-primary">나의 문의 내역</h2>
                        {inquiries.length === 0 ? (
                            <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center">
                                <AlertCircle className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                <p className="text-slate-400 font-medium">등록된 문의가 없습니다.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {inquiries.map((inquiry) => (
                                    <div key={inquiry.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:border-indigo-200 transition-all group">
                                        <div className="p-5">
                                            <div className="flex items-start justify-between mb-3">
                                                <div>
                                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-500 text-[10px] font-bold rounded flex items-center gap-1 uppercase">
                                                            {categories.find(c => c.id === inquiry.category)?.label || inquiry.category}
                                                        </span>
                                                        {inquiry.status === 'answered' ? (
                                                            <span className="px-2 py-0.5 bg-green-100 text-green-600 text-[10px] font-bold rounded-full uppercase tracking-wider">답변완료</span>
                                                        ) : (
                                                            <span className="px-2 py-0.5 bg-slate-100 text-slate-400 text-[10px] font-bold rounded-full uppercase tracking-wider">처리중</span>
                                                        )}
                                                        <h3 className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{inquiry.title}</h3>
                                                    </div>
                                                    <p className="text-[10px] text-slate-400 font-medium">{formatDate(inquiry.created_at)}</p>
                                                </div>
                                                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:translate-x-1 group-hover:text-indigo-400 transition-all" />
                                            </div>
                                            <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed font-medium">{inquiry.content}</p>
                                        </div>

                                        {inquiry.status === 'answered' && inquiry.answer && (
                                            <div className="bg-indigo-50/50 p-5 border-t border-indigo-100/50 animate-in fade-in slide-in-from-top-2 duration-300">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center">
                                                        <ShieldCheck className="w-3.5 h-3.5 text-white" />
                                                    </div>
                                                    <span className="text-xs font-bold text-indigo-900">운영팀 답변</span>
                                                </div>
                                                <p className="text-sm text-indigo-900 leading-relaxed whitespace-pre-line font-medium">{inquiry.answer}</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SupportPage;
