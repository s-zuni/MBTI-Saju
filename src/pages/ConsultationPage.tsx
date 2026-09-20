import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { 
    MessageSquare, 
    Send, 
    Loader2, 
    ChevronRight, 
    ArrowLeft, 
    Inbox, 
    AlertCircle, 
    Sparkles,
    CheckCircle2,
    Ticket
} from 'lucide-react';
import { formatSafariDate } from '../utils/textUtils';
import ConsultationPurchaseModal from '../components/ConsultationPurchaseModal';
import { useNavigate } from 'react-router-dom';

interface ConsultationQuestion {
    id: string;
    question_text: string;
    admin_answer: string | null;
    status: 'pending' | 'answered';
    created_at: string;
    answered_at: string | null;
}

interface ConsultationPageProps {
    session: any;
}

const ConsultationPage: React.FC<ConsultationPageProps> = ({ session: initialSession }) => {
    const navigate = useNavigate();
    const [userId, setUserId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'list' | 'new' | 'detail'>('list');
    
    // Data state
    const [remainingQuestions, setRemainingQuestions] = useState(0);
    const [questions, setQuestions] = useState<ConsultationQuestion[]>([]);
    const [selectedQuestion, setSelectedQuestion] = useState<ConsultationQuestion | null>(null);
    
    // Form state
    const [questionText, setQuestionText] = useState('');
    const [submitting, setSubmitting] = useState(false);
    
    // Modal & Alert state
    const [showPurchaseModal, setShowPurchaseModal] = useState(false);
    const [showFirstTimeAlert, setShowFirstTimeAlert] = useState(false);

    const fetchData = useCallback(async (uid: string) => {
        try {
            // 1. Fetch remaining questions from view
            const { data: remainingData } = await supabase
                .from('consultation_remaining')
                .select('remaining_questions')
                .eq('user_id', uid)
                .maybeSingle();
                
            setRemainingQuestions(remainingData?.remaining_questions || 0);

            // 2. Fetch questions
            const { data: questionsData } = await supabase
                .from('consultation_questions')
                .select('*')
                .eq('user_id', uid)
                .order('created_at', { ascending: false });
                
            setQuestions(questionsData || []);
        } catch (err) {
            console.error('Error fetching consultation data:', err);
        }
    }, []);

    useEffect(() => {
        const init = async () => {
            try {
                const { data: { session: fetchedSession } } = await supabase.auth.getSession();
                const currentSession = fetchedSession || initialSession;
                
                if (currentSession) {
                    setUserId(currentSession.user.id);
                    await fetchData(currentSession.user.id);
                }
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [initialSession, fetchData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userId || !questionText.trim()) return;

        if (remainingQuestions <= 0) {
            setShowPurchaseModal(true);
            return;
        }

        setSubmitting(true);
        try {
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            
            const response = await fetch('/api/submit-consultation', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentSession?.access_token}`
                },
                body: JSON.stringify({ question_text: questionText })
            });

            const result = await response.json();

            if (!response.ok) {
                if (response.status === 402) {
                    setShowPurchaseModal(true);
                    throw new Error('잔여 상담 횟수가 부족합니다.');
                }
                throw new Error(result.error || '접수 중 오류가 발생했습니다.');
            }

            setQuestionText('');
            await fetchData(userId);
            setView('list');
            
            if (result.is_first_question) {
                setShowFirstTimeAlert(true);
            } else {
                alert('질문이 성공적으로 접수되었습니다.');
            }

        } catch (err: any) {
            if (err.message !== '잔여 상담 횟수가 부족합니다.') {
                alert(`오류: ${err.message}`);
            }
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="animate-spin text-slate-950" size={32} />
            </div>
        );
    }

    if (!userId) {
        return (
            <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
                <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full text-center">
                    <Sparkles className="w-16 h-16 text-violet-200 mx-auto mb-6" />
                    <h2 className="text-xl font-black text-slate-900 mb-2">로그인이 필요합니다</h2>
                    <p className="text-slate-500 text-sm mb-6 font-medium">전문가 심층 상담을 이용하시려면 먼저 로그인해 주세요.</p>
                    <button 
                        onClick={() => navigate('/?login=true')}
                        className="w-full py-4 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl font-black transition-colors"
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
                    {view === 'list' ? (
                        <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
                            <Sparkles size={20} className="text-violet-600" />
                            1대1 심층 운명 상담
                        </h1>
                    ) : (
                        <button 
                            onClick={() => setView('list')}
                            className="flex items-center gap-1 text-slate-900 font-black text-sm"
                        >
                            <ArrowLeft size={18} /> 목록으로
                        </button>
                    )}
                    
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 text-violet-700 rounded-full text-sm font-bold border border-violet-100">
                            <Ticket size={16} />
                            <span>{remainingQuestions}회</span>
                        </div>
                        {view === 'list' && remainingQuestions === 0 && (
                            <button 
                                onClick={() => setShowPurchaseModal(true)}
                                className="text-[11px] font-black uppercase text-white bg-violet-600 px-3 py-1.5 rounded-full hover:bg-violet-700 shadow-sm"
                            >
                                충전하기
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-xl mx-auto px-6 py-8">
                {view === 'list' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="mb-8">
                            <h2 className="text-2xl font-black text-slate-900 mb-2">무엇이든 물어보세요.</h2>
                            <p className="text-slate-500 font-medium">사주와 MBTI를 결합하여 전문가가 직접 답변해 드립니다.</p>
                        </div>

                        <button 
                            onClick={() => {
                                if (remainingQuestions <= 0) {
                                    setShowPurchaseModal(true);
                                } else {
                                    setView('new');
                                }
                            }}
                            className="w-full mb-8 p-6 bg-slate-950 rounded-3xl shadow-xl shadow-slate-200 flex items-center gap-4 hover:bg-black transition-all group"
                        >
                            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-white">
                                <MessageSquare size={24} />
                            </div>
                            <div className="text-left flex-1">
                                <h3 className="font-black text-white">새로운 상담 질문하기</h3>
                                <p className="text-xs text-slate-300 font-medium mt-0.5">잔여 횟수: {remainingQuestions}회</p>
                            </div>
                            <ChevronRight className="text-slate-500" size={20} />
                        </button>

                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">나의 질문 내역</h3>

                        {questions.length === 0 ? (
                            <div className="bg-white rounded-3xl p-12 text-center border border-slate-100">
                                <Inbox className="w-16 h-16 text-slate-100 mx-auto mb-4" />
                                <p className="text-slate-400 font-bold">아직 접수된 질문이 없습니다.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {questions.map((q) => (
                                    <div 
                                        key={q.id}
                                        onClick={() => {
                                            setSelectedQuestion(q);
                                            setView('detail');
                                        }}
                                        className="bg-white p-5 rounded-3xl border border-slate-100 flex justify-between items-center hover:border-violet-300 hover:shadow-md transition-all cursor-pointer group"
                                    >
                                        <div className="flex-1 min-w-0 pr-4">
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                                    q.status === 'answered' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                                }`}>
                                                    {q.status === 'answered' ? '답변완료' : '접수완료'}
                                                </span>
                                                <span className="text-[10px] text-slate-400 font-bold">
                                                    {new Date(formatSafariDate(q.created_at)).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <h4 className="font-bold text-slate-800 truncate text-sm">
                                                {q.question_text}
                                            </h4>
                                        </div>
                                        <ChevronRight size={16} className="text-slate-300 group-hover:text-violet-500 transition-colors" />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {view === 'new' && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="mb-6 bg-violet-50 p-4 rounded-2xl border border-violet-100 flex gap-3">
                            <AlertCircle className="w-5 h-5 text-violet-600 shrink-0 mt-0.5" />
                            <div className="text-sm text-violet-900">
                                <p className="font-bold mb-1">상담 접수 전 필독사항</p>
                                <ul className="list-disc pl-4 space-y-1 text-violet-700/80 text-xs">
                                    <li>구체적인 상황과 고민을 적어주실수록 더 정확한 분석이 가능합니다.</li>
                                    <li>질문은 한 번 제출하면 수정할 수 없습니다.</li>
                                    <li>접수 후 최대 24시간 이내에 전문가가 직접 답변을 달아드립니다.</li>
                                </ul>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-3">
                                <div className="flex justify-between items-end">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">질문 내용 작성</label>
                                    <span className="text-[10px] font-bold text-slate-400">{questionText.length} / 2000자</span>
                                </div>
                                <textarea 
                                    required
                                    rows={10}
                                    maxLength={2000}
                                    className="w-full p-4 bg-white border border-slate-200 rounded-3xl focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 outline-none transition-all text-sm font-medium resize-none shadow-sm"
                                    placeholder="현재 가장 고민되는 부분이나 궁금한 점을 편하게 적어주세요..."
                                    value={questionText}
                                    onChange={(e) => setQuestionText(e.target.value)}
                                />
                            </div>

                            <button 
                                type="submit"
                                disabled={submitting || !questionText.trim()}
                                className="w-full py-5 bg-violet-600 text-white rounded-2xl font-black text-lg hover:bg-violet-700 disabled:opacity-40 disabled:hover:bg-violet-600 transition-all shadow-xl shadow-violet-200 flex items-center justify-center gap-2"
                            >
                                {submitting ? <Loader2 className="animate-spin" size={24} /> : <Send size={20} />}
                                질문 접수하기 (1회 차감)
                            </button>
                        </form>
                    </div>
                )}

                {view === 'detail' && selectedQuestion && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                        {/* 질문 영역 */}
                        <div className="mb-6">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center">
                                    <MessageSquare size={14} className="text-white" />
                                </div>
                                <div>
                                    <span className="text-xs font-black text-slate-900 block">나의 질문</span>
                                    <span className="text-[10px] text-slate-400 font-bold block">
                                        {new Date(formatSafariDate(selectedQuestion.created_at)).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                            <div className="bg-white p-5 rounded-3xl rounded-tl-none border border-slate-200 shadow-sm text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                                {selectedQuestion.question_text}
                            </div>
                        </div>

                        {/* 답변 영역 */}
                        <div className="mt-8">
                            <div className="flex items-center gap-2 justify-end mb-3">
                                <div className="text-right">
                                    <span className="text-xs font-black text-violet-600 block flex items-center justify-end gap-1">
                                        <CheckCircle2 size={12} /> 전문가 답변
                                    </span>
                                    {selectedQuestion.answered_at && (
                                        <span className="text-[10px] text-slate-400 font-bold block">
                                            {new Date(formatSafariDate(selectedQuestion.answered_at)).toLocaleString()}
                                        </span>
                                    )}
                                </div>
                                <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center border border-violet-200">
                                    <Sparkles size={14} className="text-violet-600" />
                                </div>
                            </div>
                            
                            {selectedQuestion.status === 'answered' && selectedQuestion.admin_answer ? (
                                <div className="bg-violet-50 p-6 rounded-3xl rounded-tr-none border border-violet-100 shadow-md text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                                    {selectedQuestion.admin_answer}
                                </div>
                            ) : (
                                <div className="bg-slate-100 p-8 rounded-3xl rounded-tr-none border border-slate-200 text-center flex flex-col items-center justify-center gap-3">
                                    <Loader2 className="animate-spin text-slate-400" size={24} />
                                    <p className="text-sm font-bold text-slate-500">전문가가 질문을 꼼꼼히 분석하고 있습니다.<br/>답변이 등록될 때까지 조금만 기다려주세요.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Purchase Modal */}
            <ConsultationPurchaseModal
                isOpen={showPurchaseModal}
                onClose={() => setShowPurchaseModal(false)}
                userEmail={userId || ''} // 실제로는 profiles.email이 좋지만, payment API는 userId 기준으로 작동함
                onSuccess={(planId, pricePaid, granted, paymentId) => {
                    setShowPurchaseModal(false);
                    alert(`결제가 완료되었습니다. (${granted}회권 충전)`);
                    fetchData(userId!);
                }}
            />

            {/* First Time Alert Modal */}
            {showFirstTimeAlert && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95">
                        <div className="w-16 h-16 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Sparkles className="w-8 h-8 text-violet-600" />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 mb-2">질문이 접수되었습니다!</h3>
                        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                            현재 이용자가 많아 응답이 다소 지연될 수 있습니다.<br/>
                            <strong className="text-violet-600">최대 24시간 이내</strong>에 전문가가 직접<br/>정성스러운 답변을 남겨드릴 예정입니다.
                        </p>
                        <button 
                            onClick={() => setShowFirstTimeAlert(false)}
                            className="w-full py-4 bg-slate-900 hover:bg-black text-white rounded-xl font-bold transition-colors"
                        >
                            확인했습니다
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ConsultationPage;

