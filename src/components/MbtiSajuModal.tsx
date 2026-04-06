import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Loader2, Sparkles, Brain, ScrollText, Zap, Share2, Download, Calendar, Layers, AlertTriangle, TrendingUp } from 'lucide-react';
import { SERVICE_COSTS } from '../config/creditConfig';
import ServiceNavigation, { ServiceType } from './ServiceNavigation';
import { stripMarkdown } from '../utils/textUtils';
import { experimental_useObject as useObject } from '@ai-sdk/react';
import { fullAnalysisSchema as analysisSchema } from '../config/schemas';
import { calculateSaju } from '../utils/sajuUtils';

interface MbtiSajuModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (service: ServiceType) => void;
  onUseCredit?: (isRegenerate?: boolean) => Promise<boolean>;
  credits?: number;
  session: any;
}

interface ElementColor {
  bg: string;
  text: string;
  bar: string;
}

const ELEMENT_COLORS: Record<string, ElementColor> = {
  '목(木)': { bg: 'bg-green-50', text: 'text-green-700', bar: 'bg-green-500' },
  '화(火)': { bg: 'bg-red-50', text: 'text-red-700', bar: 'bg-red-500' },
  '토(土)': { bg: 'bg-amber-50', text: 'text-amber-700', bar: 'bg-amber-500' },
  '금(金)': { bg: 'bg-slate-100', text: 'text-slate-700', bar: 'bg-slate-500' },
  '수(水)': { bg: 'bg-blue-50', text: 'text-blue-700', bar: 'bg-blue-500' },
};

const DEFAULT_COLOR: ElementColor = { bg: 'bg-slate-50', text: 'text-slate-700', bar: 'bg-slate-400' };

const getElementColor = (element: string): ElementColor => {
  for (const key in ELEMENT_COLORS) {
    if (element.includes(key.slice(0, 1))) return ELEMENT_COLORS[key] as ElementColor;
  }
  return DEFAULT_COLOR;
};

