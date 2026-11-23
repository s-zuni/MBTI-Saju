import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Loader2, Sparkles, Share2, AlertTriangle } from 'lucide-react';
import { SERVICE_COSTS } from '../config/creditConfig';
import ServiceNavigation, { ServiceType } from './ServiceNavigation';
import { experimental_useObject as useObject } from '@ai-sdk/react';
import { fullAnalysisSchema as analysisSchema } from '../config/schemas';
import { calculateSaju, safeCalculateSaju } from '../utils/sajuUtils';
import { getRandomLoadingMessage } from '../config/loadingMessages';
import { useGuestProfile } from '../hooks/useGuestProfile';
import GuestProfileCard from './GuestProfileCard';
import FreeSajuPreviewCard from './saju/FreeSajuPreviewCard';
import FullSajuReportContent from './saju/FullSajuReportContent';
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

  // Sync partial results
  useEffect(() => {
    if (fullObj) {
      setAnalysis((prev: any) => ({
        ...(prev || {}),
        ...fullObj,
        full_name: initialSession?.user?.user_metadata?.full_name || prev?.full_name || profile.name || '이용자',
        mbti: initialSession?.user?.user_metadata?.mbti || prev?.mbti || profile.mbti,
        birth_date: initialSession?.user?.user_metadata?.birth_date || prev?.birth_date || profile.birthDate,
        gender: initialSession?.user?.user_metadata?.gender || prev?.gender || profile.gender,
      }));
    }
  }, [fullObj, initialSession, profile]);

  // Loading state consolidation
  useEffect(() => {
    if (!isAnalysisLoading && fullObj) {
      const merged = {
        ...fullObj,
        full_name: initialSession?.user?.user_metadata?.full_name || profile.name || '이용자',
        mbti: initialSession?.user?.user_metadata?.mbti || profile.mbti,
        birth_date: initialSession?.user?.user_metadata?.birth_date || profile.birthDate,
        gender: initialSession?.user?.user_metadata?.gender || profile.gender,
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

    const sajuData = calculateSaju(birthDate, birthTime);
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
          {isAnalysisLoading && !analysis ? (
            <div className="flex flex-col justify-center items-center h-80 px-6 text-center">
              <Loader2 className="w-12 h-12 text-violet-300 animate-spin mb-8 stroke-[1px]" />
              <div className="space-y-3">
                <p className="text-slate-900 font-black text-lg tracking-tight animate-fade-up">
                  {currentLoadingMessage}
                </p>
                <p className="text-slate-400 font-bold text-[10px] tracking-widest uppercase">
                  분석에는 최대 30초 정도 소요될 수 있습니다
                </p>
              </div>
            </div>
          ) : (analysisError || generationError) ? (
            <div className="flex flex-col justify-center items-center py-12 px-6 text-center animate-fade-up">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-6">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">분석 중 오류가 발생했습니다</h3>
              <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                {analysisError?.message || generationError || "일시적인 서버 부하로 분석이 중단되었습니다."}
                <br />
                <span className="text-slate-900 font-bold underline underline-offset-4 decoration-violet-200">결제하신 분석은 다시 시도하실 수 있습니다.</span>
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
                className="px-8 py-4 bg-slate-950 text-white rounded-full font-black text-sm shadow-xl active:scale-95 transition-all"
              >
                다시 시도하기
              </button>
            </div>
          ) : analysis ? (
            <div ref={reportRef}>
              <FullSajuReportContent
                analysis={analysis}
                isDownloading={isDownloading}
                isRegenerating={isRegenerating}
                onDownloadReport={handleDownloadReport}
                onRegenerate={handleRegenerate}
                onOpenDeepReport={() => onOpenDeepReport?.()}
                fromContext="mbti_saju_full_report"
              />
            </div>
          ) : (
            <div className="space-y-6 py-4">
              <div className="text-center space-y-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-violet-50 text-violet-700 rounded-full text-xs font-black">
                  <Sparkles className="w-3.5 h-3.5" />
                  STEP 1~3 · 무료 만세력 확인 후 {SERVICE_COSTS.MBTI_SAJU.toLocaleString()}원으로 전체 분석 열람
                </span>
                <h4 className="text-xl font-black text-slate-950 tracking-tight">MBTI × 사주 통합 운명 리포트</h4>
                <p className="text-xs text-slate-500 font-medium">
                  생년월일과 MBTI를 기입하면 만세력 4주 원국표와 프리뷰가 즉시 무료로 계산됩니다.
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
                    className="w-full py-4.5 bg-slate-950 hover:bg-violet-600 text-white rounded-full font-black text-base shadow-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Sparkles className="w-5 h-5" />
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
