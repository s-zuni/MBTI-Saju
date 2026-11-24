import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Sparkles, CheckCircle2, RotateCcw, Loader2, AlertTriangle, Share2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { experimental_useObject as useObject } from '@ai-sdk/react';
import { fullAnalysisSchema as analysisSchema } from '../config/schemas';
import { safeCalculateSaju, SajuResult } from '../utils/sajuUtils';
import { useGuestProfile } from '../hooks/useGuestProfile';
import GuestProfileCard from './GuestProfileCard';
import FreeSajuPreviewCard from './saju/FreeSajuPreviewCard';
import FullSajuReportContent from './saju/FullSajuReportContent';
import SajuGrid from './saju/SajuGrid';
import ReportErrorBoundary from './common/ReportErrorBoundary';
import { buildServiceRequestHeaders, consumePaidServiceTicket, startServicePayment } from '../utils/servicePayCheckout';
import { getRandomLoadingMessage } from '../config/loadingMessages';
import { SERVICE_COSTS } from '../config/creditConfig';
import { track } from '../utils/analytics';

interface FreePreviewProps {
  onSignup?: () => void;
  onOpenMbtiSaju?: () => void;
}

const GUEST_MBTI_SAJU_RESULT_KEY = 'mbtiju_guest_mbti_saju_result';

