import React, { useState, useMemo } from 'react';
import { Sparkles, CheckCircle2, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { safeCalculateSaju, SajuResult } from '../utils/sajuUtils';
import { useGuestProfile } from '../hooks/useGuestProfile';
import GuestProfileCard from './GuestProfileCard';
import FreeSajuPreviewCard from './saju/FreeSajuPreviewCard';
import { startServicePayment } from '../utils/servicePayCheckout';
import { track } from '../utils/analytics';

interface FreePreviewProps {
  onSignup?: () => void;
  onOpenMbtiSaju?: () => void;
}

const FreePreview: React.FC<FreePreviewProps> = () => {
  const navigate = useNavigate();
  const { profile, updateProfile } = useGuestProfile();
  const [hasSubmittedFree, setHasSubmittedFree] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const sajuResult = useMemo<SajuResult | null>(() => {
    return safeCalculateSaju(profile.birthDate, profile.birthTime || null, profile.gender);
  }, [profile.birthDate, profile.birthTime, profile.gender]);

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
      mbti: profile.mbti,
      hasTime: Boolean(profile.birthTime),
    });
  };

  const handleUnlockFullAnalysis = async () => {
    if (!profile.birthDate || !sajuResult) {
      setErrorMsg('생년월일을 먼저 입력해 주세요.');
      return;
    }
    setIsPaying(true);
    setErrorMsg(null);
    track('free_preview_more_analysis_pay_click', {
      mbti: profile.mbti,
    });
    try {
      const payload = {
        birthDate: profile.birthDate,
        birthTime: profile.birthTime || null,
        gender: profile.gender,
        mbti: profile.mbti || '미입력',
        name: profile.name || '비회원',
        sajuData: sajuResult,
      };
      const res = await startServicePayment({
        serviceType: 'MBTI_SAJU',
        serviceName: 'MBTI × 사주 통합 분석',
        returnPath: '/?openService=mbtiSaju',
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

  return (
    <section id="free-preview" className="py-8 px-4 sm:px-6 bg-gradient-to-b from-white to-[#faf8fe]">
      <div className="max-w-2xl mx-auto bg-white rounded-[32px] border-2 border-violet-100 shadow-2xl shadow-violet-100/50 p-6 sm:p-8">
        {/* 퍼널 단계 안내 헤더 */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100 text-stone-700 text-xs font-bold">
            무료 만세력 및 사주 프리뷰
          </div>
        </div>

        <h2 className="text-xl sm:text-2xl font-black text-slate-900 mb-1.5 tracking-tight">
          {!showFreeResult
            ? '생년월일만 입력하고 무료 만세력 결과를 확인하세요'
            : `${profile.name.trim() ? `${profile.name.trim()}님의 ` : ''}만세력 원국 & 핵심 풀이`}
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mb-6 font-medium">
          {!showFreeResult
            ? 'MBTI는 몰라도 괜찮습니다. 한 번 입력한 정보는 오늘의 운세(무료)와 다른 풀이에도 그대로 이어집니다.'
            : '만세력 4주 8자 원국과 기본 기질 요약입니다. 끊겨 있는 뒷부분은 분석 더보기에서 바로 확인할 수 있습니다.'}
        </p>

        {/* STEP 1: 회원정보(생년월일시·성별·선택 MBTI) 기입 유도 */}
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

        {/* STEP 2 & 3: 무료 결과 (만세력 + 끊겨있는 분석 문장) -> 분석 더보기 (결제창 이동) */}
        {showFreeResult && sajuResult && (
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
      </div>
    </section>
  );
};

export default FreePreview;
