import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import {
    MessageCircle,
    RotateCcw,
    Send,
    Loader2,
    ChevronRight,
    ArrowLeft,
    Inbox,
    AlertCircle,
    User,
    CheckCircle2
} from 'lucide-react';
import { formatSafariDate } from '../utils/textUtils';

interface PurchaseRecord {
    id: string;
    purchased_credits: number;
    price_paid: number;
    purchased_at: string;
    status: string;
}

interface Message {
    id: string;
    sender_role: 'user' | 'admin';
    content: string;
    created_at: string;
}

interface Inquiry {
    id: string;
    category: string;
    title: string;
    content: string;
    status: 'pending' | 'answered';
    created_at: string;
    linked_purchase_id: string | null;
}

interface SupportPageProps {
    session: any;
}

const SupportPage: React.FC<SupportPageProps> = ({ session: initialSession }) => {
    const [userId, setUserId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'menu' | 'form' | 'list' | 'detail'>('menu');
    const [category, setCategory] = useState<'general' | 'bug' | 'refund'>('general');

    // Form state
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
    const [selectedPurchaseId, setSelectedPurchaseId] = useState<string>('');
    const [submitting, setSubmitting] = useState(false);

    // List & Detail state
    const [inquiries, setInquiries] = useState<Inquiry[]>([]);
    const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [replyText, setReplyText] = useState('');
    const [loadingMessages, setLoadingMessages] = useState(false);

    useEffect(() => {
        const getSessionData = async () => {
            const timeoutId = setTimeout(() => setLoading(false), 5000);
            
            try {
                // Safari ITP 대응: Props로 받은 세션보다 getSession()으로 가져온 최신 세션을 우선시합니다.
                const { data: { session: fetchedSession } } = await supabase.auth.getSession();
                const currentSession = fetchedSession || initialSession;
                
                if (currentSession) {
                    setUserId(currentSession.user.id);
                    fetchPurchases(currentSession.user.id);
                    fetchInquiries(currentSession.user.id);
                }
            } catch (err) {
                console.error("SupportPage getSession error", err);
            } finally {
                clearTimeout(timeoutId);
                setLoading(false);
            }
        };
        getSessionData();
    }, [initialSession]);

    const fetchPurchases = async (uid: string) => {
        const { data } = await supabase
            .from('credit_purchases')
            .select('*')
            .eq('user_id', uid)
            .order('purchased_at', { ascending: false });
        if (data) setPurchases(data);
    };

    const fetchInquiries = async (uid: string) => {
        const { data } = await supabase
            .from('support_inquiries')
            .select('*')
            .eq('user_id', uid)
            .order('created_at', { ascending: false });
        if (data) setInquiries(data);
    };

    const fetchMessages = useCallback(async (inquiryId: string) => {
        setLoadingMessages(true);
        try {
            const { data } = await supabase
                .from('support_inquiry_messages')
                .select('*')
                .eq('inquiry_id', inquiryId)
                .order('created_at', { ascending: true });
            setMessages(data || []);
        } finally {
            setLoadingMessages(false);
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userId) return;

        setSubmitting(true);
        try {
            // 1. Create Inquiry
            const { data: inquiry, error: inquiryError } = await supabase
                .from('support_inquiries')
                .insert({
                    user_id: userId,
                    category,
                    title,
                    content,
                    linked_purchase_id: category === 'refund' ? selectedPurchaseId : null,
                    status: 'pending'
                })
                .select()
                .single();

            if (inquiryError) throw inquiryError;

            // 2. Add first message to thread
            const { error: msgError } = await supabase
                .from('support_inquiry_messages')
                .insert({
                    inquiry_id: inquiry.id,
                    sender_role: 'user',
                    content: content
                });

            if (msgError) throw msgError;

            alert('문의가 접수되었습니다. 최대한 빨리 답변 드리겠습니다!');
            setTitle('');
            setContent('');
            setSelectedPurchaseId('');
            fetchInquiries(userId);
            setView('list');
        } catch (err: any) {
            alert(`오류가 발생했습니다: ${err.message}`);
        } finally {
            setSubmitting(false);
        }
    };

    const handleSendReply = async () => {
        if (!selectedInquiry || !replyText.trim() || !userId) return;

        setSubmitting(true);
        try {
            const { error: msgError } = await supabase
                .from('support_inquiry_messages')
                .insert({
                    inquiry_id: selectedInquiry.id,
                    sender_role: 'user',
                    content: replyText
                });

            if (msgError) throw msgError;

            setReplyText('');
            fetchMessages(selectedInquiry.id);
        } catch (err: any) {
            alert(`오류: ${err.message}`);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="animate-spin text-indigo-600" size={32} />
            </div>
        );
    }

    if (!userId) {
        return (
            <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
                <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full text-center">
                    <Inbox className="w-16 h-16 text-slate-200 mx-auto mb-6" />
                    <h2 className="text-xl font-black text-slate-900 mb-2">로그인이 필요합니다</h2>
                    <p className="text-slate-500 text-sm mb-6 font-medium">문의 내역을 확인하고 상담하려면 먼저 로그인해 주세요.</p>
                    <button 
                        onClick={() => window.location.href = '/login'}
                        className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black"
                    >
                        로그인하러 가기
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Header */}
            <div className="bg-white border-b border-slate-100 sticky top-0 z-10">
                <div className="max-w-xl mx-auto px-6 h-16 flex items-center justify-between">
                    {view === 'menu' ? (
                        <h1 className="text-xl font-black text-slate-900">고객센터</h1>
                    ) : (
                        <button 
                            onClick={() => {
                                if (view === 'detail') setView('list');
                                else setView('menu');
                            }}
                            className="flex items-center gap-1 text-slate-900 font-black text-sm"
                        >
                            <ArrowLeft size={18} /> 뒤로가기
                        </button>
                    )}
                    <button 
                        onClick={() => setView('list')}
                        className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full"
                    >
                        나의 문의내역
                    </button>
                </div>
            </div>

            <div className="max-w-xl mx-auto px-6 py-8">
                {view === 'menu' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="mb-8">
                            <h2 className="text-2xl font-black text-slate-900 mb-2">무엇을 도와드릴까요?</h2>
                            <p className="text-slate-500 font-medium">문의 항목을 선택하시면 빠른 상담이 가능합니다.</p>
                        </div>

                        <button 
                            onClick={() => { setCategory('general'); setView('form'); }}
                            className="w-full p-6 bg-white rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4 hover:border-indigo-500 hover:shadow-md transition-all group"
                        >
                            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                <MessageCircle size={24} />
                            </div>
                            <div className="text-left flex-1">
                                <h3 className="font-black text-slate-800">일반 문의 / 제안</h3>
                                <p className="text-xs text-slate-500 font-medium mt-0.5">서비스 이용 중 궁금한 점을 문의해 주세요.</p>
                            </div>
                            <ChevronRight className="text-slate-300" size={20} />
                        </button>

                        <button 
                            onClick={() => { setCategory('refund'); setView('form'); }}
                            className="w-full p-6 bg-white rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4 hover:border-rose-500 hover:shadow-md transition-all group"
                        >
                            <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition-colors">
                                <RotateCcw size={24} />
                            </div>
                            <div className="text-left flex-1">
                                <h3 className="font-black text-slate-800">환불 요청하기</h3>
                                <p className="text-xs text-slate-500 font-medium mt-0.5">사용하지 않은 상품에 대한 환불을 요청합니다.</p>
                            </div>
                            <ChevronRight className="text-slate-300" size={20} />
                        </button>

                        <button 
                            onClick={() => { setCategory('bug'); setView('form'); }}
                            className="w-full p-6 bg-white rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4 hover:border-amber-500 hover:shadow-md transition-all group"
                        >
                            <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                                <AlertCircle size={24} />
                            </div>
                            <div className="text-left flex-1">
                                <h3 className="font-black text-slate-800">버그 리포트</h3>
                                <p className="text-xs text-slate-500 font-medium mt-0.5">오류가 발생했다면 알려주세요.</p>
                            </div>
                            <ChevronRight className="text-slate-300" size={20} />
                        </button>

                        <button 
                            onClick={() => setView('list')}
                            className="w-full p-6 bg-indigo-600 rounded-3xl shadow-xl shadow-indigo-100 flex items-center gap-4 hover:bg-indigo-700 transition-all group"
                        >
                            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-white">
                                <Inbox size={24} />
                            </div>
                            <div className="text-left flex-1">
                                <h3 className="font-black text-white">나의 문의 내역 확인</h3>
                                <p className="text-xs text-indigo-100 font-medium mt-0.5">이전에 남기신 문의와 답변을 확인하세요.</p>
                            </div>
                            <ChevronRight className="text-indigo-200" size={20} />
                        </button>
                    </div>
                )}

                {view === 'form' && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="mb-8">
                            <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter mb-2 inline-block ${
                                category === 'refund' ? 'bg-rose-50 text-rose-600' : 
                                category === 'bug' ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-600'
                            }`}>
                                {category === 'refund' ? '환불 요청' : category === 'bug' ? '버그 리포트' : '일반 문의'}
                            </span>
                            <h2 className="text-2xl font-black text-slate-900">상세한 내용을 알려주세요.</h2>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {category === 'refund' && (
                                <div className="space-y-3">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">환불 대상 결제 내역 선택</label>
                                    <div className="space-y-2">
                                        {purchases.length === 0 ? (
                                            <div className="p-4 bg-slate-100 rounded-2xl text-center text-xs font-bold text-slate-400">결제 내역이 없습니다.</div>
                                        ) : (
                                            purchases.map((p) => (
                                                <div 
                                                    key={p.id}
                                                    onClick={() => setSelectedPurchaseId(p.id)}
                                                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex justify-between items-center ${
                                                        selectedPurchaseId === p.id 
                                                        ? 'border-indigo-500 bg-indigo-50/50' 
                                                        : 'border-slate-100 bg-white hover:border-slate-200'
                                                    }`}
                                                >
                                                    <div>
                                                        <p className="text-sm font-black text-slate-800">{p.purchased_credits} 크레딧 충전</p>
                                                        <p className="text-[10px] text-slate-400 font-bold">{new Date(formatSafariDate(p.purchased_at)).toLocaleDateString()} • {p.price_paid.toLocaleString()}원</p>
                                                    </div>
                                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedPurchaseId === p.id ? 'border-indigo-600 bg-indigo-600' : 'border-slate-200'}`}>
                                                        {selectedPurchaseId === p.id && <div className="w-2 h-2 bg-white rounded-full" />}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-3">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">제목</label>
                                <input 
                                    required
                                    className="w-full p-4 bg-white border border-slate-200 rounded-2xl focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                                    placeholder="궁금하신 내용을 한 줄로 요약해 주세요."
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                />
                            </div>

                            <div className="space-y-3">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">상세 설명</label>
                                <textarea 
                                    required
                                    rows={6}
                                    className="w-full p-4 bg-white border border-slate-200 rounded-2xl focus:border-indigo-500 outline-none transition-all text-sm font-medium resize-none"
                                    placeholder="상황을 자세히 설명해 주시면 더 정확한 답변이 가능합니다."
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                />
                            </div>

                            <button 
                                type="submit"
                                disabled={submitting || (category === 'refund' && !selectedPurchaseId)}
                                className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-lg disabled:opacity-30 shadow-xl shadow-slate-100 flex items-center justify-center gap-2"
                            >
                                {submitting ? <Loader2 className="animate-spin" size={24} /> : <Send size={20} />}
                                문의 등록하기
                            </button>
                        </form>
                    </div>
                )}

                {view === 'list' && (
                    <div className="animate-in fade-in slide-in-from-left-4 duration-300">
                        <div className="mb-8">
                            <h2 className="text-2xl font-black text-slate-900">나의 문의 내역</h2>
                            <p className="text-slate-500 font-medium">관리자와 상담 중인 내역입니다.</p>
                        </div>

                        {inquiries.length === 0 ? (
                            <div className="bg-white rounded-3xl p-12 text-center border border-slate-100">
                                <Inbox className="w-16 h-16 text-slate-100 mx-auto mb-4" />
                                <p className="text-slate-400 font-bold">문의 내역이 없습니다.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {inquiries.map((i) => (
                                    <div 
                                        key={i.id}
                                        onClick={() => {
                                            setSelectedInquiry(i);
                                            fetchMessages(i.id);
                                            setView('detail');
                                        }}
                                        className="bg-white p-5 rounded-3xl border border-slate-100 flex justify-between items-center hover:border-indigo-500 hover:shadow-sm transition-all cursor-pointer group"
                                    >
                                        <div className="flex-1 min-w-0 pr-4">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                                    i.category === 'refund' ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-500'
                                                }`}>
                                                    {i.category === 'refund' ? '환불' : i.category === 'bug' ? '버그' : '문의'}
                                                </span>
                                                <span className="text-[10px] text-slate-400 font-bold">{new Date(formatSafariDate(i.created_at)).toLocaleDateString()}</span>
                                            </div>
                                            <h4 className="font-black text-slate-800 truncate">{i.title}</h4>
                                        </div>
                                        <div className={`px-3 py-1 rounded-full text-[10px] font-black ${
                                            i.status === 'answered' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                        }`}>
                                            {i.status === 'answered' ? '답변완료' : '검토중'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {view === 'detail' && selectedInquiry && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300 flex flex-col h-[70vh]">
                        <div className="mb-6 shrink-0">
                            <span className="bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase mb-2 inline-block">상담 스레드</span>
                            <h2 className="text-2xl font-black text-slate-900 leading-tight">{selectedInquiry.title}</h2>
                        </div>

                        {/* Thread View */}
                        <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-6">
                            {loadingMessages ? (
                                <div className="flex justify-center p-8"><Loader2 className="animate-spin text-indigo-600" /></div>
                            ) : (
                                messages.map((msg) => (
                                    <div key={msg.id} className={`flex flex-col ${msg.sender_role === 'admin' ? 'items-start' : 'items-end'}`}>
                                        <div className={`max-w-[85%] p-4 rounded-3xl text-sm leading-relaxed ${
                                            msg.sender_role === 'admin' 
                                            ? 'bg-slate-100 text-slate-700 rounded-tl-none' 
                                            : 'bg-indigo-600 text-white rounded-tr-none shadow-lg shadow-indigo-100'
                                        }`}>
                                            {msg.content}
                                        </div>
                                        <div className="flex items-center gap-1 mt-1.5 px-1">
                                            {msg.sender_role === 'admin' && <CheckCircle2 size={10} className="text-indigo-500" />}
                                            <span className="text-[10px] text-slate-400 font-bold">
                                                {msg.sender_role === 'admin' ? '운영진 답변' : '나의 메시지'} • {new Date(formatSafariDate(msg.created_at)).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* User Reply Box */}
                        <div className="bg-white p-2 rounded-3xl border border-slate-200 shadow-xl flex items-end gap-2 shrink-0">
                            <textarea
                                rows={1}
                                className="flex-1 bg-transparent p-4 text-sm font-medium outline-none resize-none"
                                placeholder="추가 문의사항을 입력하세요..."
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                            />
                            <button 
                                onClick={handleSendReply}
                                disabled={submitting || !replyText.trim()}
                                className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center hover:bg-indigo-700 transition-colors disabled:opacity-30 shrink-0"
                            >
                                {submitting ? <Loader2 className="animate-spin" size={18} /> : <Send size={20} />}
                            </button>
                        </div>
                    </div>
                )}
            </div>
            
            {/* Action Bar Floating (Only for menu view) */}
            {view === 'menu' && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-xs px-6">
                    <div className="bg-slate-900 rounded-2xl p-4 flex items-center justify-between shadow-2xl">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
                                <User size={16} className="text-white" />
                            </div>
                            <div className="text-left">
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">상담 대기 시간</p>
                                <p className="text-xs text-white font-bold">평균 24시간 이내 답변</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SupportPage;
