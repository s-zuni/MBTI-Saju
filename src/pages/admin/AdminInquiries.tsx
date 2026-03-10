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
    ArrowLeft
} from 'lucide-react';

interface Inquiry {
    id: string;
    user_id: string;
    category: string;
    title: string;
    content: string;
    answer: string | null;
    status: 'pending' | 'answered';
    coins_rewarded: number;
    created_at: string;
    answered_at: string | null;
    user_email?: string;
}

const AdminInquiries: React.FC = () => {
    const [inquiries, setInquiries] = useState<Inquiry[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
    const [answerText, setAnswerText] = useState('');
    const [rewardCoins, setRewardCoins] = useState(0);
    const [filter, setFilter] = useState<'all' | 'pending' | 'answered'>('all');

    const fetchInquiries = useCallback(async () => {
        setLoading(true);
        console.log('Fetching inquiries with filter:', filter);
        try {
            // Using left join (implicitly) but ensuring we get data even if profile is missing
            let query = supabase
                .from('support_inquiries')
                .select(`
                    *,
                    profiles!left(email)
                `);

            if (filter !== 'all') {
                query = query.eq('status', filter);
            }

            const { data, error } = await query.order('created_at', { ascending: false });

            console.log('Inquiries raw data:', data);
            if (error) {
                console.error('Supabase query error:', error);
                throw error;
            }

            const formattedData = (data || []).map((item: any) => ({
                ...item,
                user_email: item.profiles?.email || '이메일 정보 없음'
            }));

            setInquiries(formattedData);
        } catch (error) {
            console.error('Fetch error:', error);
        } finally {
            setLoading(false);
        }
    }, [filter]);

    useEffect(() => {
        fetchInquiries();
    }, [fetchInquiries]);

    const handleAnswer = async () => {
        if (!selectedInquiry) return;

        try {
            const { error: updateError } = await supabase
                .from('support_inquiries')
                .update({
                    answer: answerText,
                    status: 'answered',
                    coins_rewarded: rewardCoins,
                    answered_at: new Date().toISOString()
                })
                .eq('id', selectedInquiry.id);

            if (updateError) throw updateError;

            // If coins rewarded, update user profile
            if (rewardCoins > 0) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('coins')
                    .eq('id', selectedInquiry.user_id)
                    .single();

                if (profile) {
                    await supabase
                        .from('profiles')
                        .update({ coins: (profile.coins || 0) + rewardCoins })
                        .eq('id', selectedInquiry.user_id);
                }
            }

            alert('답변이 등록되었습니다.');
            setSelectedInquiry(null);
            setAnswerText('');
            setRewardCoins(0);
            fetchInquiries();
        } catch (error: any) {
            console.error('Answer error:', error);
            alert('답변 등록 중 오류가 발생했습니다.');
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
                            <span className={`px-3 py-1 rounded-full text-xs font-bold \${
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
                                        <div className="p-4 bg-white rounded-xl border border-slate-100 text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                                            {selectedInquiry.content}
                                        </div>
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
                                        <Coins size={16} className="text-amber-500" /> 보상 코인 지급 (Optional)
                                    </label>
                                    <input
                                        type="number"
                                        className="w-full p-4 rounded-2xl border border-slate-200 focus:border-indigo-500 outline-none transition-all"
                                        value={rewardCoins}
                                        onChange={(e) => setRewardCoins(parseInt(e.target.value) || 0)}
                                    />
                                    <p className="text-[10px] text-slate-400 mt-2 px-1">* 오류 보상 등으로 코인을 지급할 경우 입력하세요.</p>
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
                                    className={`px-6 py-2 rounded-xl text-sm font-bold transition-all \${
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
                                        setRewardCoins(inquiry.coins_rewarded || 0);
                                    }}
                                    className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex items-center justify-between group text-left w-full"
                                >
                                    <div className="flex items-center gap-6">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center \${
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
                                                {inquiry.coins_rewarded > 0 && (
                                                    <span className="text-[10px] text-amber-500 font-bold flex items-center gap-1">
                                                        <Coins size={12} /> {inquiry.coins_rewarded} 지급됨
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
