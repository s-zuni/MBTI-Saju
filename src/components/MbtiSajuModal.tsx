import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Loader2, Share2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { SERVICE_COSTS } from '../config/creditConfig';
import ServiceNavigation, { ServiceType } from './ServiceNavigation';
import { experimental_useObject as useObject } from '@ai-sdk/react';
import { fullAnalysisSchema as analysisSchema } from '../config/schemas';
import { safeCalculateSaju } from '../utils/sajuUtils';
import { getRandomLoadingMessage } from '../config/loadingMessages';
import { useGuestProfile } from '../hooks/useGuestProfile';
import GuestProfileCard from './GuestProfileCard';
import FreeSajuPreviewCard from './saju/FreeSajuPreviewCard';
import FullSajuReportContent from './saju/FullSajuReportContent';
import SajuGrid from './saju/SajuGrid';
import ReportErrorBoundary from './common/ReportErrorBoundary';
import { buildServiceRequestHeaders, consumePaidServiceTicket, startServicePayment } from '../utils/servicePayCheckout';

interface MbtiSajuModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (service: ServiceType) => void;
  onUseCredit?: ((isRegenerate?: boolean) => Promise<boolean>) | undefined;
  refreshCredits?: (() => Promise<void> | void) | undefined;
  onSuccess?: (() => void) | undefined;
  credits?: number | undefined;
  session: any;
  onOpenDeepReport?: ((reportType?: string) => void) | undefined;
}

const GUEST_MBTI_SAJU_RESULT_KEY = 'mbtiju_guest_mbti_saju_result';