const MbtiSajuModal: React.FC<MbtiSajuModalProps> = ({ isOpen, onClose, onNavigate, onUseCredit, credits, session: initialSession }) => {
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const reportRef = React.useRef<HTMLDivElement>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isPurchasingDeep, setIsPurchasingDeep] = useState(false);

  // Streaming Hook
  const { object: fullObj, submit: submitFull, isLoading: isAnalysisLoading } = useObject({
    api: '/api/analyze_full',
    schema: analysisSchema,
    headers: { 'Authorization': `Bearer ${initialSession?.access_token || ''}` },
  });

  // Sync partial results
  useEffect(() => {
    if (fullObj) {
      setAnalysis((prev: any) => ({
        ...(prev || {}),
        ...fullObj,
        full_name: initialSession?.user?.user_metadata?.full_name || prev?.full_name,
        mbti: initialSession?.user?.user_metadata?.mbti || prev?.mbti,
        birth_date: initialSession?.user?.user_metadata?.birth_date || prev?.birth_date,
      }));
    }
  }, [fullObj, initialSession]);

  // Loading state consolidation
  useEffect(() => {
    if (isAnalysisLoading) {
      setLoading(true);
    } else if (fullObj) {
      setLoading(false);
      const finalizeSave = async () => {
        await supabase.auth.updateUser({
          data: { ...initialSession?.user?.user_metadata, analysis: fullObj }
        });
      };
      finalizeSave();
    }
  }, [isAnalysisLoading, fullObj, initialSession]);

  const loadAnalysis = React.useCallback(async () => {
    setLoading(true);
    const timeoutId = setTimeout(() => setLoading(false), 5000);
    try {
      let currentSession = initialSession;
      if (!currentSession) {
        const { data: { session: fetchedSession } } = await supabase.auth.getSession();
        currentSession = fetchedSession;
      }
      if (currentSession?.user?.user_metadata?.analysis) {
        const metadata = currentSession.user.user_metadata;
        setAnalysis({
          ...metadata.analysis,
          birth_date: metadata.birth_date,
          full_name: metadata.full_name,
          mbti: metadata.mbti,
          gender: metadata.gender
        });
      }
    } catch (err) {
      console.error('MbtiSajuModal loadAnalysis error:', err);
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  }, [initialSession]);

  useEffect(() => {
    if (isOpen) loadAnalysis();
  }, [isOpen, loadAnalysis]);

  // ESC 키로 닫기
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
    }
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const handleShare = async () => {
    setIsSharing(true);
    try {
      const shareText = `${analysis?.full_name || ''}님의 MBTI(${analysis?.mbti}) × 사주 융합 별명은 "${analysis?.fusionNickname || ''}"입니다! 🔮\n\n나도 내 운명 분석 받아보기 👉 ${window.location.origin}`;
      if (navigator.share) {
        await navigator.share({ title: '나의 운명 별명', text: shareText, url: window.location.origin });
      } else {
        await navigator.clipboard.writeText(shareText);
        alert('공유 내용이 클립보드에 복사되었습니다!');
      }
    } catch (error: any) {
      if (error?.name !== 'AbortError') console.error("Sharing failed:", error);
    } finally {
      setIsSharing(false);
    }
  };

  const handleDownloadReport = async () => {
    if (!reportRef.current || !analysis) return;
    setIsDownloading(true);
    try {
      const { generatePDF } = await import('../utils/pdfGenerator');
      await generatePDF(reportRef.current, `MBTIJU-Soul-Report-${analysis.full_name}`);
    } catch (error) {
      console.error("Download failed", error);
      alert("리포트 저장 중 오류가 발생했습니다.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleStartDeepAnalysis = async () => {
    const cost = SERVICE_COSTS.MBTI_SAJU;
    if (credits !== undefined && credits < cost) {
      onNavigate('creditPurchase' as any);
      onClose();
      return;
    }
    setIsPurchasingDeep(true);
    try {
      const { data: { session: fetchedSession } } = await supabase.auth.getSession();
      const activeSession = fetchedSession || initialSession;
      
      const metadata = activeSession?.user?.user_metadata;
      if (!metadata) throw new Error("로그인이 필요합니다.");
      const sajuData = calculateSaju(metadata.birth_date, metadata.birth_time);
      const payload = {
        name: metadata.full_name,
        gender: metadata.gender,
        birthDate: metadata.birth_date,
        birthTime: metadata.birth_time,
        mbti: metadata.mbti,
        sajuData,
      };
      setAnalysis(null);
      submitFull(payload);
      if (onUseCredit) await onUseCredit(false);
    } catch (error: any) {
      console.error("Deep Analysis Error:", error);
      alert(error.message || "심층 분석 중 오류가 발생했습니다.");
    } finally {
      setIsPurchasingDeep(false);
    }
  };

  const handleRegenerate = async () => {
    if (!window.confirm("기존 결과는 보존되지 않으며, 크레딧이 10회 차감됩니다. 계속하시겠습니까?")) return;
    const cost = SERVICE_COSTS.REGENERATE_MBTI_SAJU;
    if (credits !== undefined && credits < cost) {
      onNavigate('creditPurchase' as any);
      onClose();
      return;
    }
    setIsRegenerating(true);
    try {
      const { data: { session: fetchedSession } } = await supabase.auth.getSession();
      const activeSession = fetchedSession || initialSession;
      
      const metadata = activeSession?.user?.user_metadata;
      const sajuData = calculateSaju(metadata.birth_date, metadata.birth_time);
      const payload = {
        name: metadata.full_name,
        gender: metadata.gender,
        birthDate: metadata.birth_date,
        birthTime: metadata.birth_time,
        mbti: metadata.mbti,
        sajuData,
      };
      setAnalysis(null);
      submitFull(payload);
      if (onUseCredit) await onUseCredit(true);
    } catch (error: any) {
      console.error("Regenerate Error:", error);
    } finally {
      setIsRegenerating(false);
    }
  };

  if (!isOpen) return null;

  const renderSoulReport = () => {
    if (!analysis) return null;
    const hasDeepData = !!(analysis.deepIntegration || analysis.yearlyFortune || analysis.fieldStrategies);

    if (!hasDeepData) {
      return (
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center animate-fade-up">
          <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
            <Zap className="w-10 h-10 text-indigo-600 animate-pulse" />
          </div>
          <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">심층 융합 분석이 필요합니다</h3>
          <p className="text-slate-500 mb-8 max-w-sm leading-relaxed text-sm">기본 성향 분석 외에 MBTI와 사주를 결합한 상세 융합 진단, 2026년 운세 흐름, 분야별 전략은 유료 서비스입니다.</p>
          <div className="bg-slate-50 rounded-2xl p-6 mb-8 w-full max-w-sm border border-slate-100 shadow-inner">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-bold text-slate-600">서비스 비용</span>
              <span className="text-lg font-black text-indigo-600">{SERVICE_COSTS.MBTI_SAJU} 크레딧</span>
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              <span>보유 크레딧</span>
              <span>{credits || 0} 크레딧</span>
            </div>
          </div>
          <button onClick={handleStartDeepAnalysis} disabled={isPurchasingDeep} className="w-full max-w-xs py-4 bg-indigo-600 text-white rounded-full font-black shadow-xl flex items-center justify-center gap-2">
            {isPurchasingDeep ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            심층 분석 시작하기
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-6 animate-fade-up">
        {/* 헤더: 운명 별명 */}
        {analysis.fusionNickname && (
          <div className="text-center mb-6 py-8 bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl relative overflow-hidden">
            <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'radial-gradient(circle at 30% 50%, #6366f1 0%, transparent 60%), radial-gradient(circle at 70% 50%, #8b5cf6 0%, transparent 60%)'}} />
            <div className="relative z-10">
              <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-2">MBTI × 사주 융합 별명</p>
              <h3 className="text-2xl sm:text-3xl font-black text-white mb-3">✨ {stripMarkdown(analysis.fusionNickname)} ✨</h3>
              <p className="text-xs text-indigo-300">{analysis.mbti} × 사주 명리학 교차 분석</p>
            </div>
          </div>
        )}

        {analysis.reportTitle && (
          <div className="text-center mb-6 py-4 border-y border-slate-100 italic">
            <h3 className="text-xl font-bold text-slate-800">"{stripMarkdown(analysis.reportTitle)}"</h3>
          </div>
        )}

        <div className="space-y-10">
          {/* [1순위] 심층 융합 진단 - MBTI×사주 교차 분석의 핵심 */}
          {analysis.deepIntegration?.integrationPoints && (
            <section className="report-section">
              <h4 className="report-section-title"><Zap className="w-5 h-5 text-indigo-600" /> MBTI × 사주 심층 융합 진단</h4>
              <p className="text-xs text-slate-400 font-bold mb-4 pl-1">두 시스템의 교차점에서 발견된 핵심 통찰입니다.</p>
              <div className="space-y-4">
                {analysis.deepIntegration.integrationPoints.map((p: any, i: number) => (
                  <div key={i} className="report-card border-l-4 border-indigo-500 !pl-5">
                    <div className="flex items-start gap-2 mb-3">
                      <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                      <h5 className="font-black text-slate-900 text-sm leading-snug">{stripMarkdown(p.subtitle)}</h5>
                    </div>
                    <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line pl-8">{stripMarkdown(p.content)}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* [2순위] 사주 본성 분석 (MBTI와의 연결 포함) */}
          {analysis.nature && (
            <section className="report-section">
              <h4 className="report-section-title"><ScrollText className="w-5 h-5" /> 선천적 기질 — 사주가 말하는 본성</h4>
              <div className="report-card">
                <p className="text-slate-950 font-bold mb-4 text-sm leading-relaxed">{stripMarkdown(analysis.nature.dayPillarSummary)}</p>
                <div className="space-y-3 text-slate-600 text-sm leading-relaxed">
                  {analysis.nature.dayMasterAnalysis && (
                    <div className="flex gap-2">
                      <span className="text-indigo-500 font-black shrink-0">일간</span>
                      <p>{stripMarkdown(analysis.nature.dayMasterAnalysis)}</p>
                    </div>
                  )}
                  {analysis.nature.dayBranchAnalysis && (
                    <div className="flex gap-2">
                      <span className="text-indigo-500 font-black shrink-0">일지</span>
                      <p>{stripMarkdown(analysis.nature.dayBranchAnalysis)}</p>
                    </div>
                  )}
                  {analysis.nature.monthBranchAnalysis && (
                    <div className="flex gap-2">
                      <span className="text-indigo-500 font-black shrink-0">월지</span>
                      <p>{stripMarkdown(analysis.nature.monthBranchAnalysis)}</p>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* [3순위] 오행 에너지 구성 */}
          {analysis.fiveElements?.elements && (
            <section className="report-section">
              <h4 className="report-section-title"><Layers className="w-5 h-5" /> 오행 에너지 구성</h4>
              <div className="space-y-3">
                {analysis.fiveElements.elements.map((el: any, idx: number) => {
                  const color = getElementColor(el.element);
                  const maxCount = Math.max(...analysis.fiveElements.elements.map((e: any) => e.count), 1);
                  const pct = Math.round((el.count / maxCount) * 100);
                  return (
                    <div key={idx} className={`report-card !p-4 ${color.bg}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`font-black text-sm ${color.text}`}>{el.element}</span>
                        <span className={`text-lg font-black ${color.text}`}>{el.count}</span>
                      </div>
                      <div className="w-full bg-white/60 rounded-full h-2 mb-2">
                        <div className={`${color.bar} h-2 rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{stripMarkdown(el.interpretation)}</p>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* [4순위] MBTI 심층 분석 (사주와 교차) */}
          {analysis.persona && (
            <section className="report-section">
              <h4 className="report-section-title"><Brain className="w-5 h-5" /> {analysis.mbti} 심층 분석 — 사주와의 상호작용</h4>
              <div className="report-card bg-slate-950 text-white">
                <h5 className="font-black text-white mb-4 text-lg">{stripMarkdown(analysis.persona.mbtiNickname)}</h5>
                <div className="space-y-4 text-slate-300 text-sm">
                  <div>
                    <strong className="block mb-1 text-indigo-300 text-xs uppercase tracking-widest">주기능 — 핵심 에너지</strong>
                    <p className="leading-relaxed">{stripMarkdown(analysis.persona.dominantFunction)}</p>
                  </div>
                  <div>
                    <strong className="block mb-1 text-indigo-300 text-xs uppercase tracking-widest">부기능 — 사회적 상호작용</strong>
                    <p className="leading-relaxed">{stripMarkdown(analysis.persona.auxiliaryFunction)}</p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* [5순위] 운세 흐름 */}
          {analysis.yearlyFortune && (
            <section className="report-section">
              <h4 className="report-section-title"><Calendar className="w-5 h-5" /> 2026년 운세 흐름</h4>
              <div className="report-card bg-gradient-to-br from-indigo-900 to-slate-900 text-white">
                <h5 className="text-xl font-black mb-4 italic text-indigo-100">"{stripMarkdown(analysis.yearlyFortune.theme)}"</h5>
                <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">{stripMarkdown(analysis.yearlyFortune.overview)}</p>
                {analysis.yearlyFortune.keywords && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {analysis.yearlyFortune.keywords.filter((k: any): k is string => !!k).map((kw: string, i: number) => (
                      <span key={i} className="px-3 py-1 bg-white/10 text-indigo-200 rounded-full text-xs font-bold border border-white/20">#{kw}</span>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* 월별 운세 */}
          {analysis.monthlyFortune?.months && analysis.monthlyFortune.months.length > 0 && (
            <section className="report-section">
              <h4 className="report-section-title"><TrendingUp className="w-5 h-5" /> 월별 에너지 가이드</h4>
              <div className="grid gap-3">
                {analysis.monthlyFortune.months.map((m: any, i: number) => (
                  <div key={i} className="report-card !p-4 flex gap-4 items-start">
                    <div className="shrink-0 w-12 text-center">
                      <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg block">{m.period}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-500 mb-1">{stripMarkdown(m.energy)}</p>
                      <p className="text-sm text-slate-700 leading-relaxed">{stripMarkdown(m.guide)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* [6순위] 분야별 심층 전략 */}
          {analysis.fieldStrategies && (
            <section className="report-section">
              <h4 className="report-section-title"><Zap className="w-5 h-5" /> MBTI × 사주 분야별 전략</h4>
              <div className="space-y-4">
                {(['career', 'love', 'wealth'] as const).map((field) => {
                  const data = (analysis.fieldStrategies as any)[field];
                  if (!data) return null;
                  const fieldConfig = {
                    career: { icon: '💼', label: '커리어·직업', color: 'border-blue-400' },
                    love: { icon: '💖', label: '연애·관계', color: 'border-rose-400' },
                    wealth: { icon: '💰', label: '재물·투자', color: 'border-amber-400' },
                  };
                  const cfg = fieldConfig[field];
                  return (
                    <div key={field} className={`report-card border-l-4 ${cfg.color} !pl-5`}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xl">{cfg.icon}</span>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{cfg.label}</p>
                          <h5 className="font-black text-slate-950 text-sm">{stripMarkdown(data.subtitle)}</h5>
                        </div>
                      </div>
                      <p className="text-slate-700 text-sm mb-3 leading-relaxed">{stripMarkdown(data.analysis)}</p>
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">핵심 전략</p>
                        <p className="text-slate-800 text-xs font-bold leading-relaxed">{stripMarkdown(data.advice)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* [7순위] 경계 및 주의 패턴 */}
          {analysis.warnings && (
            <section className="report-section">
              <h4 className="report-section-title"><AlertTriangle className="w-5 h-5 text-amber-500" /> 주의 패턴 — MBTI 그림자 × 사주 충·형</h4>
              <div className="space-y-3">
                {analysis.warnings.watchOut?.map((w: any, i: number) => (
                  <div key={i} className="report-card bg-amber-50 border-amber-100 !p-4">
                    <h5 className="font-black text-amber-800 text-sm mb-1">⚠ {stripMarkdown(w.title)}</h5>
                    <p className="text-amber-700 text-xs leading-relaxed">{stripMarkdown(w.description)}</p>
                  </div>
                ))}
                {analysis.warnings.avoid?.map((w: any, i: number) => (
                  <div key={i} className="report-card bg-red-50 border-red-100 !p-4">
                    <h5 className="font-black text-red-800 text-sm mb-1">🚫 {stripMarkdown(w.title)}</h5>
                    <p className="text-red-700 text-xs leading-relaxed">{stripMarkdown(w.description)}</p>
                  </div>
                ))}
              </div>
              {analysis.solution && (
                <div className="mt-4 report-card bg-emerald-50 border-emerald-100 !p-5">
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">종합 솔루션</p>
                  <p className="text-emerald-800 text-sm font-bold leading-relaxed">{stripMarkdown(analysis.solution)}</p>
                </div>
              )}
            </section>
          )}
        </div>

        <div className="mt-16 pt-10 border-t border-slate-100 flex flex-col items-center">
          <button onClick={handleDownloadReport} disabled={isDownloading} className="flex items-center gap-3 px-10 py-4 bg-slate-950 text-white rounded-full font-black shadow-2xl">
            {isDownloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            리포트 PDF 다운로드
          </button>
          <button onClick={handleRegenerate} disabled={isRegenerating} className="mt-4 text-slate-400 text-xs font-bold underline">
            {isRegenerating ? "진행 중..." : "정밀 데이터 재생성 (10크레딧)"}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl flex justify-center items-center z-[1000] p-4">
      <div className="relative w-full max-w-2xl bg-white rounded-[32px] max-h-[94vh] overflow-hidden flex flex-col">
        <ServiceNavigation currentService="mbti" onNavigate={onNavigate} onClose={onClose} />
        <div className="p-8 pb-4 shrink-0">
          <div className="flex justify-between items-end">
            <h3 className="text-3xl font-black text-slate-950 tracking-tighter">운명 리포트</h3>
            <button onClick={handleShare} disabled={isSharing} className="px-5 py-2.5 bg-slate-50 text-slate-950 rounded-full text-xs font-bold border border-slate-100 flex items-center gap-2">
              {isSharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
              공유하기
            </button>
          </div>
          <div className="h-[2px] w-full bg-slate-950 mt-6"></div>
        </div>
        <div className="px-8 pb-12 pt-4 overflow-y-auto grow custom-scrollbar">
          {loading ? (
            <div className="flex flex-col justify-center items-center h-64">
              <Loader2 className="w-10 h-10 text-slate-200 animate-spin mb-4" />
              <p className="text-slate-400 font-bold text-[10px] tracking-widest uppercase">분석 중...</p>
            </div>
          ) : analysis ? (
            <div ref={reportRef}>{renderSoulReport()}</div>
          ) : (
            <div className="text-center py-20">
              <p className="text-slate-950 font-black text-lg mb-8">리포트를 먼저 생성해주세요.</p>
              <button onClick={onClose} className="px-10 py-4 bg-slate-950 text-white rounded-full font-black">확인</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MbtiSajuModal;
