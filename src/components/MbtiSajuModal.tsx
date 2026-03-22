import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Loader2, Sparkles, Brain, ScrollText, Zap, Share2, Download, Calendar, Layers } from 'lucide-react';
import { SERVICE_COSTS, SERVICE_NAMES } from '../config/creditConfig';
import ServiceNavigation, { ServiceType } from './ServiceNavigation';

interface MbtiSajuModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (service: ServiceType) => void;
  onUseCredit?: (isRegenerate?: boolean) => Promise<boolean>;
  credits?: number;
  session: any; // Add session prop
}

const MbtiSajuModal: React.FC<MbtiSajuModalProps> = ({ isOpen, onClose, onNavigate, onUseCredit, credits, session: initialSession }) => {
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'soul'>('soul');
  const reportRef = React.useRef<HTMLDivElement>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isPurchasingDeep, setIsPurchasingDeep] = useState(false);

  const loadAnalysis = React.useCallback(async () => {
    setLoading(true);
    
    // Failsafe timeout for Safari
    const timeoutId = setTimeout(() => {
      setLoading(false);
    }, 5000);

    try {
      let currentSession = initialSession;
      if (!currentSession) {
        const { data: { session: fetchedSession } } = await supabase.auth.getSession();
        currentSession = fetchedSession;
      }

      if (currentSession?.user?.user_metadata) {
        const metadata = currentSession.user.user_metadata;
        if (metadata.analysis) {
          setAnalysis({
            ...metadata.analysis,
            birth_date: metadata.birth_date,
            full_name: metadata.full_name,
            mbti: metadata.mbti,
            gender: metadata.gender
          });
        }
      }
    } catch (err) {
      console.error('MbtiSajuModal loadAnalysis error:', err);
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  }, [initialSession]);

  useEffect(() => {
    if (isOpen) {
      loadAnalysis();
    }
  }, [isOpen, loadAnalysis]);

  const handleShare = async () => {
    setIsSharing(true);
    try {
      const nickname = analysis?.fusionNickname || '';
      const shareTitle = `나의 운명 별명: ${nickname}`;
      const shareText = `${analysis?.full_name || ''}님의 MBTI(${analysis?.mbti}) × 사주 융합 별명은 "${nickname}"입니다! 🔮\n\n나도 내 운명 분석 받아보기 👉`;
      const shareUrl = window.location.origin;

      // Web Share API 지원 시 SNS 공유
      if (navigator.share) {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
      } else {
        // 미지원 브라우저: 클립보드 복사 후 안내
        await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
        alert('공유 내용이 클립보드에 복사되었습니다! 원하는 곳에 붙여넣기 해주세요.');
      }
    } catch (error: any) {
      // AbortError는 사용자가 공유 취소한 경우
      if (error?.name !== 'AbortError') {
        console.error("Sharing failed:", error);
      }
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

  const handleRegenerate = async () => {
    if (!window.confirm("새로운 분석 결과를 생성하시겠습니까? 기존 결과는 보존되지 않으며, 크레딧이 10회 차감됩니다.")) return;

    setIsRegenerating(true);

    const cost = SERVICE_COSTS.REGENERATE_MBTI_SAJU;
    if (credits !== undefined && credits < cost) {
      setIsRegenerating(false);
      if (window.confirm(`크레딧이 부족합니다. (${SERVICE_NAMES.REGENERATE_MBTI_SAJU}에는 ${cost}크레딧이 필요합니다. 충전하시겠습니까?)`)) {
        onNavigate('creditPurchase' as any);
        onClose();
      }
      return;
    }

    try {
      let currentSession = initialSession;
      if (!currentSession) {
        const { data: { session: fetchedSession } } = await supabase.auth.getSession();
        currentSession = fetchedSession;
      }
      if (!currentSession) throw new Error("로그인이 필요합니다.");

      const metadata = currentSession.user.user_metadata;
      const requestPayload = {
        name: metadata.full_name,
        gender: metadata.gender,
        birthDate: metadata.birth_date,
        birthTime: metadata.birth_time,
        mbti: metadata.mbti,
      };

      const authHeader = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentSession.access_token}`,
      };

      // 1. Start core analysis (Nature, Persona, Integration)
      const corePromise = fetch('/api/analyze', {
        method: 'POST',
        headers: authHeader,
        body: JSON.stringify(requestPayload)
      }).then(async res => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          const msg = errData.error || errData.message || errData.koreanError || "핵심 분석 생성 실패";
          throw new Error(msg);
        }
        return res.json();
      });

      // 2. Start fortune analysis (Yearly, Monthly)
      const fortunePromise = fetch('/api/analyze_fortune', {
        method: 'POST',
        headers: authHeader,
        body: JSON.stringify(requestPayload)
      }).then(async res => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          const msg = errData.error || errData.message || errData.koreanError || "운세 분석 생성 실패";
          throw new Error(msg);
        }
        return res.json();
      });

      // 3. Start strategy analysis (Warnings, Career/Love, Solution)
      const strategyPromise = fetch('/api/analyze_strategy', {
        method: 'POST',
        headers: authHeader,
        body: JSON.stringify(requestPayload)
      }).then(async res => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          const msg = errData.error || errData.message || errData.koreanError || "전략 분석 생성 실패";
          throw new Error(msg);
        }
        return res.json();
      });

      // Update UI incrementally
      const coreData = await corePromise;
      setAnalysis({
        ...coreData,
        birth_date: metadata.birth_date,
        full_name: metadata.full_name,
        mbti: metadata.mbti
      });

      // Wait for others and update
      const [fortuneData, strategyData] = await Promise.all([fortunePromise, strategyPromise]);
      const mergedAnalysis = { ...coreData, ...fortuneData, ...strategyData };

      setAnalysis({
        ...mergedAnalysis,
        birth_date: metadata.birth_date,
        full_name: metadata.full_name,
        mbti: metadata.mbti
      });
      
      // Deduct credit only after all analyses (core, fortune, strategy) are successful
      if (onUseCredit) {
        const creditSuccess = await onUseCredit(true);
        if (!creditSuccess) {
          console.error("Credit deduction failed after regeneration");
        }
      }

      // Final Save to Supabase
      await supabase.auth.updateUser({
        data: { ...metadata, analysis: mergedAnalysis }
      });

    } catch (error: any) {
      console.error("Regenerate Error:", error);
      const errorDetail = error.message || "알 수 없는 오류가 발생했습니다.";
      alert(`오류가 발생했습니다: ${errorDetail}`);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleStartDeepAnalysis = async () => {
    const cost = SERVICE_COSTS.MBTI_SAJU; // 20 credits
    
    if (credits !== undefined && credits < cost) {
      if (window.confirm(`크레딧이 부족합니다. (심층 분석에는 ${cost}크레딧이 필요합니다. 충전하시겠습니까?)`)) {
        onNavigate('creditPurchase' as any);
        onClose();
      }
      return;
    }

    setIsPurchasingDeep(true);

    try {
        let currentSession = initialSession;
        if (!currentSession) {
            const { data: { session: fetchedSession } } = await supabase.auth.getSession();
            currentSession = fetchedSession;
        }
        if (!currentSession) throw new Error("로그인이 필요합니다.");

        const metadata = currentSession.user.user_metadata;
        const requestPayload = {
            name: metadata.full_name,
            gender: metadata.gender,
            birthDate: metadata.birth_date,
            birthTime: metadata.birth_time,
            mbti: metadata.mbti,
        };

        const authHeader = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentSession.access_token}`,
        };

        // Fetch everything (Core, Fortune, Strategy)
        const [coreRes, fortuneRes, strategyRes] = await Promise.all([
            fetch('/api/analyze', { method: 'POST', headers: authHeader, body: JSON.stringify(requestPayload) }),
            fetch('/api/analyze_fortune', { method: 'POST', headers: authHeader, body: JSON.stringify(requestPayload) }),
            fetch('/api/analyze_strategy', { method: 'POST', headers: authHeader, body: JSON.stringify(requestPayload) })
        ]);

        if (!coreRes.ok) throw new Error("분석 생성 중 오류가 발생했습니다.");
        
        const coreData = await coreRes.json();
        const fortuneData = fortuneRes.ok ? await fortuneRes.json() : {};
        const strategyData = strategyRes.ok ? await strategyRes.json() : {};
        
        const mergedAnalysis = { ...coreData, ...fortuneData, ...strategyData };
        
        // Deduct credits
        if (onUseCredit) {
            const success = await onUseCredit('MBTI_SAJU' as any);
            if (!success) throw new Error("크레딧 차감에 실패했습니다.");
        }

        // Save to Supabase
        await supabase.auth.updateUser({
            data: { ...metadata, analysis: mergedAnalysis }
        });

        setAnalysis({
            ...mergedAnalysis,
            birth_date: metadata.birth_date,
            full_name: metadata.full_name,
            mbti: metadata.mbti
        });

    } catch (error: any) {
        console.error("Deep Analysis Error:", error);
        alert(error.message || "심층 분석 중 오류가 발생했습니다.");
    } finally {
        setIsPurchasingDeep(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Render Soul Report Section
  const renderSoulReport = () => {
    if (!analysis) return null;

    // Check if deep analysis content exists
    const hasDeepData = !!(analysis.deepIntegration || analysis.yearlyFortune || analysis.fieldStrategies);

    if (!hasDeepData) {
      return (
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center animate-fade-up">
          <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
            <Zap className="w-10 h-10 text-indigo-600 animate-pulse" />
          </div>
          <h3 className="text-2xl font-black text-slate-900 mb-2">심층 융합 분석이 필요합니다</h3>
          <p className="text-slate-500 mb-8 max-w-sm leading-relaxed">
            기본 성향 분석 외에 MBTI와 사주를 결합한 상세 융합 진단, 2026년 운세 흐름, 분야별 전략은 유료 서비스입니다.
          </p>
          
          <div className="bg-slate-50 rounded-2xl p-6 mb-8 w-full max-w-sm border border-slate-100">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-bold text-slate-600">서비스 비용</span>
              <span className="text-lg font-black text-indigo-600">{SERVICE_COSTS.MBTI_SAJU} 크레딧</span>
            </div>
            <div className="flex justify-between items-center text-xs text-slate-400">
              <span>보유 크레딧</span>
              <span>{credits || 0} 크레딧</span>
            </div>
          </div>

          <button
            onClick={handleStartDeepAnalysis}
            disabled={isPurchasingDeep}
            className="w-full max-w-sm py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full font-black shadow-xl hover:shadow-indigo-200 transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-2"
          >
            {isPurchasingDeep ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            심층 분석 시작하기
          </button>
          
          <p className="mt-4 text-[10px] text-slate-400">결제 시 즉시 분석이 시작되며 리포트가 완성됩니다.</p>
        </div>
      );
    }

    return (
      <div className="space-y-6 animate-fade-up">
        {/* Fusion Nickname Badge */}
        {analysis.fusionNickname && (
          <div className="text-center mb-6 py-6 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-2xl border border-indigo-100">
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-2">나의 운명 별명</p>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mb-3">
              ✨ {analysis.fusionNickname} ✨
            </h3>
            <p className="text-xs text-slate-500 mb-4">{analysis.mbti} × {analysis.saju?.dayMaster?.korean || '사주'} 융합</p>
            <button
              onClick={handleShare}
              disabled={isSharing}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full text-xs font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all active:scale-95"
            >
              {isSharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
              별명 공유하기
            </button>
          </div>
        )}

        {/* Report Title */}
        {analysis.reportTitle && (
          <div className="text-center mb-10 py-4 border-y border-slate-100 italic">
            <h3 className="text-xl font-bold text-slate-800">
              "{analysis.reportTitle}"
            </h3>
          </div>
        )}

        {/* Sections in Minimalist Style */}
        <div className="space-y-12">
          {/* 1. 본성 */}
          {(analysis.nature || analysis.sajuReading) && (
            <section className="report-section">
              <h4 className="report-section-title">
                <ScrollText className="w-5 h-5" /> 선천적 기질 및 본성
              </h4>
              <div className="report-card">
                <p className="text-slate-900 font-bold mb-4 text-md">
                  {analysis.nature?.dayPillarSummary ? `"${analysis.nature.dayPillarSummary}"` : "사주 원국 분석"}
                </p>
                <div className="space-y-3 text-slate-600 text-sm leading-relaxed">
                  {analysis.nature?.dayMasterAnalysis && <p className="whitespace-pre-wrap">• 일간: {analysis.nature.dayMasterAnalysis}</p>}
                  {analysis.nature?.dayBranchAnalysis && <p className="whitespace-pre-wrap">• 일지: {analysis.nature.dayBranchAnalysis}</p>}
                  {analysis.nature?.monthBranchAnalysis && <p className="whitespace-pre-wrap">• 월지: {analysis.nature.monthBranchAnalysis}</p>}
                  {!analysis.nature && analysis.sajuReading && <p className="whitespace-pre-line">{analysis.sajuReading}</p>}
                </div>
              </div>
            </section>
          )}

          {/* 2. 오행 구성 */}
          {analysis.fiveElements?.elements && (
            <section className="report-section">
              <h4 className="report-section-title">
                <Layers className="w-5 h-5" /> 오행 에너지 구성
              </h4>
              <div className="report-card !p-0 overflow-hidden text-sm">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-3 sm:px-4 py-3 font-bold text-slate-700">오행</th>
                      <th className="px-2 sm:px-4 py-3 text-center font-bold text-slate-700">지표</th>
                      <th className="px-3 sm:px-4 py-3 font-bold text-slate-700">해석</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-slate-600">
                    {analysis.fiveElements.elements.map((el: any, idx: number) => {
                      // 실제 사주 데이터에서 오행 수치 가져오기
                      const getElementCount = (name: string) => {
                        if (!analysis.saju?.elements) return el.count;
                        const mapping: Record<string, keyof typeof analysis.saju.elements> = {
                          '목(木)': 'wood', '화(火)': 'fire', '토(土)': 'earth', '금(金)': 'metal', '수(수)': 'water'
                        };
                        const key = mapping[el.element];
                        return key ? analysis.saju.elements[key] : el.count;
                      };

                      return (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-3 sm:px-4 py-3 font-bold text-slate-900 whitespace-nowrap">{el.element}</td>
                          <td className="px-2 sm:px-4 py-3 text-center font-black text-indigo-600">{getElementCount(el.element)}</td>
                          <td className="px-3 sm:px-4 py-3 text-[11px] sm:text-sm leading-relaxed">{el.interpretation}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* 심층 연동 */}
          {analysis.deepIntegration && (
            <section className="report-section">
              <h4 className="report-section-title">
                <Zap className="w-5 h-5" /> 심층 융합 진단
              </h4>
              <div className="space-y-4">
                {analysis.deepIntegration.integrationPoints?.map((p: any, i: number) => (
                  <div key={i} className="report-card">
                    <h5 className="font-bold text-slate-900 mb-2">{p.subtitle}</h5>
                    <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">{p.content}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 3. MBTI 심층 분석 (Persona) - 통합됨 */}
          {analysis.persona && (
            <section className="report-section">
              <h4 className="report-section-title">
                <Brain className="w-5 h-5" /> {analysis.mbti} 심층 분석
              </h4>
              <div className="report-card bg-slate-50 border-slate-200">
                <h5 className="font-black text-slate-900 mb-4 text-lg">
                  {analysis.persona.mbtiNickname || analysis.mbti}
                </h5>
                <div className="space-y-6 text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                  <div>
                    <strong className="text-slate-900 block mb-1">핵심 에너지 (주기능)</strong>
                    {analysis.persona.dominantFunction}
                  </div>
                  <div>
                    <strong className="text-slate-900 block mb-1">사회적 상호작용 (부기능)</strong>
                    {analysis.persona.auxiliaryFunction}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* 운세 흐름 */}
          {(analysis.yearlyFortune || analysis.fortune2026) && (
            <section className="report-section">
              <h4 className="report-section-title">
                <Calendar className="w-5 h-5" /> 운세 흐름 가이드
              </h4>
              <div className="report-card bg-slate-900 text-white border-none p-6 sm:p-10">
                <p className="text-indigo-400 font-bold mb-2 uppercase tracking-widest text-[10px]">Annual Theme</p>
                <h5 className="text-xl sm:text-2xl font-black mb-6 italic leading-tight">
                  {analysis.yearlyFortune?.theme ? `"${analysis.yearlyFortune.theme}"` : "2026년 대운세 흐름"}
                </h5>
                <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                  {analysis.yearlyFortune?.overview || analysis.fortune2026}
                </p>
              </div>
            </section>
          )}
          {/* 주의사항 및 피해야 할 것 (Warnings & Avoid) */}
          {(analysis.warnings?.watchOut?.length > 0 || analysis.warnings?.avoid?.length > 0) && (
            <section className="report-section">
              <h4 className="report-section-title">
                <Zap className="w-5 h-5 text-red-500" /> 2026년 주의사항 및 금기
              </h4>
              <div className="space-y-4">
                {analysis.warnings.watchOut && analysis.warnings.watchOut.map((w: any, i: number) => (
                  <div key={`watch-${i}`} className="report-card border-l-4 border-l-red-500">
                    <h5 className="font-bold text-slate-900 mb-2">🚨 {w.title}</h5>
                    <p className="text-slate-600 text-sm leading-relaxed">{w.description}</p>
                  </div>
                ))}
                {analysis.warnings.avoid && analysis.warnings.avoid.map((a: any, i: number) => (
                  <div key={`avoid-${i}`} className="report-card border-l-4 border-l-slate-800">
                    <h5 className="font-bold text-slate-900 mb-2">🛑 {a.title}</h5>
                    <p className="text-slate-600 text-sm leading-relaxed">{a.description}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 분야별 전략 (Career, Love, Wealth) */}
          {analysis.fieldStrategies && (
            <section className="report-section">
              <h4 className="report-section-title">
                <Brain className="w-5 h-5" /> 2026년 분야별 심층 전략
              </h4>
              <div className="space-y-4">
                {/* 직업운 */}
                {analysis.fieldStrategies.career && (
                  <div className="report-card bg-teal-50/50 border-none">
                    <h5 className="font-bold text-teal-900 mb-2 bg-teal-100/50 inline-block px-3 py-1 rounded-md text-xs">💼 {analysis.fieldStrategies.career.subtitle}</h5>
                    <p className="text-slate-700 text-sm leading-relaxed font-medium mb-2 whitespace-pre-wrap">{analysis.fieldStrategies.career.analysis}</p>
                    <p className="text-teal-700 text-sm leading-relaxed"><strong>Advice:</strong> {analysis.fieldStrategies.career.advice}</p>
                  </div>
                )}
                {/* 연애운 */}
                {analysis.fieldStrategies.love && (
                  <div className="report-card bg-pink-50/50 border-none">
                    <h5 className="font-bold text-pink-900 mb-2 bg-pink-100/50 inline-block px-3 py-1 rounded-md text-xs">💖 {analysis.fieldStrategies.love.subtitle}</h5>
                    <p className="text-slate-700 text-sm leading-relaxed font-medium mb-2 whitespace-pre-wrap">{analysis.fieldStrategies.love.analysis}</p>
                    <p className="text-pink-700 text-sm leading-relaxed"><strong>Advice:</strong> {analysis.fieldStrategies.love.advice}</p>
                  </div>
                )}
                {/* 재물운 */}
                {analysis.fieldStrategies.wealth && (
                  <div className="report-card bg-amber-50/50 border-none">
                    <h5 className="font-bold text-amber-900 mb-2 bg-amber-100/50 inline-block px-3 py-1 rounded-md text-xs">💰 {analysis.fieldStrategies.wealth.subtitle}</h5>
                    <p className="text-slate-700 text-sm leading-relaxed font-medium mb-2 whitespace-pre-wrap">{analysis.fieldStrategies.wealth.analysis}</p>
                    <p className="text-amber-700 text-sm leading-relaxed"><strong>Advice:</strong> {analysis.fieldStrategies.wealth.advice}</p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* 월별 운세 (Monthly) */}
          {analysis.monthlyFortune?.months?.length > 0 && (
            <section className="report-section">
              <h4 className="report-section-title">
                <Calendar className="w-5 h-5" /> 2026년 월별 상세 흐름
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {analysis.monthlyFortune.months.map((m: any, i: number) => (
                  <div key={i} className="report-card !p-4">
                    <h5 className="font-bold text-indigo-600 mb-1">{m.period}</h5>
                    <p className="text-xs font-bold text-slate-500 mb-2">{m.energy}</p>
                    <p className="text-slate-700 text-sm leading-relaxed">{m.guide}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Action Buttons: Minimalist & Professional */}
        <div className="mt-16 pt-10 border-t border-slate-100 flex flex-col items-center">
          <button
            onClick={handleDownloadReport}
            disabled={isDownloading}
            className="group relative flex items-center justify-center gap-3 px-10 py-4 bg-slate-950 text-white rounded-full text-md font-black shadow-2xl transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
          >
            {isDownloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />}
            전문 분석 PDF 리포트 다운로드
            <div className="absolute inset-x-0 h-px bottom-3 mx-10 bg-indigo-500/30"></div>
          </button>

          <p className="mt-8 text-xs text-slate-400 font-medium">실시간 심층 데이터 분석을 기반으로 생성되었습니다.</p>
          <button
            onClick={handleRegenerate}
            disabled={isRegenerating}
            className="mt-4 text-slate-400 text-xs font-bold hover:text-indigo-600 transition-colors underline underline-offset-4"
          >
            {isRegenerating ? "재분석 진행 중..." : "정밀 데이터 재생성 (10크레딧)"}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl overflow-y-auto h-full w-full flex justify-center items-center z-50 animate-fade-in p-4 sm:p-6">
      <div className="relative p-0 border-none w-full max-w-2xl shadow-[0_32px_128px_-12px_rgba(0,0,0,0.8)] rounded-[32px] sm:rounded-[48px] bg-white max-h-[94vh] overflow-hidden flex flex-col border border-white/10">
        {/* Navigation */}
        <ServiceNavigation currentService="mbti" onNavigate={onNavigate} onClose={onClose} />

        {/* Professional Header: Luxury White Concept */}
        <div className="bg-white px-6 sm:px-12 pt-10 pb-4 shrink-0">
          <div className="flex justify-between items-end">
            <div>
              <div className="flex items-center gap-2 text-indigo-600 font-black tracking-[0.2em] text-[10px] uppercase mb-1.5">
                <Sparkles className="w-4 h-4" /> Comprehensive Analysis
              </div>
              <h3 className="text-2xl sm:text-4xl font-black text-slate-950 tracking-tighter leading-none">
                운명 리포트
              </h3>
            </div>
            <div className="flex items-center gap-3 pb-1">
              {analysis && (
                <button
                  onClick={handleShare}
                  disabled={isSharing}
                  className="flex items-center gap-2 px-5 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-950 rounded-full transition-all text-xs font-bold border border-slate-100 shadow-sm"
                >
                  {isSharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                  공유하기
                </button>
              )}
            </div>
          </div>
          <div className="h-[2px] w-full bg-slate-950 mt-8"></div>

          <div className="mt-6 flex flex-wrap gap-2 justify-start">
            {analysis?.keywords && (
              <span className="px-3 py-1.5 bg-slate-50 text-slate-500 rounded-lg text-[11px] font-bold border border-slate-100 uppercase tracking-wider">
                #{typeof analysis.keywords === 'string' ? analysis.keywords.trim() : Array.isArray(analysis.keywords) ? analysis.keywords.join(', ').trim() : ''}
              </span>
            )}
          </div>
        </div>

        {/* Tabs: Ultra Minimal Line Style - Single Tab Only */}
        <div className="px-6 sm:px-12 mt-4 shrink-0">
          <div className="flex gap-10 border-b border-slate-100">
            <button
              onClick={() => setActiveTab('soul')}
              className={`pb-4 text-[11px] font-black tracking-[0.15em] uppercase transition-all relative text-slate-950`}
            >
              종합 분석 리포트
              <div className="absolute bottom-0 left-0 w-full h-[3px] bg-slate-950 animate-fade-in"></div>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="px-6 sm:px-12 pb-12 pt-8 overflow-y-auto custom-scrollbar grow bg-white">
          {loading ? (
            <div className="flex flex-col justify-center items-center h-80">
              <Loader2 className="w-12 h-12 text-slate-200 animate-spin mb-6 stroke-[1px]" />
              <p className="text-slate-400 font-bold text-[10px] tracking-[0.3em] uppercase">데이터를 분석 중입니다...</p>
            </div>
          ) : analysis ? (
            <div className="animate-fade-up" ref={reportRef}>
              {activeTab === 'soul' && renderSoulReport()}
            </div>
          ) : (
            <div className="text-center py-20 bg-slate-50 rounded-[32px] border border-slate-100">
              <p className="text-slate-400 font-bold tracking-widest text-[10px] uppercase mb-4">No analysis data found</p>
              <p className="text-slate-950 font-black text-lg mb-8 leading-tight">종합 분석 리포트를 <br />먼저 생성해주세요.</p>
              <button onClick={onClose} className="px-10 py-4 bg-slate-950 text-white rounded-full text-sm font-black shadow-xl hover:scale-105 transition-all active:scale-95">확인</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MbtiSajuModal;
