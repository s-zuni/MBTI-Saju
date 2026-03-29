import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Loader2, Sparkles, Brain, ScrollText, Zap, Share2, Download, Calendar, Layers } from 'lucide-react';
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
      if (window.confirm(`크레딧이 부족합니다. (심층 분석에는 ${cost}크레딧이 필요합니다. 충전하시겠습니까?)`)) {
        onNavigate('creditPurchase' as any);
        onClose();
      }
      return;
    }
    setIsPurchasingDeep(true);
    try {
      // Safari ITP 대응: Props로 받은 세션보다 getSession()으로 가져온 최신 세션을 우선시합니다.
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
      if (window.confirm(`크레딧이 부족합니다.`)) {
        onNavigate('creditPurchase' as any);
        onClose();
      }
      return;
    }
    setIsRegenerating(true);
    try {
      // Safari ITP 대응: 최신 세션 정보 확보
      const { data: { session: fetchedSession } } = await supabase.auth.getSession();
      const activeSession = fetchedSession || initialSession;
      
      const metadata = activeSession?.user?.user_metadata;
      const sajuData = calculateSaju(metadata.birth_date, metadata.birth_time);
      const payload = {
        name: metadata.full_name,
        gender: metadata.gender,
        birthDate: metadata.birth_date,
        birthTime: metadata.birth_date,
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
        {analysis.fusionNickname && (
          <div className="text-center mb-6 py-6 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl">
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">나의 운명 별명</p>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mb-3">✨ {stripMarkdown(analysis.fusionNickname)} ✨</h3>
            <p className="text-xs text-slate-500">{analysis.mbti} × 사주 융합</p>
          </div>
        )}

        {analysis.reportTitle && (
          <div className="text-center mb-10 py-4 border-y border-slate-100 italic">
            <h3 className="text-xl font-bold text-slate-800">"{stripMarkdown(analysis.reportTitle)}"</h3>
          </div>
        )}

        <div className="space-y-12">
          {analysis.nature && (
            <section className="report-section">
              <h4 className="report-section-title"><ScrollText className="w-5 h-5" /> 선천적 기질 및 본성</h4>
              <div className="report-card">
                <p className="text-slate-950 font-bold mb-4">{stripMarkdown(analysis.nature.dayPillarSummary)}</p>
                <div className="space-y-3 text-slate-600 text-sm leading-relaxed">
                  {analysis.nature.dayMasterAnalysis && <p>• 일간: {stripMarkdown(analysis.nature.dayMasterAnalysis)}</p>}
                  {analysis.nature.dayBranchAnalysis && <p>• 일지: {stripMarkdown(analysis.nature.dayBranchAnalysis)}</p>}
                  {analysis.nature.monthBranchAnalysis && <p>• 월지: {stripMarkdown(analysis.nature.monthBranchAnalysis)}</p>}
                </div>
              </div>
            </section>
          )}

          {analysis.fiveElements?.elements && (
            <section className="report-section">
              <h4 className="report-section-title"><Layers className="w-5 h-5" /> 오행 에너지 구성</h4>
              <div className="report-card !p-0 overflow-hidden text-sm">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-3 font-bold text-slate-700">오행</th>
                      <th className="px-4 py-3 text-center font-bold text-slate-700">지표</th>
                      <th className="px-4 py-3 font-bold text-slate-700">해석</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {analysis.fiveElements.elements.map((el: any, idx: number) => (
                      <tr key={idx}>
                        <td className="px-4 py-3 font-bold text-slate-900">{el.element}</td>
                        <td className="px-4 py-3 text-center font-black text-indigo-600">{el.count}</td>
                        <td className="px-4 py-3 text-xs leading-relaxed">{stripMarkdown(el.interpretation)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {analysis.deepIntegration?.integrationPoints && (
            <section className="report-section">
              <h4 className="report-section-title"><Zap className="w-5 h-5" /> 심층 융합 진단</h4>
              <div className="space-y-4">
                {analysis.deepIntegration.integrationPoints.map((p: any, i: number) => (
                  <div key={i} className="report-card">
                    <h5 className="font-bold text-slate-900 mb-2">{stripMarkdown(p.subtitle)}</h5>
                    <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">{stripMarkdown(p.content)}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {analysis.persona && (
            <section className="report-section">
              <h4 className="report-section-title"><Brain className="w-5 h-5" /> {analysis.mbti} 심층 분석</h4>
              <div className="report-card bg-slate-50">
                <h5 className="font-black text-slate-950 mb-4">{stripMarkdown(analysis.persona.mbtiNickname)}</h5>
                <div className="space-y-4 text-slate-700 text-sm">
                  <div><strong className="block mb-1">핵심 에너지 (주기능)</strong>{stripMarkdown(analysis.persona.dominantFunction)}</div>
                  <div><strong className="block mb-1">사회적 상호작용 (부기능)</strong>{stripMarkdown(analysis.persona.auxiliaryFunction)}</div>
                </div>
              </div>
            </section>
          )}

          {analysis.yearlyFortune && (
            <section className="report-section">
              <h4 className="report-section-title"><Calendar className="w-5 h-5" /> 운세 흐름 가이드</h4>
              <div className="report-card bg-slate-950 text-white">
                <h5 className="text-xl font-black mb-4 italic">"{stripMarkdown(analysis.yearlyFortune.theme)}"</h5>
                <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{stripMarkdown(analysis.yearlyFortune.overview)}</p>
              </div>
            </section>
          )}

          {analysis.fieldStrategies && (
            <section className="report-section">
              <h4 className="report-section-title"><Zap className="w-5 h-5" /> 2026년 분야별 심층 전략</h4>
              <div className="space-y-4">
                {['career', 'love', 'wealth'].map((field) => {
                  const data = (analysis.fieldStrategies as any)[field];
                  if (!data) return null;
                  const icons = { career: '💼', love: '💖', wealth: '💰' };
                  return (
                    <div key={field} className="report-card">
                      <h5 className="font-bold text-slate-950 mb-2">{(icons as any)[field]} {stripMarkdown(data.subtitle)}</h5>
                      <p className="text-slate-700 text-sm mb-2">{stripMarkdown(data.analysis)}</p>
                      <p className="text-indigo-600 text-xs font-bold">전략: {stripMarkdown(data.advice)}</p>
                    </div>
                  );
                })}
              </div>
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
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl flex justify-center items-center z-50 p-4">
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
