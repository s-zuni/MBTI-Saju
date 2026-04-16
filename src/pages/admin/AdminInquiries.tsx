import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import {
    ChevronRight,
    ArrowLeft,
    Send,
    Loader2,
    MessageCircle,
    CheckCircle2,
    Clock
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
    profiles: {
        name: string;
        email: string;
    };
}

const AdminInquiries: React.FC = () => {
    const [inquiries, setInquiries] = useState<Inquiry[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
    const [replyText, setReplyText] = useState('');
    const [sending, setSending] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loadingMessages, setLoadingMessages] = useState(false);

    const fetchInquiries = useCallback(async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('support_inquiries')
                .select(`
                    *,
                    profiles:user_id (name, email)
                `)
                .neq('category', 'refund') // Exclude refunds from this view
                .order('created_at', { ascending: false });

            if (data) {
                setInquiries(data);
                setSelectedInquiry(prev => {
                    if (!prev) return null;
                    return data.find(i => i.id === prev.id) || prev;
                });
            }
            if (error) throw error;
        } catch (err) {
            console.error('Error fetching inquiries:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchMessages = useCallback(async (inquiryId: string) => {
        setLoadingMessages(true);
        try {
            const { data } = await supabase
                .from('support_inquiry_messages')
                .select('*')
                .eq('inquiry_id', inquiryId)
                .order('created_at', { ascending: true });
            setMessages(data || []);
        } catch (err) {
            console.error('Error fetching messages:', err);
        } finally {
            setLoadingMessages(false);
        }
    }, []);

    useEffect(() => {
        fetchInquiries();
    }, [fetchInquiries]);

    useEffect(() => {
        if (selectedInquiry) {
            fetchMessages(selectedInquiry.id);
        }
    }, [selectedInquiry, fetchMessages]);

    const handleSendReply = async () => {
        if (!selectedInquiry || !replyText.trim()) return;

        setSending(true);
        try {
            // 1. Add message to thread
            const { error: msgError } = await supabase
                .from('support_inquiry_messages')
                .insert({
                    inquiry_id: selectedInquiry.id,
                    sender_role: 'admin',
                    content: replyText
                });

            if (msgError) throw msgError;

            // 2. Update Inquiry Status
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
            fetchMessages(selectedInquiry.id);
            fetchInquiries();
        } catch (err: any) {
            alert(`답변 전송 오류: ${err.message}`);
        } finally {
            setSending(false);
        }
    };

    if (selectedInquiry) {
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
                            <p className="text-sm font-bold text-slate-900">{selectedInquiry.profiles?.name}</p>
                            <p className="text-[10px] text-slate-400">{selectedInquiry.profiles?.email}</p>
                        </div>
                        <span className={`px-4 py-1.5 rounded-full text-xs font-black ${
                            selectedInquiry.status === 'answered' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                            {selectedInquiry.status === 'answered' ? '해결됨' : '본인 검토 중'}
                        </span>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden grid md:grid-cols-5 h-[600px]">
                    {/* Message Thread */}
                    <div className="md:col-span-3 border-r border-slate-100 flex flex-col bg-slate-50/30">
                        <div className="p-6 border-b border-slate-100 bg-white">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">문의 내용</h3>
                            <h2 className="text-lg font-black text-slate-900 leading-tight">{selectedInquiry.title}</h2>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {loadingMessages ? (
                                <div className="flex justify-center p-8"><Loader2 className="animate-spin text-slate-950" /></div>
                            ) : (
                                messages.map((msg) => (
                                    <div key={msg.id} className={`flex flex-col ${msg.sender_role === 'admin' ? 'items-end' : 'items-start'}`}>
                                        <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ${
                                            msg.sender_role === 'admin' 
                                            ? 'bg-slate-900 text-white rounded-tr-none' 
                                            : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none shadow-sm'
                                        }`}>
                                            {msg.content}
                                        </div>
                                        <span className="text-[10px] text-slate-400 mt-1.5 px-1 font-bold">
                                            {msg.sender_role === 'admin' ? '운영진' : '사용자'} • {new Date(formatSafariDate(msg.created_at)).toLocaleString([], {month: 'numeric', day: 'numeric', hour: '2-digit', minute:'2-digit'})}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Reply Area */}
                    <div className="md:col-span-2 p-8 bg-white flex flex-col">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">답변 작성하기</h3>
                        <div className="flex-1 flex flex-col space-y-4">
                            <textarea
                                className="flex-1 w-full p-6 rounded-3xl border border-slate-200 focus:border-slate-950 outline-none transition-all text-sm resize-none"
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder="사용자에게 보낼 상세한 답변을 입력하세요..."
                            />
                            <button
                                onClick={handleSendReply}
                                disabled={sending || !replyText.trim()}
                                className="w-full py-5 bg-slate-950 text-white rounded-2xl font-black hover:bg-black transition-all flex items-center justify-center gap-3 disabled:opacity-30 shadow-xl shadow-slate-200"
                            >
                                {sending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
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
            <div>
                <h2 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
                    <MessageCircle className="w-8 h-8 text-slate-950" /> 고객문의 관리
                </h2>
                <p className="text-slate-500 font-medium">서비스 이용 관련 일반 문의 및 기술 지원 요청을 관리합니다.</p>
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">분류</th>
                                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">사용자</th>
                                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">문의 제목</th>
                                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">상태</th>
                                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">관리</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center">
                                        <Loader2 className="animate-spin text-slate-950 mx-auto" size={32} />
                                    </td>
                                </tr>
                            ) : inquiries.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center text-slate-400 text-sm">등록된 문의가 없습니다.</td>
                                </tr>
                            ) : (
                                inquiries.map((i) => (
                                    <tr key={i.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase">
                                                {i.category === 'bug' ? '버그리포트' : i.category === 'feature' ? '기능제안' : '기타'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="font-bold text-slate-900">{i.profiles?.name || '익명'}</div>
                                            <div className="text-[10px] text-slate-400">{i.profiles?.email}</div>
                                        </td>
                                        <td className="px-6 py-4 max-w-sm">
                                            <div className="font-bold text-slate-800 truncate">{i.title}</div>
                                            <div className="text-[10px] text-slate-400 font-medium">{new Date(formatSafariDate(i.created_at)).toLocaleDateString()}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className={`flex items-center gap-1.5 text-[10px] font-black ${
                                                i.status === 'answered' ? 'text-green-600' : 'text-amber-600'
                                            }`}>
                                                {i.status === 'answered' ? (
                                                    <><CheckCircle2 size={12} /> 답변완료</>
                                                ) : (
                                                    <><Clock size={12} /> 답변대기</>
                                                ) }
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => setSelectedInquiry(i)}
                                                className="flex items-center gap-1 px-4 py-2 bg-slate-900 text-white text-xs font-black rounded-xl hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-100"
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
        </div>
    );
};

export default AdminInquiries;
