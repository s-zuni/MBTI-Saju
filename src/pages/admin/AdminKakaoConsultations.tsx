import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../supabaseClient';
import {
    ArrowLeft,
    CheckCircle2,
    Clock,
    Copy,
    Loader2,
    MessageSquare,
    Plus,
    Send,
    Sparkles,
    User,
    Wallet,
} from 'lucide-react';
import { formatSafariDate } from '../../utils/textUtils';
import {
    KAKAO_CONSULT_PRODUCTS,
    KakaoConsultProductId,
    buildDepositGuide,
} from '../../config/kakaoConsult';

type PaymentStatus = 'awaiting' | 'paid' | 'refunded' | 'cancelled';

interface KakaoConsultation {
    id: string;
    receipt_code: string;
    product: KakaoConsultProductId;
    price_paid: number;
    payment_status: PaymentStatus;
    depositor_name: string | null;
    paid_at: string | null;
    customer_name: string;
    kakao_nickname: string | null;
    birth_date: string | null;
    birth_time: string | null;
    is_lunar: boolean;
    gender: 'male' | 'female' | null;
    mbti: string | null;
    question_text: string;
    ai_draft_answer: string | null;
    admin_answer: string | null;
    status: 'pending' | 'answered';
    answered_at: string | null;
    memo: string | null;
    created_at: string;
}

const PAYMENT_LABEL: Record<PaymentStatus, { text: string; className: string }> = {
    awaiting: { text: '입금대기', className: 'bg-amber-50 text-amber-700' },
    paid: { text: '입금확인', className: 'bg-green-50 text-green-700' },
    refunded: { text: '환불', className: 'bg-rose-50 text-rose-700' },
    cancelled: { text: '취소', className: 'bg-slate-100 text-slate-500' },
};

const EMPTY_FORM = {
    product: 'single' as KakaoConsultProductId,
    customer_name: '',
    kakao_nickname: '',
    depositor_name: '',
    birth_date: '',
    birth_time: '',
    is_lunar: false,
    gender: '' as '' | 'male' | 'female',
    mbti: '',
    question_text: '',
};

const fmt = (iso: string | null) =>
    iso
        ? new Date(formatSafariDate(iso)).toLocaleString([], {
              year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
          })
        : '-';

const copyText = async (text: string, doneMessage: string) => {
    try {
        await navigator.clipboard.writeText(text);
        alert(doneMessage);
    } catch {
        alert('복사에 실패했습니다. 직접 선택해 복사해 주세요.');
    }
};

/** 오늘 날짜 기준 접수번호(K + MMDD + 순번). 같은 날 마지막 번호 다음 값을 쓴다. */
const nextReceiptCode = async (): Promise<string> => {
    const now = new Date();
    const prefix = `K${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-`;
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const { data } = await supabase
        .from('kakao_consultations')
        .select('receipt_code')
        .like('receipt_code', `${prefix}%`)
        .gte('created_at', dayStart);
    const max = (data || []).reduce((m, r) => Math.max(m, Number(r.receipt_code.split('-')[1]) || 0), 0);
    return `${prefix}${String(max + 1).padStart(2, '0')}`;
};

