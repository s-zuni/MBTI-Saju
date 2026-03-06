import React from 'react';
import { Sparkles, Brain, ScrollText, Zap, Calendar, AlertTriangle, Briefcase, Heart, Lightbulb, Layers } from 'lucide-react';

interface DetailedReportCardProps {
    userName: string;
    mbti: string;
    sajuElement: string;
    analysis: any;
}

export const DetailedReportCard = React.forwardRef<HTMLDivElement, DetailedReportCardProps>(({
    userName, mbti, sajuElement, analysis
}, ref) => {
    const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    if (!analysis) return null;

    return (
        <div ref={ref} className="w-[800px] bg-white p-16 text-slate-900 relative shadow-none font-sans report-container overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-50"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-50 rounded-full blur-3xl -ml-32 -mb-32 opacity-50"></div>

            {/* Header: Verified Seal Look */}
            <div className="relative border-b-2 border-slate-900/10 pb-12 mb-12">
                <div className="flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-2 text-indigo-600 font-bold tracking-[0.2em] text-xs uppercase mb-3">
                            <Sparkles className="w-4 h-4" /> MBTIJU Premium Archive
                        </div>
                        <h1 className="text-5xl font-black text-slate-950 tracking-tight leading-tight mb-4">
                            SOUL REPORT<br />
                            <span className="text-indigo-600">{userName}</span>
                        </h1>
                    </div>
                    <div className="text-right">
                        <div className="w-24 h-24 border-4 border-indigo-600/20 rounded-full flex items-center justify-center mb-2 mx-auto">
                            <div className="w-16 h-16 border-2 border-indigo-600 rounded-full flex items-center justify-center">
                                <span className="text-[10px] font-black text-indigo-600 leading-tight">ORIGINAL<br />VERIFIED</span>
                            </div>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Doc No. MS-{Math.random().toString(36).substr(2, 9).toUpperCase()}</p>
                    </div>
                </div>
                <div className="mt-8 flex gap-4 text-sm text-slate-500 font-medium">
                    <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {today}</span>
                    <span className="w-px h-4 bg-slate-200"></span>
                    <span>성격 & 운명 융합 정밀 진단서</span>
                </div>
            </div>

            {/* Identification Summary */}
            <div className="grid grid-cols-2 gap-8 mb-16">
                <div className="report-card !bg-slate-950 !border-none text-white p-8">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Persona Type</div>
                    <div className="text-4xl font-black">{mbti}</div>
                    <div className="mt-4 text-xs text-slate-400 leading-relaxed italic">
                        심리적 성향과 사회적 페르소나의 핵심 지표
                    </div>
                </div>
                <div className="report-card p-8 border-slate-200 bg-white shadow-sm">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Destiny Element</div>
                    <div className="text-4xl font-black text-indigo-600">{sajuElement}</div>
                    <div className="mt-4 text-xs text-slate-500 leading-relaxed italic">
                        명리학적 에너지를 상징하는 타고난 본성
                    </div>
                </div>
            </div>

            {/* Detailed Analysis Sections */}
            <div className="space-y-16">
                {/* 1. 본성 (Nature) */}
                {(analysis.nature || analysis.sajuReading) && (
                    <div className="report-section">
                        <h2 className="report-section-title">
                            <ScrollText className="w-5 h-5 text-indigo-600" /> 01. 본성 (Nature): 선천적 기질 진단
                        </h2>
                        <div className="report-card bg-slate-50/30">
                            {analysis.nature?.dayPillarSummary && (
                                <p className="text-lg font-bold text-slate-800 mb-6 border-b border-slate-200 pb-4 italic">
                                    "{analysis.nature.dayPillarSummary}"
                                </p>
                            )}
                            <div className="space-y-4 text-slate-700 text-sm leading-relaxed">
                                {analysis.nature?.dayMasterAnalysis && (
                                    <p><span className="font-bold text-slate-950 mr-2">● 일간(日干):</span> {analysis.nature.dayMasterAnalysis}</p>
                                )}
                                {analysis.nature?.dayBranchAnalysis && (
                                    <p><span className="font-bold text-slate-950 mr-2">● 일지(日支):</span> {analysis.nature.dayBranchAnalysis}</p>
                                )}
                                {analysis.nature?.monthBranchAnalysis && (
                                    <p><span className="font-bold text-slate-950 mr-2">● 월지(月支):</span> {analysis.nature.monthBranchAnalysis}</p>
                                )}
                                {!analysis.nature && analysis.sajuReading && (
                                    <p className="whitespace-pre-wrap">{analysis.sajuReading}</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. 오행 (Five Elements) */}
                {analysis.fiveElements?.elements && (
                    <div className="report-section">
                        <h2 className="report-section-title">
                            <Layers className="w-5 h-5 text-indigo-600" /> 02. 에너지 밸런스 점검
                        </h2>
                        <div className="report-card p-0 overflow-hidden border-slate-200">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-slate-950 text-white uppercase tracking-tighter">
                                    <tr>
                                        <th className="px-6 py-4 font-bold border-r border-slate-800">오행</th>
                                        <th className="px-6 py-4 font-bold border-r border-slate-800">심리적 기능</th>
                                        <th className="px-6 py-4 font-bold">에너지 해석</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {analysis.fiveElements.elements.map((el: any, idx: number) => (
                                        <tr key={idx}>
                                            <td className="px-6 py-4 font-black text-slate-950 border-r border-slate-50">{el.element} ({el.count})</td>
                                            <td className="px-6 py-4 font-medium text-slate-500 border-r border-slate-50">{el.function}</td>
                                            <td className="px-6 py-4 text-slate-600 leading-relaxed">{el.interpretation}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* 3. 페르소나 (Persona) */}
                {(analysis.persona || analysis.mbtiCompatibility) && (
                    <div className="report-section">
                        <h2 className="report-section-title">
                            <Brain className="w-5 h-5 text-indigo-600" /> 03. 페르소나 (Persona): 사회적 자아 분석
                        </h2>
                        <div className="report-card bg-indigo-50/20 border-indigo-100">
                            {analysis.persona?.mbtiNickname && (
                                <p className="text-indigo-800 font-black text-xl mb-4">"{analysis.persona.mbtiNickname}"</p>
                            )}
                            <div className="grid grid-cols-2 gap-4 text-xs mb-6">
                                {analysis.persona?.dominantFunction && (
                                    <div className="p-3 bg-white rounded-lg border border-indigo-100">
                                        <div className="text-indigo-400 font-bold mb-1">주기능</div>
                                        <div className="text-slate-900 font-bold">{analysis.persona.dominantFunction}</div>
                                    </div>
                                )}
                                {analysis.persona?.auxiliaryFunction && (
                                    <div className="p-3 bg-white rounded-lg border border-indigo-100">
                                        <div className="text-indigo-400 font-bold mb-1">부기능</div>
                                        <div className="text-slate-900 font-bold">{analysis.persona.auxiliaryFunction}</div>
                                    </div>
                                )}
                            </div>
                            <div className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                                {analysis.mbtiCompatibility || "종합적인 사회적 페르소나 분석 결과입니다."}
                            </div>
                        </div>
                    </div>
                )}

                {/* 4. 융합 진단 (Integration) */}
                {analysis.deepIntegration && (
                    <div className="report-section">
                        <h2 className="report-section-title">
                            <Zap className="w-5 h-5 text-indigo-600" /> 04. 심층 융합 진단
                        </h2>
                        <div className="space-y-4">
                            {analysis.deepIntegration.integrationPoints?.map((point: any, idx: number) => (
                                <div key={idx} className="report-card !mb-0 !p-8 bg-slate-50/50">
                                    <div className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-3">Analysis Point 0{idx + 1}</div>
                                    <h4 className="font-black text-slate-950 text-lg mb-3">{point.subtitle}</h4>
                                    <p className="text-slate-600 text-sm leading-relaxed">{point.content}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 5. 연간 운세 (Fortune) */}
                {(analysis.yearlyFortune || analysis.fortune2026) && (
                    <div className="report-section">
                        <h2 className="report-section-title">
                            <Calendar className="w-5 h-5 text-indigo-600" /> 05. 연간 운세 및 흐름 리포트
                        </h2>
                        <div className="report-card border-none bg-indigo-950 text-white p-10">
                            {analysis.yearlyFortune?.theme && (
                                <h3 className="text-2xl font-black mb-6 leading-tight">
                                    <span className="text-indigo-400 italic">2026 Theme:</span><br />
                                    "{analysis.yearlyFortune.theme}"
                                </h3>
                            )}
                            <p className="text-slate-300 text-sm leading-relaxed mb-6">
                                {analysis.yearlyFortune?.overview || analysis.fortune2026}
                            </p>
                            {analysis.yearlyFortune?.keywords && (
                                <div className="flex flex-wrap gap-2">
                                    {analysis.yearlyFortune.keywords.map((kw: string, i: number) => (
                                        <span key={i} className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-bold tracking-widest uppercase">#{kw}</span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 6. 전략 가이드 (Strategy) */}
                {(analysis.warnings || analysis.fieldStrategies || analysis.finalSolution || analysis.advice) && (
                    <div className="report-section">
                        <h2 className="report-section-title">
                            <Lightbulb className="w-5 h-5 text-indigo-600" /> 06. 전문가 전략 가이드 (Advice)
                        </h2>
                        <div className="grid grid-cols-3 gap-4 mb-6">
                            <div className="report-card border-slate-200 !p-5">
                                <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2"><Briefcase className="w-4 h-4 text-indigo-600" /> 커리어 (Career)</h4>
                                <p className="text-[11px] text-slate-600 leading-relaxed font-medium">{analysis.fieldStrategies?.career?.analysis || "현재 진로 환경에서의 성장 가능성"}</p>
                            </div>
                            <div className="report-card border-slate-200 !p-5">
                                <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2"><Heart className="w-4 h-4 text-rose-500" /> 연애/관계 (Love)</h4>
                                <p className="text-[11px] text-slate-600 leading-relaxed font-medium">{analysis.fieldStrategies?.love?.analysis || "타인과 공명하는 깊은 유대감"}</p>
                            </div>
                            <div className="report-card border-slate-200 !p-5">
                                <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2">💰 재물 (Wealth)</h4>
                                <p className="text-[11px] text-slate-600 leading-relaxed font-medium">{analysis.fieldStrategies?.wealth?.analysis || "재물 축적과 경제적 흐름 파악"}</p>
                            </div>
                        </div>

                        {/* 주의사항 / 금기 */}
                        {(analysis.warnings?.watchOut?.length > 0 || analysis.warnings?.avoid?.length > 0) && (
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="report-card border-slate-200 !p-5 bg-red-50/10">
                                    <h4 className="font-bold text-red-600 mb-3 flex items-center gap-2 text-xs">🚨 2026년 주의사항 (Watch Out)</h4>
                                    <ul className="list-disc pl-4 space-y-1">
                                        {analysis.warnings.watchOut?.map((w: any, idx: number) => (
                                            <li key={idx} className="text-[11px] text-slate-600 font-medium"><strong>{w.title}:</strong> {w.description}</li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="report-card border-slate-200 !p-5 bg-slate-50/50">
                                    <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-xs">🛑 피해야 할 것 (Avoid)</h4>
                                    <ul className="list-disc pl-4 space-y-1">
                                        {analysis.warnings.avoid?.map((a: any, idx: number) => (
                                            <li key={idx} className="text-[11px] text-slate-600 font-medium"><strong>{a.title}:</strong> {a.description}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}
                        <div className="report-card bg-slate-950 text-white !mb-0 mt-6">
                            <h4 className="font-bold text-indigo-400 mb-4 flex items-center gap-2 font-sans"><AlertTriangle className="w-4 h-4" /> CORE GUIDELINE</h4>
                            <p className="text-sm font-medium leading-relaxed italic">
                                {analysis.finalSolution?.closingMessage || analysis.advice || "분석을 바탕으로 삶의 균형을 찾아가는 과정에서 이 리포트가 소중한 지표가 되길 바랍니다."}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Final Verification Footer */}
            <div className="mt-24 pt-12 border-t border-slate-200 flex justify-between items-end grayscale opacity-50">
                <div className="text-left">
                    <p className="text-[10px] font-black text-slate-950 tracking-widest uppercase mb-2">Authenticated By</p>
                    <p className="text-[14px] font-black leading-none">MBTIJU ANALYTICS GROUP</p>
                    <p className="text-[10px] font-medium text-slate-500 mt-1">Advanced Psychology & Destiny Fusion Systems</p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 mb-2">Official Website</p>
                    <p className="text-[12px] font-black text-slate-950">WWW.MBTI-SAJU.COM</p>
                </div>
            </div>

            {/* Watermark */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-45 select-none pointer-events-none opacity-[0.03] text-9xl font-black whitespace-nowrap">
                MBTIJU SOUL REPORT
            </div>
        </div >
    );
});

export const DetailedReportCardComponent = DetailedReportCard;

