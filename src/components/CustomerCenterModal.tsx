import React, { useState } from 'react';
import { X, Send, HelpCircle, AlertCircle, CreditCard, MessageSquare, RotateCcw } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../hooks/useAuth';

interface CustomerCenterModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const categories = [
    { id: 'refund', label: '환불 요청', icon: <RotateCcw size={18} /> },
    { id: 'payment', label: '결제/요금제 문의', icon: <CreditCard size={18} /> },
    { id: 'error', label: '서비스 오류 제보', icon: <AlertCircle size={18} /> },
    { id: 'other', label: '기타 문의', icon: <HelpCircle size={18} /> },
];

const CustomerCenterModal: React.FC<CustomerCenterModalProps> = ({ isOpen, onClose }) => {
    const { session } = useAuth();
    const [category, setCategory] = useState('other');
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!session) return;

        setLoading(true);
        try {
            const { error } = await supabase.from('support_inquiries').insert({
                user_id: session.user.id,
                category,
                title,
                content,
                status: 'pending'
            });

            if (error) throw error;
            setSuccess(true);
            setTimeout(() => {
                onClose();
                setSuccess(false);
                setTitle('');
                setContent('');
            }, 2000);
        } catch (error: any) {
            console.error('Inquiry error:', error);
            alert('문의 등록 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-600 text-white">
                    <div className="flex items-center gap-2">
                        <MessageSquare className="w-5 h-5" />
                        <h2 className="text-xl font-bold">고객센터 문의하기</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-8">
                    {success ? (
                        <div className="text-center py-12">
                            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Send className="w-10 h-10" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 mb-2">문의가 접수되었습니다!</h3>
                            <p className="text-slate-500">최대한 빨리 답변해 드릴게요.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-3">문의 카테고리</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {categories.map((cat) => (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            onClick={() => setCategory(cat.id)}
                                            className={`
                                                flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-sm font-medium
                                                ${category === cat.id
                                                    ? 'border-indigo-600 bg-indigo-50 text-indigo-600 shadow-sm'
                                                    : 'border-slate-100 hover:border-slate-200 text-slate-600'}
                                            `}
                                        >
                                            {cat.icon}
                                            {cat.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">제목</label>
                                <input
                                    type="text"
                                    required
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="예: 환불 규정이 궁금해요"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">내용</label>
                                <textarea
                                    required
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="자세한 내용을 적어주시면 정확한 답변에 도움이 됩니다."
                                    rows={5}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all resize-none"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:bg-slate-300 disabled:shadow-none active:scale-[0.98]"
                            >
                                {loading ? '접수 중...' : '문의하기'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CustomerCenterModal;
