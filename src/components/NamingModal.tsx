import React, { useState, useEffect } from 'react';
import { Loader2, Sparkles, PenTool, Calendar, MessageSquare } from 'lucide-react';
import { supabase } from '../supabaseClient';
import ServiceNavigation, { ServiceType } from './ServiceNavigation';

interface NamingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onNavigate: (service: ServiceType) => void;
    onUseCredit?: () => Promise<boolean>;
    credits?: number;
}

const BIRTH_HOURS = [
    { value: '', label: '모름' },
    { value: '23:00-01:00', label: '자시 (23:00~01:00)' },
    { value: '01:00-03:00', label: '축시 (01:00~03:00)' },
    { value: '03:00-05:00', label: '인시 (03:00~05:00)' },
    { value: '05:00-07:00', label: '묘시 (05:00~07:00)' },
    { value: '07:00-09:00', label: '진시 (07:00~09:00)' },
    { value: '09:00-11:00', label: '사시 (09:00~11:00)' },
    { value: '11:00-13:00', label: '오시 (11:00~13:00)' },
    { value: '13:00-15:00', label: '미시 (13:00~15:00)' },
    { value: '15:00-17:00', label: '신시 (15:00~17:00)' },
    { value: '17:00-19:00', label: '유시 (17:00~19:00)' },
    { value: '19:00-21:00', label: '술시 (19:00~21:00)' },
    { value: '21:00-23:00', label: '해시 (21:00~23:00)' },
];