const FreePreview: React.FC<FreePreviewProps> = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, updateProfile } = useGuestProfile();

  const [hasSubmittedFree, setHasSubmittedFree] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [fullAnalysis, setFullAnalysis] = useState<any>(null);
  const [currentLoadingMessage, setCurrentLoadingMessage] = useState('');

  const reportRef = useRef<HTMLDivElement>(null);
  const receiptTokenRef = useRef<string | null>(null);
  const lastPayloadRef = useRef<any>(null);
  const ticketConsumedRef = useRef(false);

  const sajuResult = useMemo<SajuResult | null>(() => {
    return safeCalculateSaju(profile.birthDate, profile.birthTime || null, profile.gender);
  }, [profile.birthDate, profile.birthTime, profile.gender]);

  const { object: fullObj, submit: submitFull, isLoading: isAnalysisLoading, error: analysisError } = useObject({
    api: '/api/analysis-main?part=full',
    schema: analysisSchema,
    headers: () => buildServiceRequestHeaders(receiptTokenRef.current),
    onFinish: ({ object, error: validationError }) => {
      if (object) {
        setGenerationError(null);
      } else {
        console.error('[FreePreview] Full analysis validation failed:', validationError);
        setGenerationError('분석 결과를 생성하지 못했습니다. 아래 [다시 시도하기]를 눌러 주세요.');
      }
    },
    onError: (err) => {
      console.error('[FreePreview] Full analysis error:', err);
      setGenerationError('분석 중 일시적인 오류가 발생했습니다. 아래 [다시 시도하기]를 눌러 주세요.');
    },
  });

  // 결제 완료 후 홈(?openService=freePreview)으로 돌아오면 별도 팝업 없이 그 자리에서 바로 이어서 전체 분석 스트리밍
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const openService = params.get('openService');

    if (openService === 'freePreview' && !ticketConsumedRef.current) {
      ticketConsumedRef.current = true;
      const ticket = consumePaidServiceTicket(['MBTI_SAJU', 'REGENERATE_MBTI_SAJU']);

      requestAnimationFrame(() => {
        document.getElementById('free-preview')?.scrollIntoView({ behavior: 'auto', block: 'start' });
      });
      window.history.replaceState({}, document.title, '/');

      if (ticket?.payload) {
        receiptTokenRef.current = ticket.receiptToken || null;
        lastPayloadRef.current = ticket.payload;
        setHasSubmittedFree(true);
        setFullAnalysis(null);
        setGenerationError(null);
        setErrorMsg(null);
        submitFull(ticket.payload);
        return;
      }
    }

    if (openService !== 'freePreview') {
      ticketConsumedRef.current = false;
    }
  }, [location.search, submitFull]);

  // 로딩 메시지 순환
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isAnalysisLoading && !fullAnalysis) {
      setCurrentLoadingMessage(getRandomLoadingMessage('mbti'));
      interval = setInterval(() => {
        setCurrentLoadingMessage(getRandomLoadingMessage('mbti'));
      }, 4000);
    }
    return () => clearInterval(interval);
  }, [isAnalysisLoading, fullAnalysis]);

  // 스트리밍 부분 객체 동기화
  useEffect(() => {
    if (fullObj) {
      setFullAnalysis((prev: any) => ({
        ...(prev || {}),
        ...fullObj,
        full_name: prev?.full_name || profile.name || '이용자',
        mbti: prev?.mbti || profile.mbti || '미입력',
        birth_date: prev?.birth_date || profile.birthDate,
        gender: prev?.gender || profile.gender,
      }));
    }
  }, [fullObj, profile.birthDate, profile.gender, profile.mbti, profile.name]);

  // 완성 시 localStorage 캐시 저장
  useEffect(() => {
    if (!isAnalysisLoading && fullObj) {
      const merged = {
        ...fullObj,
        full_name: profile.name || '이용자',
        mbti: profile.mbti || '미입력',
        birth_date: profile.birthDate,
        gender: profile.gender,
      };
      try {
        localStorage.setItem(GUEST_MBTI_SAJU_RESULT_KEY, JSON.stringify(merged));
      } catch {
        // ignore storage quota errors
      }
    }
  }, [isAnalysisLoading, fullObj, profile.birthDate, profile.gender, profile.mbti, profile.name]);

  const showFreeResult = hasSubmittedFree && !!sajuResult;

  const handleShowFreeResult = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile.birthDate) {
      setErrorMsg('생년월일을 입력해 주세요.');
      return;
    }
    if (!sajuResult) {
      setErrorMsg('1900년~2050년 사이의 유효한 생년월일을 입력해 주세요.');
      return;
    }
    setErrorMsg(null);
    setHasSubmittedFree(true);
    track('free_preview_calculate', {
      gender: profile.gender,
      mbti: profile.mbti || 'none',
      hasTime: Boolean(profile.birthTime),
    });
  };

  const buildCurrentPayload = () => {
    if (!profile.birthDate || !sajuResult) return null;
    return {
      birthDate: profile.birthDate,
      birthTime: profile.birthTime || null,
      gender: profile.gender,
      mbti: profile.mbti || '미입력',
      name: profile.name || '비회원',
      sajuData: sajuResult,
    };
  };

  const handleUnlockFullAnalysis = async () => {
    const payload = buildCurrentPayload();
    if (!payload) {
      setErrorMsg('생년월일을 먼저 입력해 주세요.');
      return;
    }
    setIsPaying(true);
    setErrorMsg(null);
    track('free_preview_more_analysis_pay_click', {
      mbti: profile.mbti || 'none',
    });
    try {
      const res = await startServicePayment({
        serviceType: 'MBTI_SAJU',
        serviceName: 'MBTI × 사주 통합 분석',
        returnPath: '/?openService=freePreview',
        payload,
        customerName: payload.name,
      });
      if (!res.success && res.error_msg) {
        setErrorMsg(res.error_msg);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || '결제창 이동 중 오류가 발생했습니다.');
    } finally {
      setIsPaying(false);
    }
  };

  const handleRegenerate = async () => {
    const cost = SERVICE_COSTS.REGENERATE_MBTI_SAJU;
    if (!window.confirm(`기존 결과는 새로 생성되며, 재생성 비용 ${cost.toLocaleString()}원이 결제됩니다. 계속하시겠습니까?`)) return;
    const payload = buildCurrentPayload();
    if (!payload) return;

    setIsRegenerating(true);
    setGenerationError(null);
    try {
      const res = await startServicePayment({
        serviceType: 'REGENERATE_MBTI_SAJU',
        serviceName: 'MBTI × 사주 정밀 재생성',
        returnPath: '/?openService=freePreview',
        payload,
        customerName: payload.name,
      });
      if (!res.success && res.error_msg) {
        setGenerationError(res.error_msg);
      }
    } catch (err: any) {
      setGenerationError(err?.message || '결제 요청 중 오류가 발생했습니다.');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleDownloadReport = async () => {
    if (!reportRef.current || !fullAnalysis) return;
    setIsDownloading(true);
    try {
      const { generatePDF } = await import('../utils/pdfGenerator');
      await generatePDF(reportRef.current, `MBTIJU-Soul-Report-${fullAnalysis.full_name || '사주'}`);
    } catch (err) {
      console.error('Download failed:', err);
      alert('리포트 저장 중 오류가 발생했습니다.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = async () => {
    if (!fullAnalysis) return;
    setIsSharing(true);
    try {
      const shareText = `${fullAnalysis.full_name || '나'}님의 사주 풀이 키워드는 "${fullAnalysis.fusionNickname || ''}"입니다!\n\n나도 내 사주 풀이 받아보기 -> ${window.location.origin}`;
      if (navigator.share) {
        await navigator.share({ title: '나의 사주 풀이', text: shareText, url: window.location.origin });
      } else {
        await navigator.clipboard.writeText(shareText);
        alert('공유 내용이 클립보드에 복사되었습니다!');
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') console.error('Sharing failed:', err);
    } finally {
      setIsSharing(false);
    }
  };

  const handleRetryGeneration = () => {
    setGenerationError(null);
    if (lastPayloadRef.current) {
      submitFull(lastPayloadRef.current);
    } else {
      const payload = buildCurrentPayload();
      if (payload) submitFull(payload);
    }
  };

  const isInlinePaidActive = isAnalysisLoading || !!fullAnalysis || !!(analysisError || generationError);

  return (
    <section id="free-preview" className="py-8 px-4 sm:px-6 bg-gradient-to-b from-white to-[#faf8fe]">
      <div className="max-w-2xl mx-auto bg-white rounded-[32px] border border-stone-200 shadow-xl shadow-stone-200/40 p-6 sm:p-8">
        {/* 상단 헤더 */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100 text-stone-700 text-xs font-bold">
            {fullAnalysis ? '사주 명식 전체 풀이' : '무료 만세력 및 사주 프리뷰'}
          </div>
          {fullAnalysis && (
            <button
              type="button"
              onClick={handleShare}
              disabled={isSharing}
              className="px-4 py-1.5 bg-stone-100 hover:bg-stone-200 text-slate-900 rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              {isSharing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5" />}
              공유하기
            </button>
          )}
        </div>

        <h2 className="text-xl sm:text-2xl font-black text-slate-900 mb-1.5 tracking-tight">
          {fullAnalysis
            ? `${profile.name.trim() ? `${profile.name.trim()}님의 ` : ''}전체 사주 풀이 리포트`
            : showFreeResult
            ? `${profile.name.trim() ? `${profile.name.trim()}님의 ` : ''}만세력 원국 & 핵심 풀이`
            : '생년월일만 입력하고 무료 만세력 결과를 확인하세요'}
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mb-6 font-medium">
          {fullAnalysis
            ? '결제하신 전체 풀이가 바로 아래에 이어서 열렸습니다. PDF 저장과 하단 심층 상담도 이용하실 수 있습니다.'
            : showFreeResult
            ? '만세력 4주 8자 원국과 기본 기질 요약입니다. 끊겨 있는 뒷부분은 분석 더보기에서 바로 확인할 수 있습니다.'
            : 'MBTI는 몰라도 괜찮습니다. 한 번 입력한 정보는 오늘의 운세(무료)와 다른 풀이에도 그대로 이어집니다.'}
        </p>

        {/* STEP 1: 아직 전체 분석이 시작되지 않았을 때 입력 폼 표시 */}
        {!isInlinePaidActive && (
          <form onSubmit={handleShowFreeResult} className="space-y-4">
            <GuestProfileCard
              profile={profile}
              onChange={(patch) => {
                updateProfile(patch);
                setErrorMsg(null);
              }}
              showName
              title="내 정보 입력 (브라우저 임시 저장)"
            />

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold text-center">
                {errorMsg}
              </div>
            )}

            {!showFreeResult ? (
              <button
                type="submit"
                className="w-full py-4 rounded-2xl bg-slate-950 hover:bg-indigo-950 text-white font-black text-sm sm:text-base shadow-xl transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
              >
                <Sparkles className="w-5 h-5" />
                <span>무료 만세력 + 사주 분석 결과 보기</span>
              </button>
            ) : (
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-stone-100 border border-stone-200 text-stone-700 text-xs font-semibold">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  {profile.birthDate}{profile.mbti ? ` (${profile.mbti})` : ''} 기준으로 만세력이 계산되었습니다.
                </span>
                <button
                  type="button"
                  onClick={() => setHasSubmittedFree(false)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-stone-700 hover:underline shrink-0 ml-2"
                >
                  <RotateCcw className="w-3 h-3" /> 접기
                </button>
              </div>
            )}
          </form>
        )}

        {/* STEP 2 & 3: 무료 결과 -> 분석 더보기 */}
        {!isInlinePaidActive && showFreeResult && sajuResult && (
          <div className="mt-6 pt-6 border-t border-slate-100">
            <FreeSajuPreviewCard
              saju={sajuResult}
              mbti={profile.mbti}
              userName={profile.name}
              isPaying={isPaying}
              onUnlockClick={handleUnlockFullAnalysis}
              onTodayFortuneClick={() => navigate('/myluck?type=today')}
            />
          </div>
        )}

        {/* STEP 4: 결제 완료 후 별도 팝업 없이 그 자리에서 바로 이어지는 전체 분석 */}
        {isInlinePaidActive && (
          <div ref={reportRef} className="space-y-6">
            {sajuResult && (
              <div className="space-y-2">
                <div className="flex items-baseline justify-between px-0.5">
                  <h5 className="text-sm font-bold text-stone-900">만세력 사주 원국표 (4주 8자)</h5>
                  <span className="text-xs text-stone-500">
                    {sajuResult.ganZhi.day}일주 · {sajuResult.dayMaster.korean}({sajuResult.dayMaster.chinese})
                  </span>
                </div>
                <div className="[&>div]:!mb-0">
                  <SajuGrid saju={sajuResult} />
                </div>
              </div>
            )}

            {isAnalysisLoading && !fullAnalysis ? (
              <div data-pdf-ignore="true" className="flex flex-col justify-center items-center py-14 px-6 text-center bg-[#FAF7F0] rounded-2xl border border-[#E6DFD1] space-y-3">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  결제가 정상 완료되었습니다
                </div>
                <Loader2 className="w-10 h-10 text-indigo-900 animate-spin my-2 stroke-[1.5]" />
                <p className="text-slate-900 font-bold text-base sm:text-lg tracking-tight">
                  {currentLoadingMessage || '사주 명식을 바탕으로 전체 풀이를 작성하고 있습니다...'}
                </p>
                <p className="text-stone-500 text-xs">
                  잠시만 기다려 주시면 작성되는 대로 바로 아래에 실시간 표시됩니다.
                </p>
              </div>
            ) : (analysisError || generationError) && !fullAnalysis ? (
              <div data-pdf-ignore="true" className="flex flex-col justify-center items-center py-12 px-6 text-center bg-rose-50/40 rounded-2xl border border-rose-200">
                <div className="w-14 h-14 bg-rose-100 rounded-full flex items-center justify-center mb-4">
                  <AlertTriangle className="w-7 h-7 text-rose-600" />
                </div>
                <h3 className="text-lg font-black text-slate-900 mb-2">분석 중 오류가 발생했습니다</h3>
                <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                  {generationError || analysisError?.message || '일시적인 통신 오류가 발생했습니다.'}
                  <br />
                  <span className="text-slate-900 font-bold">결제하신 이용권은 소진되지 않아 바로 다시 시도하실 수 있습니다.</span>
                </p>
                <button
                  type="button"
                  onClick={handleRetryGeneration}
                  className="px-8 py-3.5 bg-slate-950 hover:bg-slate-800 text-white rounded-full font-bold text-sm shadow-lg transition-all"
                >
                  다시 시도하기
                </button>
              </div>
            ) : fullAnalysis ? (
              <ReportErrorBoundary onRetry={handleRetryGeneration}>
                <FullSajuReportContent
                  analysis={fullAnalysis}
                  isStreaming={isAnalysisLoading}
                  isDownloading={isDownloading}
                  isRegenerating={isRegenerating}
                  onDownloadReport={handleDownloadReport}
                  onRegenerate={handleRegenerate}
                  onOpenDeepReport={() => navigate('/premium')}
                  fromContext="home_free_preview_full_report"
                />
              </ReportErrorBoundary>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
};

export default FreePreview;
