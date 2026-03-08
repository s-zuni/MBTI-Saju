import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Loader2, MessageSquare, Send, ChevronRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MobileHeader from '../components/MobileHeader';

interface Inquiry {
    id: string;
    title: string;
    content: string;
    status: 'pending' | 'replied';
    reply: string | null;
    created_at: string;
    user_id: string;
}

const SupportPage: React.FC = () => {
    const [inquiries, setInquiries] = useState<Inquiry[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [user, setUser] = useState<any>(null);
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
                .from('inquiries')
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) return;

        setIsSubmitting(true);
        try {
            const { error } = await supabase
                .from('inquiries')
                .insert({
                    user_id: user.id,
                    title,
                    content,
                    status: 'pending'
                });

            if (error) throw error;

            alert('문의가 등록되었습니다. 최대한 빨리 답변해 드리겠습니다.');
            setTitle('');
            setContent('');
            fetchInquiries(user.id);
        } catch (err) {
            console.error('Error submitting inquiry:', err);
            alert('문의 등록 중 오류가 발생했습니다.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatDate = (dateStr: string) => {
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
            <MobileHeader title="고객센터" />

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
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">제목</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="문의 제목을 입력해주세요"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">내용</label>
                                <textarea
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="궁금하신 내용을 자세히 적어주세요"
                                    className="w-full h-40 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all resize-none"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all disabled:opacity-50"
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
                                    <div key={inquiry.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:border-indigo-200 transition-all">
                                        <div className="p-5">
                                            <div className="flex items-start justify-between mb-3">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        {inquiry.status === 'replied' ? (
                                                            <span className="px-2 py-0.5 bg-green-100 text-green-600 text-[10px] font-bold rounded-full uppercase tracking-wider">답변완료</span>
                                                        ) : (
                                                            <span className="px-2 py-0.5 bg-slate-100 text-slate-400 text-[10px] font-bold rounded-full uppercase tracking-wider">처리중</span>
                                                        )}
                                                        <h3 className="font-bold text-slate-800">{inquiry.title}</h3>
                                                    </div>
                                                    <p className="text-xs text-slate-400">{formatDate(inquiry.created_at)}</p>
                                                </div>
                                                <ChevronRight className="w-4 h-4 text-slate-300" />
                                            </div>
                                            <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">{inquiry.content}</p>
                                        </div>

                                        {inquiry.status === 'replied' && inquiry.reply && (
                                            <div className="bg-indigo-50/50 p-5 border-t border-indigo-100/50">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center">
                                                        <ShieldCheck className="w-3.5 h-3.5 text-white" />
                                                    </div>
                                                    <span className="text-xs font-bold text-indigo-900">운영팀 답변</span>
                                                </div>
                                                <p className="text-sm text-indigo-900 leading-relaxed whitespace-pre-line font-medium">{inquiry.reply}</p>
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