const AdminKakaoConsultations: React.FC = () => {
    const [rows, setRows] = useState<KakaoConsultation[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'list' | 'new' | 'detail'>('list');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [answerText, setAnswerText] = useState('');
    const [busy, setBusy] = useState<null | 'save' | 'draft' | 'answer' | 'payment'>(null);

    const selected = useMemo(() => rows.find(r => r.id === selectedId) || null, [rows, selectedId]);

    const fetchRows = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('kakao_consultations')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) console.error('[AdminKakaoConsultations] fetch error:', error.message);
        setRows((data as KakaoConsultation[]) || []);
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchRows();
    }, [fetchRows]);

    // 이번 달 입금 확인 합계 (환불·취소 제외)
    const monthSummary = useMemo(() => {
        const now = new Date();
        const paid = rows.filter(r => {
            if (r.payment_status !== 'paid' || !r.paid_at) return false;
            const d = new Date(formatSafariDate(r.paid_at));
            return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
        });
        return { count: paid.length, total: paid.reduce((s, r) => s + r.price_paid, 0) };
    }, [rows]);

    const openDetail = (row: KakaoConsultation) => {
        setSelectedId(row.id);
        setAnswerText(row.admin_answer || row.ai_draft_answer || '');
        setView('detail');
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.customer_name.trim() || !form.question_text.trim()) return;

        setBusy('save');
        try {
            const receipt_code = await nextReceiptCode();
            const { data, error } = await supabase
                .from('kakao_consultations')
                .insert({
                    receipt_code,
                    product: form.product,
                    price_paid: KAKAO_CONSULT_PRODUCTS[form.product].price,
                    customer_name: form.customer_name.trim(),
                    kakao_nickname: form.kakao_nickname.trim() || null,
                    depositor_name: form.depositor_name.trim() || null,
                    birth_date: form.birth_date || null,
                    birth_time: form.birth_time || null,
                    is_lunar: form.is_lunar,
                    gender: form.gender || null,
                    mbti: form.mbti.trim().toUpperCase() || null,
                    question_text: form.question_text.trim(),
                })
                .select()
                .single();
            if (error) throw error;

            setForm(EMPTY_FORM);
            await fetchRows();
            openDetail(data as KakaoConsultation);
        } catch (err: any) {
            alert(`접수 등록 오류: ${err.message}`);
        } finally {
            setBusy(null);
        }
    };

    const updatePayment = async (payment_status: PaymentStatus) => {
        if (!selected) return;
        const label = PAYMENT_LABEL[payment_status].text;
        if (!window.confirm(`결제 상태를 '${label}'(으)로 바꾸시겠습니까?`)) return;

        setBusy('payment');
        const { error } = await supabase
            .from('kakao_consultations')
            .update({
                payment_status,
                paid_at: payment_status === 'paid' ? new Date().toISOString() : selected.paid_at,
            })
            .eq('id', selected.id);
        if (error) alert(`결제 상태 변경 오류: ${error.message}`);
        await fetchRows();
        setBusy(null);
    };

    const handleGenerateDraft = async () => {
        if (!selected) return;
        setBusy('draft');
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('/api/generate-consultation-draft', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`,
                },
                body: JSON.stringify({ kakao_consultation_id: selected.id }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || '초안 생성에 실패했습니다.');
            setAnswerText(data.draft);
            await fetchRows();
        } catch (err: any) {
            alert(`초안 생성 오류: ${err.message}`);
        } finally {
            setBusy(null);
        }
    };

    const saveAnswer = async (markDelivered: boolean) => {
        if (!selected || !answerText.trim()) return;
        if (markDelivered && !window.confirm('카톡으로 답변을 보낸 뒤에 누르세요. 전달 완료로 처리할까요?')) return;

        setBusy('answer');
        try {
            const patch: Record<string, unknown> = { admin_answer: answerText.trim() };
            if (markDelivered) {
                const { data: { user } } = await supabase.auth.getUser();
                patch.status = 'answered';
                patch.answered_at = new Date().toISOString();
                patch.answered_by = user?.id ?? null;
            }
            const { error } = await supabase.from('kakao_consultations').update(patch).eq('id', selected.id);
            if (error) throw error;
            await fetchRows();
            if (markDelivered) setView('list');
            else alert('답변을 저장했습니다.');
        } catch (err: any) {
            alert(`답변 저장 오류: ${err.message}`);
        } finally {
            setBusy(null);
        }
    };

    const inputClass =
        'w-full p-3 bg-white border border-slate-200 rounded-xl focus:border-violet-500 outline-none text-sm font-medium';
    const labelClass = 'text-xs font-black text-slate-400 block mb-1.5';

    /* ---------------------------- 신규 접수 ---------------------------- */
    if (view === 'new') {
        return (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 md:p-8">
                <button
                    onClick={() => setView('list')}
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-semibold mb-6"
                >
                    <ArrowLeft size={20} /> 목록으로
                </button>
                <h3 className="text-lg font-black text-slate-900 mb-1">카톡 상담 접수 등록</h3>
                <p className="text-xs text-slate-500 mb-6">
                    카톡 채팅방에서 받은 접수 양식을 그대로 옮겨 적습니다. 등록하면 접수번호가 자동 발급됩니다.
                </p>

                <form onSubmit={handleCreate} className="space-y-5 max-w-2xl">
                    <div>
                        <span className={labelClass}>상품</span>
                        <div className="grid grid-cols-2 gap-3">
                            {Object.values(KAKAO_CONSULT_PRODUCTS).map(p => (
                                <button
                                    type="button"
                                    key={p.id}
                                    onClick={() => setForm({ ...form, product: p.id })}
                                    className={`p-4 rounded-2xl border-2 text-left transition-all ${
                                        form.product === p.id ? 'border-slate-950 bg-slate-50' : 'border-slate-100 hover:border-slate-200'
                                    }`}
                                >
                                    <div className="text-sm font-black text-slate-900">{p.name}</div>
                                    <div className="text-xs text-slate-500 font-bold mt-0.5">{p.price.toLocaleString()}원</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <label>
                            <span className={labelClass}>이름(닉네임) *</span>
                            <input required className={inputClass} value={form.customer_name}
                                onChange={e => setForm({ ...form, customer_name: e.target.value })} />
                        </label>
                        <label>
                            <span className={labelClass}>카톡 프로필명</span>
                            <input className={inputClass} value={form.kakao_nickname}
                                onChange={e => setForm({ ...form, kakao_nickname: e.target.value })} />
                        </label>
                        <label>
                            <span className={labelClass}>입금자명</span>
                            <input className={inputClass} value={form.depositor_name}
                                onChange={e => setForm({ ...form, depositor_name: e.target.value })} />
                        </label>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <label>
                            <span className={labelClass}>생년월일</span>
                            <input type="date" className={inputClass} value={form.birth_date}
                                onChange={e => setForm({ ...form, birth_date: e.target.value })} />
                        </label>
                        <label>
                            <span className={labelClass}>태어난 시간 (모르면 비움)</span>
                            <input type="time" className={inputClass} value={form.birth_time}
                                onChange={e => setForm({ ...form, birth_time: e.target.value })} />
                        </label>
                        <label>
                            <span className={labelClass}>성별</span>
                            <select className={inputClass} value={form.gender}
                                onChange={e => setForm({ ...form, gender: e.target.value as '' | 'male' | 'female' })}>
                                <option value="">선택</option>
                                <option value="female">여성</option>
                                <option value="male">남성</option>
                            </select>
                        </label>
                        <label>
                            <span className={labelClass}>MBTI</span>
                            <input className={inputClass} maxLength={4} placeholder="ENFP" value={form.mbti}
                                onChange={e => setForm({ ...form, mbti: e.target.value })} />
                        </label>
                    </div>

                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                        <input type="checkbox" checked={form.is_lunar}
                            onChange={e => setForm({ ...form, is_lunar: e.target.checked })} />
                        음력 생일
                    </label>

                    <label className="block">
                        <span className={labelClass}>
                            고민 내용 * {form.product === 'triple' && '(3문항을 번호를 붙여 함께 적습니다)'}
                        </span>
                        <textarea required rows={8} maxLength={6000} className={`${inputClass} resize-none leading-relaxed`}
                            value={form.question_text}
                            onChange={e => setForm({ ...form, question_text: e.target.value })} />
                    </label>

                    <button
                        type="submit"
                        disabled={busy === 'save'}
                        className="w-full py-4 bg-slate-900 text-white rounded-xl font-black hover:bg-black disabled:opacity-30 flex items-center justify-center gap-2"
                    >
                        {busy === 'save' ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                        접수 등록하고 접수번호 발급
                    </button>
                </form>
            </div>
        );
    }

    /* ---------------------------- 상세 ---------------------------- */
    if (view === 'detail' && selected) {
        const product = KAKAO_CONSULT_PRODUCTS[selected.product];
        const isPaid = selected.payment_status === 'paid';
        const isAnswered = selected.status === 'answered';

        return (
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 min-h-[600px] flex flex-col">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <button
                        onClick={() => setView('list')}
                        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-semibold"
                    >
                        <ArrowLeft size={20} /> 목록으로
                    </button>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-slate-900">{selected.receipt_code}</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-black ${PAYMENT_LABEL[selected.payment_status].className}`}>
                            {PAYMENT_LABEL[selected.payment_status].text}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-black ${isAnswered ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                            {isAnswered ? '전달완료' : '답변대기'}
                        </span>
                    </div>
                </div>

                <div className="flex-1 grid grid-cols-1 md:grid-cols-2">
                    {/* 왼쪽: 결제 · 내담자 · 질문 */}
                    <div className="border-r border-slate-100 bg-slate-50/50 p-6 space-y-5">
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                            <h3 className="text-xs font-black text-slate-400 flex items-center gap-2 mb-4">
                                <Wallet size={14} /> 결제 (계좌이체)
                            </h3>
                            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                                <div><span className="text-slate-400 font-bold">상품:</span> {product.name}</div>
                                <div><span className="text-slate-400 font-bold">금액:</span> {selected.price_paid.toLocaleString()}원</div>
                                <div><span className="text-slate-400 font-bold">입금자명:</span> {selected.depositor_name || '-'}</div>
                                <div><span className="text-slate-400 font-bold">입금확인:</span> {fmt(selected.paid_at)}</div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => copyText(buildDepositGuide(selected.receipt_code, selected.product), '입금 안내문을 복사했습니다. 카톡에 붙여 넣으세요.')}
                                    className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-200 flex items-center gap-1.5"
                                >
                                    <Copy size={13} /> 입금 안내문 복사
                                </button>
                                {selected.payment_status === 'awaiting' && (
                                    <>
                                        <button disabled={busy === 'payment'} onClick={() => updatePayment('paid')}
                                            className="px-3 py-2 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 disabled:opacity-40">
                                            입금 확인
                                        </button>
                                        <button disabled={busy === 'payment'} onClick={() => updatePayment('cancelled')}
                                            className="px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 disabled:opacity-40">
                                            미입금 취소
                                        </button>
                                    </>
                                )}
                                {isPaid && (
                                    <button disabled={busy === 'payment'} onClick={() => updatePayment('refunded')}
                                        className="px-3 py-2 bg-white border border-rose-200 text-rose-600 rounded-lg text-xs font-bold hover:bg-rose-50 disabled:opacity-40">
                                        환불 처리
                                    </button>
                                )}
                            </div>
                            {isPaid && isAnswered && (
                                <p className="text-[11px] text-slate-400 mt-3">답변 전달 후 환불은 환불 규정상 예외 처리입니다.</p>
                            )}
                        </div>

                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                            <h3 className="text-xs font-black text-slate-400 flex items-center gap-2 mb-4">
                                <User size={14} /> 내담자 정보
                            </h3>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div><span className="text-slate-400 font-bold">이름:</span> {selected.customer_name}</div>
                                <div><span className="text-slate-400 font-bold">카톡:</span> {selected.kakao_nickname || '-'}</div>
                                <div><span className="text-slate-400 font-bold">MBTI:</span> <span className="font-black text-violet-600">{selected.mbti || '미입력'}</span></div>
                                <div><span className="text-slate-400 font-bold">성별:</span> {selected.gender === 'female' ? '여성' : selected.gender === 'male' ? '남성' : '미입력'}</div>
                                <div className="col-span-2">
                                    <span className="text-slate-400 font-bold">생년월일시:</span>{' '}
                                    {selected.birth_date || '미입력'} {selected.birth_time || '(시간 모름)'} {selected.is_lunar ? '· 음력' : '· 양력'}
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                            <h3 className="text-xs font-black text-slate-400 flex items-center gap-2 mb-4">
                                <MessageSquare size={14} /> 상담 질문
                            </h3>
                            <div className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{selected.question_text}</div>
                            <div className="mt-4 pt-4 border-t border-slate-100 text-[10px] text-slate-400 font-bold text-right">
                                접수: {fmt(selected.created_at)}
                            </div>
                        </div>
                    </div>

                    {/* 오른쪽: 답변 */}
                    <div className="p-6 flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xs font-black text-slate-400 flex items-center gap-2">
                                <Sparkles size={14} /> 답변 작성
                            </h3>
                            {!isAnswered && (
                                <button
                                    onClick={handleGenerateDraft}
                                    disabled={busy === 'draft' || !isPaid}
                                    title={isPaid ? '' : '입금 확인 후 생성할 수 있습니다.'}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 disabled:opacity-40"
                                >
                                    {busy === 'draft' ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                    AI 초안 생성
                                </button>
                            )}
                        </div>

                        {!isPaid && !isAnswered && (
                            <p className="text-xs text-amber-700 bg-amber-50 rounded-xl p-3 mb-3 font-bold">
                                입금 확인 전입니다. 입금 확인 후 초안을 생성하세요.
                            </p>
                        )}

                        <textarea
                            className="flex-1 min-h-[360px] w-full p-5 rounded-2xl border border-slate-200 focus:border-violet-500 outline-none text-sm leading-relaxed resize-none mb-4"
                            value={answerText}
                            onChange={e => setAnswerText(e.target.value)}
                            disabled={isAnswered}
                            placeholder="AI 초안을 생성한 뒤 직접 다듬어 주세요. 카톡에는 복사해서 보냅니다."
                        />

                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => copyText(answerText, '답변을 복사했습니다. 카톡에 붙여 넣으세요.')}
                                disabled={!answerText.trim()}
                                className="py-3 bg-[#FEE500] text-[#191919] rounded-xl font-black text-sm disabled:opacity-30 flex items-center justify-center gap-2"
                            >
                                <Copy size={16} /> 답변 복사
                            </button>
                            {!isAnswered && (
                                <button
                                    onClick={() => saveAnswer(false)}
                                    disabled={busy === 'answer' || !answerText.trim()}
                                    className="py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-black text-sm hover:bg-slate-50 disabled:opacity-30"
                                >
                                    임시 저장
                                </button>
                            )}
                        </div>

                        {!isAnswered ? (
                            <button
                                onClick={() => saveAnswer(true)}
                                disabled={busy === 'answer' || !answerText.trim() || !isPaid}
                                className="mt-2 w-full py-4 bg-slate-900 text-white rounded-xl font-black hover:bg-black disabled:opacity-30 flex items-center justify-center gap-2 text-sm"
                            >
                                {busy === 'answer' ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                                카톡 전달 완료 처리
                            </button>
                        ) : (
                            <div className="mt-2 text-center text-xs text-slate-500 font-bold bg-slate-50 p-3 rounded-xl border border-slate-100">
                                전달 완료: {fmt(selected.answered_at)}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    /* ---------------------------- 목록 ---------------------------- */
    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-slate-600 font-bold">
                    이번 달 입금 확인 {monthSummary.count}건 · {monthSummary.total.toLocaleString()}원
                </p>
                <button
                    onClick={() => setView('new')}
                    className="px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black hover:bg-black flex items-center gap-1.5"
                >
                    <Plus size={14} /> 카톡 접수 등록
                </button>
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100 text-xs font-bold text-slate-400">
                                <th className="px-6 py-4">접수번호</th>
                                <th className="px-6 py-4">결제</th>
                                <th className="px-6 py-4">답변</th>
                                <th className="px-6 py-4">내담자</th>
                                <th className="px-6 py-4">질문 (미리보기)</th>
                                <th className="px-6 py-4 text-right">접수일시</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan={6} className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin text-slate-300 mx-auto" /></td></tr>
                            ) : rows.length === 0 ? (
                                <tr><td colSpan={6} className="p-12 text-center text-slate-400 font-bold text-sm">등록된 카톡 상담이 없습니다.</td></tr>
                            ) : (
                                rows.map(r => (
                                    <tr key={r.id} onClick={() => openDetail(r)} className="hover:bg-slate-50/50 cursor-pointer">
                                        <td className="px-6 py-4 text-sm font-black text-slate-900 whitespace-nowrap">{r.receipt_code}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-black whitespace-nowrap ${PAYMENT_LABEL[r.payment_status].className}`}>
                                                {PAYMENT_LABEL[r.payment_status].text}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {r.status === 'answered' ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-green-50 text-green-700 text-[10px] font-black whitespace-nowrap">
                                                    <CheckCircle2 size={12} /> 전달완료
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 text-[10px] font-black whitespace-nowrap">
                                                    <Clock size={12} /> 대기중
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-900 text-sm">{r.customer_name}</div>
                                            <div className="text-[10px] text-slate-400 mt-0.5">
                                                {KAKAO_CONSULT_PRODUCTS[r.product].name} · {r.price_paid.toLocaleString()}원
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-slate-700 truncate max-w-xs">{r.question_text}</div>
                                        </td>
                                        <td className="px-6 py-4 text-right text-xs text-slate-500 font-medium whitespace-nowrap">{fmt(r.created_at)}</td>
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

export default AdminKakaoConsultations;
