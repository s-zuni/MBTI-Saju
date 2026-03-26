import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Brain, ScrollText, Zap, Share2, Download, Award, ChevronRight, Info, Heart } from 'lucide-react';
import { stripMarkdown } from '../utils/textUtils';
import { generatePDF } from '../utils/pdfGenerator';
import ServiceNavigation, { ServiceType } from './ServiceNavigation';
import { experimental_useObject as useObject } from '@ai-sdk/react';
import { compatibilitySchema } from '../config/schemas';
import { SERVICE_COSTS } from '../config/creditConfig';

interface CompatibilityModalProps {
    isOpen: boolean;
    onClose: () => void;
    onNavigate: (service: ServiceType) => void;
    onUseCredit?: () => Promise<boolean>;
    credits?: number;
    session: any;
}

const CompatibilityModal: React.FC<CompatibilityModalProps> = ({ isOpen, onClose, onNavigate, onUseCredit, credits, session }) => {
    const reportRef = useRef<HTMLDivElement>(null);
    const [error, setError] = useState<string | null>(null);
    const [targetName, setTargetName] = useState('');
    const [targetBirthDate, setTargetBirthDate] = useState('');
    const [targetBirthTime, setTargetBirthTime] = useState('');
    const [targetMbti, setTargetMbti] = useState('');

    // Streaming Hook
    const { object: result, submit, isLoading } = useObject({
        api: '/api/compatibility',
        schema: compatibilitySchema,
        headers: {
            'Authorization': `Bearer ${session?.access_token || ''}`
        }
    });

    useEffect(() => {
        if (isOpen) {
            setError(null);
            setTargetName('');
            setTargetBirthDate('');
            setTargetBirthTime('');
            setTargetMbti('');
        }
    }, [isOpen]);

    const handleFetchCompatibility = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!targetName || !targetBirthDate || !targetMbti) {
            alert('상대방 정보를 모두 입력해주세요.');
            return;
        }

        const cost = SERVICE_COSTS.COMPATIBILITY;
        if (credits !== undefined && credits < cost) {
            if (window.confirm('크레딧이 부족합니다. 충전하시겠습니까?')) {
                onNavigate('creditPurchase' as any);
                onClose();
            }
            return;
        }

        try {
            setError(null);
            const metadata = session?.user?.user_metadata;
            if (!metadata) throw new Error('로그인이 필요합니다.');

            submit({
                targetName,
                targetBirthDate,
                targetBirthTime,
                targetMbti,
                userName: metadata.full_name,
                userBirthDate: metadata.birth_date,
                userBirthTime: metadata.birth_time,
                userMbti: metadata.mbti,
                userGender: metadata.gender
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
            await generatePDF(reportRef.current, `Compatibility_Report_${targetName}`);
        } catch (err) {
            alert('PDF 생성 중 오류가 발생했습니다.');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl overflow-y-auto h-full w-full flex justify-center items-center z-50 p-4">
            <div className="relative w-full max-w-2xl bg-white rounded-[48px] max-h-[94vh] overflow-hidden flex flex-col shadow-2xl">
                <ServiceNavigation currentService="compatibility" onNavigate={onNavigate} onClose={onClose} />

                <div className="p-8 sm:p-12 pb-4 shrink-0 bg-white">
                    <div className="flex justify-between items-end">
                        <div>
                            <div className="flex items-center gap-2 text-rose-500 font-black tracking-widest text-[10px] uppercase mb-1.5">
                                <Heart className="w-4 h-4" /> Destiny Harmony
                            </div>
                            <h3 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tighter uppercase">심층 궁합 분석</h3>
                        </div>
                    </div>
                    <div className="h-[2px] w-full bg-slate-950 mt-8"></div>
                </div>

                <div className="px-8 sm:p-12 pb-12 pt-4 overflow-y-auto custom-scrollbar grow bg-white">
                    {!result && !isLoading && (
                        <form onSubmit={handleFetchCompatibility} className="space-y-6 animate-fade-up">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">상대방 이름</label>
                                    <input type="text" value={targetName} onChange={(e) => setTargetName(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-bold" placeholder="이름 입력" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">상대방 MBTI</label>
                                    <input type="text" value={targetMbti} onChange={(e) => setTargetMbti(e.target.value.toUpperCase())} className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-bold" placeholder="예: ENFP" maxLength={4} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">상대방 생년월일</label>
                                <input type="date" value={targetBirthDate} onChange={(e) => setTargetBirthDate(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-bold" />
                            </div>
                            <button type="submit" className="w-full py-5 bg-slate-950 text-white rounded-full font-black text-lg shadow-2xl hover:scale-[1.02] active:scale-95 transition-all">궁합 분석 시작하기({SERVICE_COSTS.COMPATIBILITY} 크레딧)</button>
                        </form>
                    )}

                    {(isLoading || result) && (
                        <div ref={reportRef} className="bg-white">
                            {isLoading && !result ? (
                                <div className="flex flex-col justify-center items-center h-80">
                                    <Loader2 className="w-12 h-12 text-slate-200 animate-spin mb-6 stroke-[1px]" />
                                    <p className="text-slate-400 font-bold text-[10px] tracking-widest uppercase">궁합 분석 중입니다...</p>
                                </div>
                            ) : error ? (
                                <div className="text-center py-20 bg-red-50 rounded-[32px]">
                                    <p className="text-red-500 font-black mb-4">분석 중 오류가 발생했습니다.</p>
                                    <button onClick={handleFetchCompatibility} className="px-8 py-3 bg-slate-950 text-white rounded-full">다시 시도</button>
                                </div>
                            ) : result ? (
                                <div className="space-y-12 animate-fade-up">
                                    {/* Score Circle */}
                                    <div className="flex flex-col items-center py-10">
                                        <div className="relative w-40 h-40">
                                            <div className="absolute inset-0 rounded-full border-8 border-slate-50"></div>
                                            <div className="absolute inset-0 rounded-full border-8 border-rose-500 transition-all duration-1000" style={{ clipPath: `inset(0 0 0 ${100 - (result.score || 0)}%)` }}></div>
                                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                <span className="text-4xl font-black text-slate-950">{result.score || 0}</span>
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Points</span>
                                            </div>
                                        </div>
                                        <h4 className="mt-6 text-xl font-bold text-slate-950">{stripMarkdown(result.summary)}</h4>
                                    </div>

                                    {/* Keywords */}
                                    <div className="flex justify-center gap-2 flex-wrap pb-10 border-b border-slate-100">
                                        {result?.keywords?.filter((k: any): k is string => !!k).map((k, i) => (
                                            <span key={i} className="px-4 py-2 bg-slate-50 text-slate-900 rounded-lg text-xs font-bold border border-slate-100">#{k.trim()}</span>
                                        ))}
                                    </div>

                                    {/* Details */}
                                    <div className="grid gap-6">
                                        <section className="report-section">
                                            <h4 className="report-section-title"><Zap className="w-5 h-5 text-indigo-600" /> MBTI & 사주 융합 분석</h4>
                                            <div className="space-y-6">
                                                <div className="report-card">
                                                    <h5 className="font-bold text-slate-950 mb-2">성격 및 가치관 조화</h5>
                                                    <p className="text-sm text-slate-600 leading-relaxed">{stripMarkdown(result.details?.mbti_harmony)}</p>
                                                </div>
                                                <div className="report-card">
                                                    <h5 className="font-bold text-slate-950 mb-2">사주 명리학적 조화</h5>
                                                    <p className="text-sm text-slate-600 leading-relaxed">{stripMarkdown(result.details?.saju_harmony)}</p>
                                                </div>
                                                <div className="report-card bg-slate-950 text-white">
                                                    <h5 className="font-bold mb-2">관계 시너지</h5>
                                                    <p className="text-sm text-slate-300 leading-relaxed">{stripMarkdown(result.details?.synergy)}</p>
                                                </div>
                                                <div className="report-card border-slate-900">
                                                    <h5 className="font-bold text-slate-950 mb-2">조언 및 주의사항</h5>
                                                    <p className="text-sm text-slate-600 leading-relaxed font-bold italic">{stripMarkdown(result.details?.advice)}</p>
                                                </div>
                                            </div>
                                        </section>
                                    </div>

                                    <div className="flex flex-col items-center pt-10 border-t border-slate-100 gap-4">
                                        <button onClick={handleDownloadPDF} className="px-10 py-5 bg-slate-950 text-white rounded-full font-black shadow-2xl flex items-center gap-3">
                                            <Download className="w-5 h-5" /> PDF 결과서 다운로드
                                        </button>
                                        <button onClick={() => { setError(null); }} className="text-slate-400 text-xs font-bold hover:text-slate-950 transition-colors underline underline-offset-4">상대방 바꿔서 분석하기</button>
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

export default CompatibilityModal;