const MbtiSajuModal: React.FC<MbtiSajuModalProps> = ({ isOpen, onClose, onNavigate, refreshCredits, onSuccess, session: initialSession, onOpenDeepReport }) => {
  const { profile, updateProfile } = useGuestProfile();
  const [analysis, setAnalysis] = useState<any>(null);
  const reportRef = React.useRef<HTMLDivElement>(null);
  const ticketCheckedRef = useRef(false);
  const receiptTokenRef = useRef<string | null>(null);
  const lastPayloadRef = useRef<any>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [currentLoadingMessage, setCurrentLoadingMessage] = useState('');
  const [generationError, setGenerationError] = useState<string | null>(null);


  // Streaming Hook
  const { object: fullObj, submit: submitFull, isLoading: isAnalysisLoading, error: analysisError } = useObject({
    api: '/api/analysis-main?part=full',
    schema: analysisSchema,
    headers: () => buildServiceRequestHeaders(receiptTokenRef.current),
    onFinish: ({ object, error: validationError }) => {
      if (object) {
        setGenerationError(null);
        if (refreshCredits) {
          refreshCredits();
        }
        if (onSuccess) {
          onSuccess();
        }
      } else {
        console.error('MbtiSaju Analysis validation failed:', validationError);
        setGenerationError('분석 결과를 생성하지 못했습니다. 다시 시도해 주세요.');
      }
    },
    onError: (err) => {
      console.error('MbtiSaju Analysis Error:', err);
    }
  });

  // 로딩 메시지 순환 효과
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isAnalysisLoading && !analysis) {
      setCurrentLoadingMessage(getRandomLoadingMessage('mbti'));
      interval = setInterval(() => {
        setCurrentLoadingMessage(getRandomLoadingMessage('mbti'));
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [isAnalysisLoading, analysis]);

  // Sync partial results (결제 시점 payload 우선 고정)
  useEffect(() => {
    if (fullObj) {
      const p = lastPayloadRef.current;
      setAnalysis((prev: any) => ({
        ...(prev || {}),
        ...fullObj,
        full_name: p?.name || initialSession?.user?.user_metadata?.full_name || prev?.full_name || profile.name || '이용자',
        mbti: p?.mbti || initialSession?.user?.user_metadata?.mbti || prev?.mbti || profile.mbti,
        birth_date: p?.birthDate || initialSession?.user?.user_metadata?.birth_date || prev?.birth_date || profile.birthDate,
        gender: p?.gender || initialSession?.user?.user_metadata?.gender || prev?.gender || profile.gender,
      }));
    }
  }, [fullObj, initialSession, profile]);

  // Loading state consolidation
  useEffect(() => {
    if (!isAnalysisLoading && fullObj) {
      const p = lastPayloadRef.current;
      const merged = {
        ...fullObj,
        full_name: p?.name || initialSession?.user?.user_metadata?.full_name || profile.name || '이용자',
        mbti: p?.mbti || initialSession?.user?.user_metadata?.mbti || profile.mbti,
        birth_date: p?.birthDate || initialSession?.user?.user_metadata?.birth_date || profile.birthDate,
        gender: p?.gender || initialSession?.user?.user_metadata?.gender || profile.gender,
      };
      try {
        localStorage.setItem(GUEST_MBTI_SAJU_RESULT_KEY, JSON.stringify(merged));
      } catch {
        // ignore storage errors
      }
      if (initialSession?.user) {
        supabase.auth.updateUser({
          data: { ...initialSession.user.user_metadata, analysis: fullObj }
        }).catch(() => {});
      }
    }
  }, [isAnalysisLoading, fullObj, initialSession, profile]);

  const loadAnalysis = React.useCallback(async () => {
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
        return;
      }
      const cached = localStorage.getItem(GUEST_MBTI_SAJU_RESULT_KEY);
      if (cached) {
        setAnalysis(JSON.parse(cached));
      }
    } catch (err) {
      console.error('MbtiSajuModal loadAnalysis error:', err);
    }
  }, [initialSession]);

  useEffect(() => {
    if (!isOpen) {
      ticketCheckedRef.current = false;
      return;
    }
    if (!ticketCheckedRef.current) {
      ticketCheckedRef.current = true;
      const ticket = consumePaidServiceTicket(['MBTI_SAJU', 'REGENERATE_MBTI_SAJU']);
      if (ticket?.payload) {
        receiptTokenRef.current = ticket.receiptToken || null;
        lastPayloadRef.current = ticket.payload;
        setGenerationError(null);
        setAnalysis(null);
        submitFull(ticket.payload);
        return;
      }
    }
    loadAnalysis();
  }, [isOpen, loadAnalysis, submitFull]);

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
      const shareText = `${analysis?.full_name || ''}님의 사주 풀이 별명은 "${analysis?.fusionNickname || ''}"입니다.\n\n나도 내 사주 풀이 받아보기: ${window.location.origin}`;
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


  const buildAnalysisPayload = () => {
    const birthDate = profile.birthDate || initialSession?.user?.user_metadata?.birth_date;
    const birthTime = profile.birthTime ?? initialSession?.user?.user_metadata?.birth_time ?? '';
    const gender = profile.gender || initialSession?.user?.user_metadata?.gender || 'female';
    const mbti = profile.mbti || initialSession?.user?.user_metadata?.mbti || '미입력';
    const name = profile.name || initialSession?.user?.user_metadata?.full_name || '이용자';

    if (!birthDate) {
      alert('생년월일을 입력해주세요.');
      return null;
    }

    const sajuData = safeCalculateSaju(birthDate, birthTime, gender);
    if (!sajuData) {
      alert('유효한 생년월일(1900~2050년)을 입력해주세요.');
      return null;
    }
    return {
      name,
      gender,
      birthDate,
      birthTime,
      mbti,
      sajuData,
    };
  };

  const handlePayAndGenerate = async () => {
    const payload = buildAnalysisPayload();
    if (!payload) return;
    setIsPaying(true);
    setGenerationError(null);
    try {
      const res = await startServicePayment({
        serviceType: 'MBTI_SAJU',
        serviceName: 'MBTI × 사주 통합 분석',
        returnPath: '/?openService=mbtiSaju',
        payload,
        customerName: payload.name || '비회원',
      });
      if (!res.success && res.error_msg) {
        setGenerationError(res.error_msg);
      }
    } catch (err: any) {
      setGenerationError(err?.message || '결제 요청 중 오류가 발생했습니다.');
    } finally {
      setIsPaying(false);
    }
  };

  const handleRegenerate = async () => {
    const cost = SERVICE_COSTS.REGENERATE_MBTI_SAJU;
    if (!window.confirm(`기존 결과는 새로 생성되며, 재생성 비용 ${cost.toLocaleString()}원이 결제됩니다. 계속하시겠습니까?`)) return;
    const payload = buildAnalysisPayload();
    if (!payload) return;

    setIsRegenerating(true);
    setGenerationError(null);
    try {
      const res = await startServicePayment({
        serviceType: 'REGENERATE_MBTI_SAJU',
        serviceName: 'MBTI × 사주 정밀 재생성',
        returnPath: '/?openService=mbtiSaju',
        payload,
        customerName: payload.name || '비회원',
      });
      if (!res.success && res.error_msg) {
        setGenerationError(res.error_msg);
      }
    } catch (error: any) {
      console.error("Regenerate Error:", error);
      setGenerationError(error?.message || '결제 요청 중 오류가 발생했습니다.');
    } finally {
      setIsRegenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl flex justify-center items-end sm:items-center z-[1000] p-0 sm:p-4"
    >
      <div className="relative w-full max-w-2xl bg-white rounded-t-[32px] sm:rounded-[32px] max-h-[94vh] overflow-hidden flex flex-col">
        <ServiceNavigation currentService="mbti" onNavigate={onNavigate} onClose={onClose} />
        <div className="p-8 pb-4 shrink-0">
          <div className="flex justify-between items-end">
            <h3 className="text-3xl font-black text-slate-950 tracking-tighter">운명 리포트</h3>
            {analysis && (
              <button onClick={handleShare} disabled={isSharing} className="px-5 py-2.5 bg-slate-50 text-slate-950 rounded-full text-xs font-bold border border-slate-100 flex items-center gap-2">
                {isSharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                공유하기
              </button>
            )}
          </div>
          <div className="h-[2px] w-full bg-slate-950 mt-6"></div>
        </div>
        <div className="px-8 pb-12 pt-4 overflow-y-auto grow custom-scrollbar">
          {isAnalysisLoading && !analysis ? (
            <div className="flex flex-col justify-center items-center py-16 px-6 text-center bg-[#FAF7F0] rounded-2xl border border-[#E6DFD1] space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                결제가 정상 완료되었습니다
              </div>
              <Loader2 className="w-10 h-10 text-indigo-900 animate-spin my-2 stroke-[1.75]" />
              <div className="space-y-2">
                <p className="text-slate-900 font-bold text-lg tracking-tight">
                  {currentLoadingMessage || '사주 명식을 바탕으로 전체 풀이를 작성하고 있습니다...'}
                </p>
                <p className="text-stone-600 text-sm">
                  완성된 항목부터 바로 아래에 실시간으로 표시됩니다.
                </p>
              </div>
            </div>
          ) : (analysisError || generationError) && !analysis ? (
            <div className="flex flex-col justify-center items-center py-12 px-6 text-center animate-fade-up">
              <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mb-5">
                <AlertTriangle className="w-7 h-7 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">분석 중 오류가 발생했습니다</h3>
              <p className="text-slate-600 text-sm sm:text-base mb-6 leading-relaxed">
                {analysisError?.message || generationError || "일시적인 서버 부하로 분석이 중단되었습니다."}
                <br />
                <span className="text-slate-900 font-bold">결제하신 이용권은 소진되지 않아 바로 다시 시도하실 수 있습니다.</span>
              </p>
              <button 
                onClick={() => {
                  setGenerationError(null);
                  setAnalysis(null);
                  if (lastPayloadRef.current) {
                    submitFull(lastPayloadRef.current);
                  } else {
                    loadAnalysis();
                  }
                }} 
                className="px-8 py-4 bg-slate-950 text-white rounded-full font-bold text-sm shadow-lg active:scale-95 transition-all"
              >
                다시 시도하기
              </button>
            </div>
          ) : analysis ? (
            (() => {
              const analysisSaju = safeCalculateSaju(
                analysis.birth_date || profile.birthDate,
                analysis.birth_time || profile.birthTime || initialSession?.user?.user_metadata?.birth_time || null,
                analysis.gender || profile.gender
              );
              return (
                <div ref={reportRef} className="space-y-6">
                  {analysisSaju && (
                    <div className="space-y-2">
                      <div className="flex items-baseline justify-between px-0.5">
                        <h5 className="text-sm font-bold text-stone-900">만세력 사주 원국표 (4주 8자)</h5>
                        <span className="text-xs text-stone-500">
                          {analysisSaju.ganZhi.day}일주 · {analysisSaju.dayMaster.korean}({analysisSaju.dayMaster.chinese})
                        </span>
                      </div>
                      <div className="[&>div]:!mb-0">
                        <SajuGrid saju={analysisSaju} />
                      </div>
                    </div>
                  )}
                  <ReportErrorBoundary
                    onRetry={() => {
                      setGenerationError(null);
                      if (lastPayloadRef.current) submitFull(lastPayloadRef.current);
                      else loadAnalysis();
                    }}
                  >
                    <FullSajuReportContent
                      analysis={analysis}
                      saju={analysisSaju}
                      isStreaming={isAnalysisLoading}
                      isDownloading={isDownloading}
                      isRegenerating={isRegenerating}
                      onDownloadReport={handleDownloadReport}
                      onRegenerate={handleRegenerate}
                      onOpenDeepReport={() => onOpenDeepReport?.()}
                      fromContext="mbti_saju_full_report"
                    />
                  </ReportErrorBoundary>
                </div>
              );
            })()
          ) : (
            <div className="space-y-6 py-4">
              <div className="text-center space-y-2">
                <span className="inline-flex items-center px-3 py-1 bg-stone-100 text-stone-700 rounded-full text-xs font-bold">
                  STEP 1~3 · 무료 만세력 확인 후 {SERVICE_COSTS.MBTI_SAJU.toLocaleString()}원으로 전체 분석 열람
                </span>
                <h4 className="text-xl font-bold text-slate-950 tracking-tight">MBTI × 사주 통합 운명 리포트</h4>
                <p className="text-sm text-slate-600">
                  생년월일만 입력해도 만세력 4주 원국표와 프리뷰가 즉시 무료로 계산됩니다.
                </p>
              </div>
              <GuestProfileCard
                profile={profile}
                onChange={updateProfile}
                showName
                title="STEP 1 · 나의 사주 · MBTI 정보 기입"
              />
              {(() => {
                const previewSaju = safeCalculateSaju(profile.birthDate, profile.birthTime || null, profile.gender);
                if (previewSaju) {
                  return (
                    <FreeSajuPreviewCard
                      saju={previewSaju}
                      mbti={profile.mbti}
                      userName={profile.name}
                      isPaying={isPaying}
                      onUnlockClick={handlePayAndGenerate}
                    />
                  );
                }
                return (
                  <button
                    onClick={handlePayAndGenerate}
                    disabled={isPaying}
                    className="w-full py-4 bg-slate-950 hover:bg-indigo-950 text-white rounded-full font-bold text-base shadow-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <span>생년월일을 입력하면 무료 만세력과 분석 프리뷰가 표시됩니다</span>
                  </button>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MbtiSajuModal;
