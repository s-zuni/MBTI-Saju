import React, { useState, useMemo } from 'react';
import { Sparkles, CheckCircle2, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { calculateSaju, SajuResult } from '../utils/sajuUtils';
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
    if (!profile.birthDate) return null;
    try {
      return calculateSaju(profile.birthDate, profile.birthTime || null, profile.gender);
    } catch {
      return null;
    }
  }, [profile.birthDate, profile.birthTime, profile.gender]);

  const handleShowFreeResult = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile.birthDate) {
      setErrorMsg('생년월일을 입력해 주세요.');
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
        mbti: profile.mbti || 'ISTJ',
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
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-50 text-violet-700 text-xs font-black">
            <Sparkles className="w-3.5 h-3.5" />
            무료 만세력 · 사주 × MBTI 프리뷰
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-bold">
            <span className={`px-2.5 py-0.5 rounded-full ${!hasSubmittedFree ? 'bg-slate-950 text-white font-black' : 'bg-emerald-50 text-emerald-700'}`}>
              1. 정보 기입
            </span>
            <span className="text-slate-300">&rarr;</span>
            <span className={`px-2.5 py-0.5 rounded-full ${hasSubmittedFree ? 'bg-violet-600 text-white font-black' : 'bg-slate-100 text-slate-400'}`}>
              2. 무료 만세력·프리뷰
            </span>
            <span className="text-slate-300">&rarr;</span>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-400">
              3. 전체 분석
            </span>
          </div>
        </div>

        <h2 className="text-xl sm:text-2xl font-black text-slate-900 mb-1.5 tracking-tight">
          {!hasSubmittedFree
            ? '내 생년월일과 MBTI를 입력하고 무료 만세력 결과를 확인하세요'
            : `${profile.name ? `${profile.name}님의 ` : ''}무료 만세력 원국 & 핵심 분석 프리뷰`}
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mb-6 font-medium">
          {!hasSubmittedFree
            ? '한 번 입력해 두면 오늘의 운세(무료)와 모든 사주·타로 분석에서 다시 입력할 필요가 없습니다.'
            : '만세력 4주 8자 원국과 타고난 일간·MBTI 시너지 요약입니다. 끊긴 심층 분석은 [분석 더보기]로 즉시 열람하실 수 있습니다.'}
        </p>

        {/* STEP 1: 회원정보(생년월일시·성별·MBTI) 기입 유도 */}
        <form onSubmit={handleShowFreeResult} className="space-y-4">
          <GuestProfileCard
            profile={profile}
            onChange={(patch) => {
              updateProfile(patch);
              setErrorMsg(null);
            }}
            showName
            title="STEP 1 · 나의 사주 · MBTI 정보 기입 (브라우저 자동 저장)"
          />

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold text-center">
              {errorMsg}
            </div>
          )}

          {!hasSubmittedFree ? (
            <button
              type="submit"
              className="w-full py-4 rounded-2xl bg-slate-950 hover:bg-violet-600 text-white font-black text-sm sm:text-base shadow-xl transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
            >
              <Sparkles className="w-5 h-5" />
              <span>무료 만세력 + 사주 분석 결과 보기 (0원)</span>
            </button>
          ) : (
            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                입력하신 생년월일({profile.birthDate})과 {profile.mbti} 기준으로 만세력이 계산되었습니다.
              </span>
              <button
                type="button"
                onClick={() => setHasSubmittedFree(false)}
                className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-700 hover:underline shrink-0 ml-2"
              >
                <RotateCcw className="w-3 h-3" /> 접기
              </button>
            </div>
          )}
        </form>

        {/* STEP 2 & 3: 무료 결과 (만세력 + 끊겨있는 분석 문장) -> 분석 더보기 (결제창 이동) */}
        {hasSubmittedFree && sajuResult && (
          <div className="mt-6 pt-6 border-t border-slate-100">
            <FreeSajuPreviewCard
              saju={sajuResult}
              mbti={profile.mbti || 'ISTJ'}
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
