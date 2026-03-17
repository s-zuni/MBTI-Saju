import React, { useState, useEffect } from 'react';
import { X, Send, HelpCircle, AlertCircle, CreditCard, MessageSquare, RotateCcw, ChevronDown, Check } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { CreditPurchase } from '../hooks/useCredits';

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
    
    // 구매 내역 관련 상태
    const [purchases, setPurchases] = useState<CreditPurchase[]>([]);
    const [selectedPurchaseId, setSelectedPurchaseId] = useState<string | null>(null);
    const [showPurchaseList, setShowPurchaseList] = useState(false);

    const fetchPurchases = React.useCallback(async () => {
        if (!session) return;
        const { data, error } = await supabase
            .from('credit_purchases')
            .select('*')
            .eq('user_id', session.user.id)
            .order('purchased_at', { ascending: false });
        
        if (!error && data) {
            setPurchases(data);
        }
    }, [session]);

    useEffect(() => {
        if (isOpen && session && category === 'refund') {
            fetchPurchases();
        }
    }, [isOpen, session, category, fetchPurchases]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!session) return;

        if (category === 'refund' && !selectedPurchaseId) {
            alert('환불하실 구매 내역을 선택해주세요.');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.from('support_inquiries').insert({
                user_id: session.user.id,
                category,
                title,
                content,
                status: 'pending',
                linked_purchase_id: selectedPurchaseId
            });

            if (error) throw error;
            setSuccess(true);
            setTimeout(() => {
                onClose();
                setSuccess(false);
                setTitle('');
                setContent('');
                setSelectedPurchaseId(null);
            }, 2000);
        } catch (error: any) {
            console.error('Inquiry error:', error);
            alert('문의 등록 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
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

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-600 text-white flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <MessageSquare className="w-5 h-5" />
                        <h2 className="text-xl font-bold">고객센터 문의하기</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-8 overflow-y-auto">
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
                                            onClick={() => {
                                                setCategory(cat.id);
                                                if (cat.id !== 'refund') setSelectedPurchaseId(null);
                                            }}
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

                            {category === 'refund' && (
                                <div className="animate-in slide-in-from-top-2 duration-300">
                                    <label className="block text-sm font-bold text-slate-700 mb-2">환불 대상 구매 내역</label>
                                    <div className="relative">
                                        <button
                                            type="button"
                                            onClick={() => setShowPurchaseList(!showPurchaseList)}
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between text-left hover:border-indigo-300 transition-all font-medium text-sm"
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
                                    required
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder={category === 'refund' ? '예: 구매한 크레딧 환불하고 싶어요' : '예: 환불 규정이 궁금해요'}
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
                                    rows={category === 'refund' ? 3 : 5}
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
