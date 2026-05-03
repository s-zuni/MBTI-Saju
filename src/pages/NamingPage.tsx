import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import { Download, UserPlus, Sparkles, ChevronLeft, Coins } from 'lucide-react';
import { stripMarkdown } from '../utils/textUtils';
import { generatePDF } from '../utils/pdfGenerator';
import { experimental_useObject as useObject } from '@ai-sdk/react';
import { namingSchema } from '../config/schemas';
import { SERVICE_COSTS } from '../config/creditConfig';
import { calculateSaju } from '../utils/sajuUtils';
import { getRandomLoadingMessage } from '../config/loadingMessages';
import { useAuth } from '../hooks/useAuth';
import { useCredits } from '../hooks/useCredits';
import { useModalStore } from '../hooks/useModalStore';

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

const NamingPage: React.FC = () => {
    const { session, loading: isAuthLoading } = useAuth();
    const { credits, useCredits: consumeCredits } = useCredits(session);
    const { openModal } = useModalStore();
    const navigate = useNavigate();
    const reportRef = useRef<HTMLDivElement>(null);

    const [error, setError] = useState<string | null>(null);
    const [targetBirthDate, setTargetBirthDate] = useState('');
    const [targetBirthTime, setTargetBirthTime] = useState('');
    const [targetGender, setTargetGender] = useState<'male' | 'female'>('female');
    const [currentLoadingMessage, setCurrentLoadingMessage] = useState('');

    // Streaming Hook
    const { object: result, submit, isLoading } = useObject({
        api: '/api/analysis-special',
        schema: namingSchema,
        headers: {
            'Authorization': `Bearer ${session?.access_token || ''}`
        }
    });

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isLoading && !result) {
            setCurrentLoadingMessage(getRandomLoadingMessage('naming'));
            interval = setInterval(() => {
                setCurrentLoadingMessage(getRandomLoadingMessage('naming'));
            }, 5000);
        }
        return () => clearInterval(interval);
    }, [isLoading, result]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!targetBirthDate) {
            alert('생년월일을 입력해주세요.');
            return;
        }

        const cost = SERVICE_COSTS.NAMING;
        if (credits !== undefined && credits < cost) {
            openModal('creditPurchase', undefined, { requiredCredits: cost });
            return;
        }

        try {
            setError(null);

            
            const sajuData = calculateSaju(targetBirthDate, targetBirthTime);
            submit({
                type: 'naming',
                gender: targetGender,
                birthDate: targetBirthDate,
                birthTime: targetBirthTime,
                sajuData
            });

            await consumeCredits('NAMING');
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

    if (isAuthLoading) return null;
    if (!session) {
        navigate('/');
        return null;
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-32 pt-20 animate-fade-in">
            <div className="max-w-2xl mx-auto px-4">
                {/* Header Navigation */}
                <div className="flex items-center justify-between mb-8 px-4">
                    <button 
                        onClick={() => navigate('/fortune')}
                        className="p-2 hover:bg-white rounded-full transition-colors"
                    >
                        <ChevronLeft className="w-6 h-6 text-slate-600" />
                    </button>
                    <div className="flex items-center gap-1 px-3 py-1.5 bg-emerald-100 text-emerald-600 rounded-full text-sm font-bold">
                        <Coins className="w-4 h-4" />
                        {credits}
                    </div>
                </div>

                <div className="bg-white rounded-[48px] shadow-2xl shadow-emerald-100/50 overflow-hidden border border-white flex flex-col">
                    <div className="p-10 pb-4 border-b border-slate-50">
                        <div className="flex justify-between items-end">
                            <div className="flex items-center gap-2 text-emerald-600 font-black tracking-widest text-[10px] uppercase mb-2">
                                <UserPlus className="w-5 h-5 text-emerald-400" /> Professional Naming Service
                            </div>
                        </div>
                        <h1 className="text-4xl font-black text-slate-950 tracking-tighter leading-none">명리학 사주 작명</h1>
                    </div>

                    <div className="p-10">
                        {!result && !isLoading ? (
                            <form onSubmit={handleSubmit} className="space-y-10 animate-fade-up">
                                <div className="grid grid-cols-2 gap-6">
                                    <button 
                                        type="button" 
                                        onClick={() => setTargetGender('male')} 
                                        className={`py-6 rounded-3xl font-black text-lg border-2 transition-all ${targetGender === 'male' ? 'bg-emerald-600 border-emerald-600 text-white shadow-xl scale-[1.02]' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
                                    >
                                        남성
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={() => setTargetGender('female')} 
                                        className={`py-6 rounded-3xl font-black text-lg border-2 transition-all ${targetGender === 'female' ? 'bg-emerald-600 border-emerald-600 text-white shadow-xl scale-[1.02]' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
                                    >
                                        여성
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-[0.2em]">대상자 생년월일</label>
                                    <input 
                                        type="date" 
                                        value={targetBirthDate} 
                                        onChange={(e) => setTargetBirthDate(e.target.value)} 
                                        className="w-full px-8 py-5 bg-slate-50 border-2 border-slate-50 rounded-3xl text-slate-900 font-black text-lg focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none" 
                                    />
                                </div>

                                <div className="space-y-6">
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-[0.2em]">태어난 시간 (정확한 분석에 도움이 됩니다)</label>
                                    <div className="relative">
                                        <select 
                                            value={targetBirthTime} 
                                            onChange={(e) => setTargetBirthTime(e.target.value)} 
                                            className="w-full px-8 py-5 bg-slate-50 border-2 border-slate-50 rounded-3xl text-slate-900 font-black text-lg focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 appearance-none outline-none cursor-pointer"
                                        >
                                            <option value="">태어난 시간 선택 (모름 가능)</option>
                                            {BIRTH_TIME_SLOTS.map((slot) => (
                                                <option key={slot.value} value={slot.value}>{slot.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <button 
                                    type="submit" 
                                    className="w-full py-6 bg-slate-950 text-white rounded-[32px] font-black text-xl shadow-2xl hover:bg-emerald-600 hover:shadow-emerald-200/50 active:scale-[0.98] transition-all flex flex-col items-center justify-center gap-2"
                                >
                                    <span>작명 분석 시작하기</span>
                                    <span className="text-xs text-emerald-400 font-bold tracking-widest">{SERVICE_COSTS.NAMING} CREDITS</span>
                                </button>
                            </form>
                        ) : (
                            <div ref={reportRef} className="animate-fade-in">
                                {isLoading && !result ? (
                                    <div className="flex flex-col justify-center items-center py-20 px-6 text-center">
                                        <div className="relative mb-12">
                                            <div className="w-20 h-20 border-4 border-emerald-100 rounded-full"></div>
                                            <div className="absolute top-0 left-0 w-20 h-20 border-4 border-t-emerald-600 rounded-full animate-spin"></div>
                                        </div>
                                        <div className="space-y-4">
                                            <p className="text-slate-950 font-black text-2xl tracking-tight">
                                                {currentLoadingMessage || '최적의 이름을 분석 중입니다...'}
                                            </p>
                                            <p className="text-slate-400 font-bold text-xs tracking-widest uppercase">
                                                명리학적 조화를 고려하는 중
                                            </p>
                                        </div>
                                    </div>
                                ) : error ? (
                                    <div className="text-center py-20 bg-red-50 rounded-[40px]">
                                        <p className="text-red-600 font-black text-lg mb-6">분석 중 오류가 발생했습니다.</p>
                                        <button 
                                            onClick={() => window.location.reload()} 
                                            className="px-10 py-4 bg-slate-950 text-white rounded-2xl font-bold hover:bg-slate-800 transition-colors"
                                        >
                                            다시 시도하기
                                        </button>
                                    </div>
                                ) : result ? (
                                    <div className="space-y-16 animate-fade-up">
                                        <section className="space-y-8">
                                            <h4 className="text-xl font-black text-slate-950 inline-flex items-center gap-3 bg-emerald-50 py-3 px-6 rounded-full">
                                                <Sparkles className="w-6 h-6 text-emerald-600" /> 추천 이름 BEST 3
                                            </h4>
                                            <div className="grid gap-8">
                                                {result?.names?.map((name: any, i: number) => (
                                                    <div key={i} className="bg-slate-50 p-10 rounded-[40px] border border-slate-100 hover:bg-white hover:shadow-xl transition-all group relative overflow-hidden">
                                                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                                                            <Sparkles className="w-16 h-16 text-emerald-600" />
                                                        </div>
                                                        <div className="relative z-10">
                                                            <span className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-2 block">RECOMMENDATION 0{i+1}</span>
                                                            <h5 className="text-4xl font-black text-slate-950 mb-8 flex items-baseline gap-4">
                                                                {name.hangul}
                                                                <span className="text-xl font-medium text-slate-400">{name.hanja}</span>
                                                            </h5>
                                                            <div className="grid gap-8">
                                                                <div className="space-y-3">
                                                                    <p className="text-xs font-black text-slate-900 uppercase tracking-widest">한자 의미</p>
                                                                    <p className="text-slate-600 leading-relaxed font-medium text-lg break-keep">{stripMarkdown(name.meaning)}</p>
                                                                </div>
                                                                <div className="space-y-3">
                                                                    <p className="text-xs font-black text-slate-900 uppercase tracking-widest">사주 조화</p>
                                                                    <p className="text-slate-600 leading-relaxed font-medium text-lg break-keep">{stripMarkdown(name.saju_compatibility)}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </section>

                                        <div className="flex flex-col items-center pt-12 border-t border-slate-100 gap-6">
                                            <button 
                                                onClick={handleDownloadPDF} 
                                                className="w-full sm:w-auto px-12 py-6 bg-slate-950 text-white rounded-[32px] font-black text-xl shadow-2xl flex items-center justify-center gap-4 hover:bg-emerald-600 transition-all"
                                            >
                                                <Download className="w-6 h-6" /> 결과서 PDF 다운로드
                                            </button>
                                            <button 
                                                onClick={() => window.location.reload()} 
                                                className="text-slate-400 text-sm font-black hover:text-emerald-600 transition-colors uppercase tracking-widest underline underline-offset-8"
                                            >
                                                Analyze Another Name
                                            </button>
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NamingPage;
