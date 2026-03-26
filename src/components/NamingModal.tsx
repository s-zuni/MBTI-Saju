import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Download, UserPlus, Sparkles } from 'lucide-react';
import { stripMarkdown } from '../utils/textUtils';
import ServiceNavigation, { ServiceType } from './ServiceNavigation';
import { generatePDF } from '../utils/pdfGenerator';
import { experimental_useObject as useObject } from '@ai-sdk/react';
import { namingSchema } from '../config/schemas';
import { SERVICE_COSTS } from '../config/creditConfig';

interface NamingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onNavigate: (service: ServiceType) => void;
    onUseCredit?: () => Promise<boolean>;
    credits?: number;
    session: any;
}

const BIRTH_TIME_SLOTS = [
    { value: 'unknown', label: '모름' },
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

const NamingModal: React.FC<NamingModalProps> = ({ isOpen, onClose, onNavigate, onUseCredit, credits, session }) => {
    const reportRef = useRef<HTMLDivElement>(null);
    const [error, setError] = useState<string | null>(null);
    const [targetBirthDate, setTargetBirthDate] = useState('');
    const [targetBirthTime, setTargetBirthTime] = useState('');
    const [targetGender, setTargetGender] = useState<'male' | 'female'>('female');

    // Streaming Hook
    const { object: result, submit, isLoading } = useObject({
        api: '/api/analysis-special',
        schema: namingSchema,
        headers: {
            'Authorization': `Bearer ${session?.access_token || ''}`
        }
    });

    useEffect(() => {
        if (isOpen) {
            setError(null);
            setTargetBirthDate('');
            setTargetBirthTime('');
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!targetBirthDate) {
            alert('생년월일을 입력해주세요.');
            return;
        }

        const cost = SERVICE_COSTS.NAMING;
        if (credits !== undefined && credits < cost) {
            if (window.confirm(`크레딧이 부족합니다. (작명 서비스는 ${cost}크레딧이 필요합니다.)`)) {
                onNavigate('creditPurchase' as any);
                onClose();
            }
            return;
        }

        try {
            setError(null);
            submit({
                type: 'naming',
                gender: targetGender,
                birthDate: targetBirthDate,
                birthTime: targetBirthTime
            });

            if (onUseCredit) {
                await onUseCredit();
            }
        } catch (e: any) {
            setError(e.message);
        }
    };

    const handleDownloadPDF = async () => {
        if (!reportRef.current || !result) return;
        try {
            await generatePDF(reportRef.current, `MBTIJU_Naming_Report_${new Date().getTime()}`);
        } catch (err) {
            alert('PDF 생성 중 오류가 발생했습니다.');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl overflow-y-auto h-full w-full flex justify-center items-center z-50 p-4">
            <div className="relative w-full max-w-2xl bg-white rounded-[48px] max-h-[94vh] overflow-hidden flex flex-col shadow-2xl">
                <ServiceNavigation currentService="naming" onNavigate={onNavigate} onClose={onClose} />

                <div className="p-8 sm:p-12 pb-4 shrink-0 bg-white">
                    <div className="flex justify-between items-end">
                        <div>
                            <div className="flex items-center gap-2 text-indigo-600 font-black tracking-widest text-[10px] uppercase mb-1.5">
                                <UserPlus className="w-4 h-4" /> Professional Naming
                            </div>
                            <h3 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tighter uppercase">명리학 작명</h3>
                        </div>
                    </div>
                    <div className="h-[2px] w-full bg-slate-950 mt-8"></div>
                </div>

                <div className="px-8 sm:p-12 pb-12 pt-4 overflow-y-auto custom-scrollbar grow bg-white">
                    {!result && !isLoading && (
                        <form onSubmit={handleSubmit} className="space-y-8 animate-fade-up">
                            <div className="grid grid-cols-2 gap-4">
                                <button type="button" onClick={() => setTargetGender('male')} className={`py-4 rounded-2xl font-bold border-2 transition-all ${targetGender === 'male' ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}>남성</button>
                                <button type="button" onClick={() => setTargetGender('female')} className={`py-4 rounded-2xl font-bold border-2 transition-all ${targetGender === 'female' ? 'bg-rose-500 border-rose-500 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}>여성</button>
                            </div>

                            <div className="space-y-4">
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">대상자 생년월일</label>
                                <input type="date" value={targetBirthDate} onChange={(e) => setTargetBirthDate(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 font-bold focus:ring-2 focus:ring-indigo-600 transition-all" />
                            </div>

                            <div className="space-y-4">
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">태어난 시간 (선택)</label>
                                <select value={targetBirthTime} onChange={(e) => setTargetBirthTime(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 font-bold focus:ring-2 focus:ring-indigo-600 appearance-none">
                                    <option value="">태어난 시간 선택 (모름 가능)</option>
                                    {BIRTH_TIME_SLOTS.map((slot) => (<option key={slot.value} value={slot.value}>{slot.label}</option>))}
                                </select>
                            </div>

                            <button type="submit" className="w-full py-5 bg-slate-950 text-white rounded-full font-black text-lg shadow-2xl hover:scale-[1.02] active:scale-95 transition-all">작명 분석 시작하기 ({SERVICE_COSTS.NAMING} 크레딧)</button>
                        </form>
                    )}

                    {(isLoading || result) && (
                        <div ref={reportRef} className="bg-white">
                            {isLoading && !result ? (
                                <div className="flex flex-col justify-center items-center h-80">
                                    <Loader2 className="w-12 h-12 text-slate-200 animate-spin mb-6 stroke-[1px]" />
                                    <p className="text-slate-400 font-bold text-[10px] tracking-widest uppercase">작명 분석 중입니다...</p>
                                </div>
                            ) : error ? (
                                <div className="text-center py-20 bg-red-50 rounded-[32px] border border-red-100">
                                    <p className="text-red-500 font-black mb-4">분석 중 오류가 발생했습니다.</p>
                                    <button onClick={handleSubmit} className="px-8 py-3 bg-slate-950 text-white rounded-full text-xs font-black">다시 시도</button>
                                </div>
                            ) : result ? (
                                <div className="space-y-12 animate-fade-up">
                                    <section className="report-section">
                                        <h4 className="report-section-title"><Sparkles className="w-5 h-5 text-indigo-600" /> 추천 이름 BEST 3</h4>
                                        <div className="grid gap-6">
                                            {result?.names?.map((name: any, i: number) => (
                                                <div key={i} className="report-card !p-8 border-slate-100 hover:border-indigo-200 transition-all">
                                                    <div className="flex justify-between items-start mb-6">
                                                        <div>
                                                            <span className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-1 block">추천 작명 {i+1}</span>
                                                            <h5 className="text-3xl font-black text-slate-950">{name.hangul} <span className="text-xl font-medium text-slate-400 ml-2">{name.hanja}</span></h5>
                                                        </div>
                                                        <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-indigo-600"><Sparkles className="w-6 h-6" /></div>
                                                    </div>
                                                    <div className="space-y-4 text-sm leading-relaxed">
                                                        <p className="text-slate-600"><strong className="text-slate-950 block mb-1">한자 의미</strong> {stripMarkdown(name.meaning)}</p>
                                                        <p className="text-slate-600"><strong className="text-slate-950 block mb-1">사주 조화</strong> {stripMarkdown(name.saju_compatibility)}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </section>

                                    <div className="flex flex-col items-center pt-10 border-t border-slate-100 gap-4">
                                        <button onClick={handleDownloadPDF} className="px-10 py-5 bg-slate-950 text-white rounded-full text-md font-black shadow-2xl transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-3">
                                            <Download className="w-5 h-5" /> PDF 결과서 다운로드
                                        </button>
                                        <button onClick={() => { setError(null); }} className="text-slate-400 text-xs font-bold hover:text-slate-950 transition-colors underline underline-offset-4">새로운 정보로 다시 분석하기</button>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NamingModal;
