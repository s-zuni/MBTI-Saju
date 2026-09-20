import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import {
    ChevronRight,
    ArrowLeft,
    Send,
    Loader2,
    MessageSquare,
    CheckCircle2,
    Clock,
    Sparkles,
    User
} from 'lucide-react';
import { formatSafariDate } from '../../utils/textUtils';

interface ConsultationQuestion {
    id: string;
    user_id: string;
    question_text: string;
    ai_draft_answer: string | null;
    admin_answer: string | null;
    status: 'pending' | 'answered';
    created_at: string;
    answered_at: string | null;
    profiles: {
        name: string;
        email: string;
        mbti: string | null;
        birth_date: string | null;
        birth_time: string | null;
        gender: string | null;
    } | null;
}

const AdminConsultations: React.FC = () => {
    const [questions, setQuestions] = useState<ConsultationQuestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'pending' | 'answered'>('pending');
    const [selectedQuestion, setSelectedQuestion] = useState<ConsultationQuestion | null>(null);
    
    const [answerText, setAnswerText] = useState('');
    const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchQuestions = useCallback(async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('consultation_questions')
                .select(`
                    *,
                    profiles:user_id (name, email, mbti, birth_date, birth_time, gender)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const mappedData: ConsultationQuestion[] = (data || []).map((item: any) => {
                const profile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
                return {
                    ...item,
                    profiles: profile ? {
                        name: profile.name || '알 수 없음',
                        email: profile.email || '알 수 없음',
                        mbti: profile.mbti,
                        birth_date: profile.birth_date,
                        birth_time: profile.birth_time,
                        gender: profile.gender
                    } : null
                };
            });

            setQuestions(mappedData);

            if (selectedQuestion) {
                const updated = mappedData.find(q => q.id === selectedQuestion.id);
                if (updated) setSelectedQuestion(updated);
            }
        } catch (err) {
            console.error('Error fetching consultation questions:', err);
        } finally {
            setLoading(false);
        }
    }, [selectedQuestion]);

    useEffect(() => {
        fetchQuestions().catch(err => console.error(err));
    }, [fetchQuestions]);

    const handleGenerateDraft = async () => {
        if (!selectedQuestion) return;
        
        setIsGeneratingDraft(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('/api/generate-consultation-draft', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({ question_id: selectedQuestion.id })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || '초안 생성에 실패했습니다.');

            setAnswerText(data.draft);
            
            // 질문 데이터 갱신 (ai_draft_answer 저장됨)
            await fetchQuestions();
            
        } catch (err: any) {
            alert(`초안 생성 오류: ${err.message}`);
        } finally {
            setIsGeneratingDraft(false);
        }
    };

    const handleSubmitAnswer = async () => {
        if (!selectedQuestion || !answerText.trim()) return;

        if (!window.confirm('답변을 사용자에게 전송하시겠습니까? 전송 후에는 수정할 수 없습니다.')) return;

        setIsSubmitting(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('/api/answer-consultation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({ 
                    question_id: selectedQuestion.id,
                    admin_answer: answerText
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || '답변 전송에 실패했습니다.');

            alert('답변이 성공적으로 전송되었습니다.');
            setSelectedQuestion(null);
            await fetchQuestions();
            
        } catch (err: any) {
            alert(`답변 전송 오류: ${err.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredQuestions = questions.filter(q => q.status === activeTab);

    if (selectedQuestion) {
        return (
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 animate-in slide-in-from-right duration-300 min-h-[600px] flex flex-col">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <button
                        onClick={() => setSelectedQuestion(null)}
                        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors font-semibold"
                    >
                        <ArrowLeft size={20} /> 목록으로
                    </button>
                    <div className="flex items-center gap-4">
                        <span className={`px-4 py-1.5 rounded-full text-xs font-black ${
                            selectedQuestion.status === 'answered' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                            {selectedQuestion.status === 'answered' ? '답변완료' : '답변대기'}
                        </span>
                    </div>
                </div>

                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 min-h-[500px]">
                    {/* Left: User Info & Question */}
                    <div className="border-r border-slate-100 bg-slate-50/50 p-6 flex flex-col">
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-6">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                                <User size={14} /> 내담자 정보
                            </h3>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div><span className="text-slate-400 font-bold">이름:</span> {selectedQuestion.profiles?.name}</div>
                                <div><span className="text-slate-400 font-bold">MBTI:</span> <span className="font-black text-violet-600">{selectedQuestion.profiles?.mbti || '미등록'}</span></div>
                                <div><span className="text-slate-400 font-bold">성별:</span> {selectedQuestion.profiles?.gender === 'M' ? '남성' : selectedQuestion.profiles?.gender === 'F' ? '여성' : '미등록'}</div>
                                <div className="col-span-2"><span className="text-slate-400 font-bold">생년월일시:</span> {selectedQuestion.profiles?.birth_date || '미등록'} {selectedQuestion.profiles?.birth_time || ''}</div>
                            </div>
                        </div>

                        <div className="flex-1 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                                <MessageSquare size={14} /> 상담 질문
                            </h3>
                            <div className="flex-1 overflow-y-auto text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                                {selectedQuestion.question_text}
                            </div>
                            <div className="mt-4 pt-4 border-t border-slate-100 text-[10px] text-slate-400 font-bold text-right">
                                접수일: {new Date(formatSafariDate(selectedQuestion.created_at)).toLocaleString()}
                            </div>
                        </div>
                    </div>

                    {/* Right: AI Draft & Reply Form */}
                    <div className="p-6 bg-white flex flex-col h-full max-h-[800px]">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Sparkles size={14} /> 답변 작성
                            </h3>
                            {selectedQuestion.status === 'pending' && (
                                <button
                                    onClick={handleGenerateDraft}
                                    disabled={isGeneratingDraft}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors disabled:opacity-50"
                                >
                                    {isGeneratingDraft ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                    AI 초안 생성
                                </button>
                            )}
                        </div>

                        <textarea
                            className="flex-1 w-full p-5 rounded-2xl border border-slate-200 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 outline-none transition-all text-sm leading-relaxed resize-none mb-4 shadow-inner"
                            value={
                                selectedQuestion.status === 'answered' 
                                    ? (selectedQuestion.admin_answer || '') 
                                    : answerText
                            }
                            onChange={e => setAnswerText(e.target.value)}
                            disabled={selectedQuestion.status === 'answered'}
                            placeholder={
                                selectedQuestion.status === 'answered' 
                                    ? "답변이 완료된 질문입니다." 
                                    : "사용자에게 보낼 최종 답변을 작성하거나, AI 초안을 생성 후 수정하세요."
                            }
                        />

                        {selectedQuestion.status === 'pending' && (
                            <button
                                onClick={handleSubmitAnswer}
                                disabled={isSubmitting || !answerText.trim()}
                                className="w-full py-4 bg-slate-900 text-white rounded-xl font-black hover:bg-black transition-all flex items-center justify-center gap-2 disabled:opacity-30 shadow-lg text-sm"
                            >
                                {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                                최종 답변 전송하기
                            </button>
                        )}
                        
                        {selectedQuestion.status === 'answered' && selectedQuestion.answered_at && (
                            <div className="text-center text-xs text-slate-500 font-bold bg-slate-50 p-3 rounded-xl border border-slate-100">
                                완료일시: {new Date(formatSafariDate(selectedQuestion.answered_at)).toLocaleString()}
                            </div>
                        )}
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
                        <MessageSquare className="w-6 h-6 text-violet-600" />
                        운명 상담 관리
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">유료 비동기 전문가 상담(3회권/1회권) 질문 접수 및 답변 관리</p>
                </div>

                <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200">
                    <button
                        onClick={() => { setActiveTab('pending'); setSelectedQuestion(null); }}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                            activeTab === 'pending' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        미답변 질문
                    </button>
                    <button
                        onClick={() => { setActiveTab('answered'); setSelectedQuestion(null); }}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                            activeTab === 'answered' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        답변 완료
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-widest">
                                <th className="px-6 py-4">상태</th>
                                <th className="px-6 py-4">내담자</th>
                                <th className="px-6 py-4">질문 내용 (미리보기)</th>
                                <th className="px-6 py-4 text-right">접수일시</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin text-slate-300 mx-auto" /></td>
                                </tr>
                            ) : filteredQuestions.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="p-12 text-center text-slate-400 font-bold text-sm">해당하는 상담 질문이 없습니다.</td>
                                </tr>
                            ) : (
                                filteredQuestions.map(q => (
                                    <tr 
                                        key={q.id} 
                                        onClick={() => {
                                            setSelectedQuestion(q);
                                            // Reset text area when opening a pending question (or set to draft if exists)
                                            if (q.status === 'pending') {
                                                setAnswerText(q.ai_draft_answer || '');
                                            }
                                        }}
                                        className="hover:bg-slate-50/50 transition-colors cursor-pointer group"
                                    >
                                        <td className="px-6 py-4 align-middle">
                                            {q.status === 'answered' ? (
                                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-green-50 text-green-700 text-[10px] font-black">
                                                    <CheckCircle2 size={12} /> 완료
                                                </div>
                                            ) : (
                                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 text-[10px] font-black">
                                                    <Clock size={12} /> 대기중
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 align-middle">
                                            <div className="font-bold text-slate-900 text-sm">{q.profiles?.name}</div>
                                            <div className="text-[10px] text-slate-400 mt-0.5">{q.profiles?.email}</div>
                                        </td>
                                        <td className="px-6 py-4 align-middle">
                                            <div className="text-sm font-medium text-slate-700 truncate max-w-md">
                                                {q.question_text}
                                            </div>
                                            {q.status === 'pending' && q.ai_draft_answer && (
                                                <div className="text-[10px] text-indigo-500 font-bold mt-1 flex items-center gap-1">
                                                    <Sparkles size={10} /> AI 초안 생성됨
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right align-middle text-xs text-slate-500 font-medium whitespace-nowrap">
                                            {new Date(formatSafariDate(q.created_at)).toLocaleString([], { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute:'2-digit' })}
                                            <ChevronRight size={16} className="inline-block ml-2 text-slate-300 group-hover:text-slate-600 transition-colors" />
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

export default AdminConsultations;