const NamingModal: React.FC<NamingModalProps> = ({ isOpen, onClose, onNavigate, onUseCredit, credits }) => {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{
        names: { name: string; hanja: string; meaning: string; sajuFit: string }[];
        analysis: string;
        summary: string;
    } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [targetBirthDate, setTargetBirthDate] = useState('');
    const [targetBirthTime, setTargetBirthTime] = useState('');
    const [requirements, setRequirements] = useState('');

    useEffect(() => {
        if (isOpen) {
            setResult(null);
            setError(null);
            setTargetBirthDate('');
            setTargetBirthTime('');
            setRequirements('');
        }
    }, [isOpen]);

    const handleAnalyze = async () => {
        if (!targetBirthDate) {
            setError('작명 대상의 생년월일을 입력해주세요.');
            return;
        }

        setLoading(true);
        setError(null);

        if (credits !== undefined && credits < 3) {
            setLoading(false);
            if (window.confirm('크레딧이 부족합니다. 충전 페이지로 이동하시겠습니까?')) {
                onNavigate('creditPurchase' as any);
            }
            return;
        }

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('로그인이 필요합니다.');

            const user = session.user.user_metadata;
            const response = await fetch('/api/naming', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    birthDate: user.birth_date,
                    birthTime: user.birth_time,
                    mbti: user.mbti,
                    gender: user.gender,
                    name: user.full_name,
                    targetBirthDate,
                    targetBirthTime,
                    requirements,
                })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                const detailMsg = errData.details ? ` (${errData.details})` : '';
                throw new Error(`${errData.error || '작명 분석을 받아오지 못했습니다.'}${detailMsg}`);
            }
            const data = await response.json();
            setResult(data);

            if (onUseCredit) {
                const creditSuccess = await onUseCredit();
                if (!creditSuccess) {
                    console.error('Credit deduction failed after successful naming analysis');
                }
            }

        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl overflow-y-auto h-full w-full flex justify-center items-center z-50 animate-fade-in p-4 sm:p-6">
            <div className="relative p-0 border-none w-full max-w-2xl shadow-[0_32px_128px_-12px_rgba(0,0,0,0.8)] rounded-[48px] bg-white max-h-[94vh] overflow-hidden flex flex-col border border-white/10">
                <ServiceNavigation currentService="naming" onNavigate={onNavigate} onClose={onClose} />

                {/* Header */}
                <div className="bg-white px-8 sm:px-12 pt-10 pb-4 shrink-0">
                    <div className="flex justify-between items-end">
                        <div>
                            <div className="flex items-center gap-2 text-teal-600 font-black tracking-[0.2em] text-[10px] uppercase mb-1.5">
                                <PenTool className="w-4 h-4" /> Destiny Naming
                            </div>
                            <h3 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tighter leading-none">
                                사주 작명소
                            </h3>
                        </div>
                    </div>
                    <div className="h-[2px] w-full bg-slate-950 mt-8"></div>
                </div>

                <div className="px-8 sm:px-12 pb-12 pt-4 overflow-y-auto custom-scrollbar grow bg-white">
                    {!result ? (
                        <div className="space-y-10 animate-fade-up py-4">
                            <section className="report-section">
                                <h4 className="report-section-title">
                                    <Calendar className="w-5 h-5 text-teal-600" /> 작명 대상 정보
                                </h4>
                                <p className="text-sm text-slate-500 mb-4">작명하고 싶은 분의 생년월일과 태어난 시간을 입력해주세요.</p>
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">생년월일</p>
                                        <input
                                            type="date"
                                            className="w-full p-4 rounded-2xl bg-slate-50 border-none text-slate-950 font-bold focus:ring-2 focus:ring-slate-200 transition-all"
                                            value={targetBirthDate}
                                            onChange={(e) => setTargetBirthDate(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">태어난 시간</p>
                                        <select
                                            className="w-full p-4 rounded-2xl bg-slate-50 border-none text-slate-950 font-bold focus:ring-2 focus:ring-slate-200 transition-all appearance-none"
                                            value={targetBirthTime}
                                            onChange={(e) => setTargetBirthTime(e.target.value)}
                                        >
                                            {BIRTH_HOURS.map(h => (
                                                <option key={h.value} value={h.value}>{h.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </section>

                            <section className="report-section">
                                <h4 className="report-section-title">
                                    <MessageSquare className="w-5 h-5 text-teal-600" /> 요청 사항
                                </h4>
                                <textarea
                                    className="w-full p-4 rounded-2xl bg-slate-50 border-none text-slate-950 font-bold focus:ring-2 focus:ring-slate-200 transition-all resize-none"
                                    rows={3}
                                    placeholder="예: 순한 느낌의 이름, 장남에 맞는 이름, 특정 돌림자 포함 등"
                                    value={requirements}
                                    onChange={(e) => setRequirements(e.target.value)}
                                />
                            </section>

                            <button
                                onClick={handleAnalyze}
                                disabled={loading || !targetBirthDate}
                                className="group relative w-full py-5 bg-slate-950 text-white rounded-full text-lg font-black shadow-2xl transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 mt-4 overflow-hidden"
                            >
                                <div className="relative z-10 flex items-center justify-center gap-3">
                                    {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <PenTool className="w-6 h-6 group-hover:rotate-12 transition-transform" />}
                                    {loading ? '사주 분석 및 작명 중...' : '사주 작명 시작하기'}
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-12 animate-fade-up">
                            {/* Summary */}
                            <div className="report-card bg-teal-950 text-white border-none p-10 relative overflow-hidden">
                                <Sparkles className="absolute top-6 right-6 w-10 h-10 text-white/10" />
                                <p className="text-teal-400 font-black mb-2 uppercase tracking-[0.3em] text-[10px]">사주 분석 요약</p>
                                <p className="text-xl font-bold leading-relaxed text-teal-100 whitespace-pre-wrap">
                                    {result.summary}
                                </p>
                            </div>

                            {/* Recommended Names */}
                            <section className="report-section">
                                <h4 className="report-section-title">
                                    <PenTool className="w-5 h-5 text-teal-600" /> 추천 이름
                                </h4>
                                <div className="grid gap-6">
                                    {result.names.map((item, i) => (
                                        <div key={i} className="report-card group hover:border-teal-300 transition-colors">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <h5 className="text-2xl font-black text-slate-950">{item.name}</h5>
                                                    {item.hanja && (
                                                        <p className="text-sm text-teal-600 font-bold mt-1">{item.hanja}</p>
                                                    )}
                                                </div>
                                                <span className="px-3 py-1 bg-teal-50 text-teal-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-teal-100">
                                                    추천 {i + 1}
                                                </span>
                                            </div>
                                            <div className="space-y-3">
                                                <div>
                                                    <p className="text-xs font-bold text-slate-400 mb-1">이름의 뜻</p>
                                                    <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">{item.meaning}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-slate-400 mb-1">사주 적합도</p>
                                                    <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">{item.sajuFit}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* Detailed Saju Analysis */}
                            <section className="report-section">
                                <h4 className="report-section-title">
                                    <Sparkles className="w-5 h-5 text-teal-600" /> 사주 명리학 분석
                                </h4>
                                <div className="report-card p-10 bg-slate-50 border-slate-100">
                                    <p className="text-slate-600 leading-relaxed text-md whitespace-pre-wrap">
                                        {result.analysis}
                                    </p>
                                </div>
                            </section>

                            <div className="flex flex-col items-center pt-10 border-t border-slate-100">
                                <button
                                    onClick={() => setResult(null)}
                                    className="px-10 py-5 bg-slate-950 text-white rounded-full text-md font-black shadow-2xl transition-all hover:scale-[1.02] active:scale-95"
                                >
                                    다른 작명 요청하기
                                </button>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="mt-8 p-6 bg-red-50 text-red-600 rounded-[24px] text-center text-sm font-bold border border-red-100 animate-shake">
                            {error}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NamingModal;
