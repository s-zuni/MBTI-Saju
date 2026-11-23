import React from 'react';
import { Lock, Sparkles, ArrowRight, Flame, ShieldAlert, TrendingUp, Heart, Compass } from 'lucide-react';
import SajuGrid from './SajuGrid';
import { SajuResult } from '../../utils/sajuUtils';
import { SERVICE_COSTS } from '../../config/creditConfig';

interface FreeSajuPreviewCardProps {
  saju: SajuResult;
  mbti: string;
  userName?: string;
  isPaying?: boolean;
  onUnlockClick: () => void;
  onTodayFortuneClick?: () => void;
  compact?: boolean;
}

const ELEMENT_META: Record<
  'wood' | 'fire' | 'earth' | 'metal' | 'water',
  { label: string; hanja: string; barClass: string; badgeClass: string; trait: string; risk: string }
> = {
  wood: {
    label: '목',
    hanja: '木',
    barClass: 'bg-emerald-500',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    trait: '성장과 추진력, 새로운 판을 여는 기획 에너지',
    risk: '시작은 빠르지만 감정 소모가 겹칠 때 중도 포기가 생기는 흐름',
  },
  fire: {
    label: '화',
    hanja: '火',
    barClass: 'bg-rose-500',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    trait: '강렬한 표현력과 직관, 사람들의 시선을 끄는 존재감',
    risk: '감정의 온도가 급격히 올라갔다 식으면서 인간관계 피로가 누적되는 구간',
  },
  earth: {
    label: '토',
    hanja: '土',
    barClass: 'bg-amber-500',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    trait: '중심을 잡는 포용력과 현실적인 재물·기반 축적 감각',
    risk: '겉으로는 태연해 보여도 속으로 걱정을 쌓아두다 결정적 기회를 늦추는 성향',
  },
  metal: {
    label: '금',
    hanja: '金',
    barClass: 'bg-slate-600',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
    trait: '명확한 분별력과 결단력, 핵심을 찌르는 완벽주의',
    risk: '내 기준이 높아 사람이나 일에서 스스로를 고립시키는 냉각기',
  },
  water: {
    label: '수',
    hanja: '水',
    barClass: 'bg-blue-500',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    trait: '깊은 통찰력과 유연한 적응력, 본질을 꿰뚫는 지혜',
    risk: '생각이 꼬리를 물어 실행 타이밍을 놓치거나 밤마다 에너지가 분산되는 흐름',
  },
};

const MBTI_GROUP_INSIGHT: Record<string, { persona: string; blindSpot: string }> = {
  NT: {
    persona: '머릿속으로 이미 수십 가지 시나리오와 전략을 계산해 두는 전략가형',
    blindSpot: '감정적 신호를 논리로 억누르다 가까운 인연이나 파트너십에서 예상치 못한 오해가 생기는 지점',
  },
  NF: {
    persona: '타인의 미묘한 감정선과 의미를 누구보다 깊이 읽어내는 통찰가형',
    blindSpot: '관계에 진심을 쏟은 만큼 에너지가 급격히 방전되고, 정작 내 실속(재물·커리어)을 뒤로 미루는 패턴',
  },
  SJ: {
    persona: '책임감과 검증된 기준으로 흔들림 없이 기반을 다져 나가는 수호자형',
    blindSpot: '안전한 길을 택하려다 운이 크게 트이는 변곡점에서 과감한 베팅 타이밍을 한 박자 놓치는 흐름',
  },
  SP: {
    persona: '현장의 흐름과 감각을 빠르게 캐치해 위기를 기회로 바꾸는 실전가형',
    blindSpot: '순간의 몰입도는 최고지만 장기적인 현금 흐름이나 관계 유지 루틴이 흔들릴 때 손실이 커지는 구조',
  },
};

function getMbtiGroupKey(mbti: string): string {
  const upper = (mbti || 'ENFP').toUpperCase();
  if (upper.includes('NT')) return 'NT';
  if (upper.includes('NF')) return 'NF';
  if (upper[1] === 'S' && upper[3] === 'J') return 'SJ';
  if (upper[1] === 'S' && upper[3] === 'P') return 'SP';
  return 'NF';
}

const FreeSajuPreviewCard: React.FC<FreeSajuPreviewCardProps> = ({
  saju,
  mbti,
  userName,
  isPaying = false,
  onUnlockClick,
  onTodayFortuneClick,
  compact = false,
}) => {
  const displayName = userName?.trim() ? `${userName.trim()}님` : '당신';
  const elementKeys = ['wood', 'fire', 'earth', 'metal', 'water'] as const;

  const sortedElements = [...elementKeys].sort(
    (a, b) => (saju.elementRatio[b] || 0) - (saju.elementRatio[a] || 0)
  );
  const dominantKey = sortedElements[0] || 'wood';
  const lackingKey = sortedElements[sortedElements.length - 1] || 'water';
  const dominantMeta = ELEMENT_META[dominantKey];
  const lackingMeta = ELEMENT_META[lackingKey];
  const mbtiGroup = MBTI_GROUP_INSIGHT[getMbtiGroupKey(mbti)]!;

  const dayPillarText = `${saju.ganZhi.day}일주`;
  const dayMasterTitle = `${saju.dayMaster.korean}(${saju.dayMaster.chinese})`;

  return (
    <div className="space-y-5 animate-fade-up text-left">
      {/* 상단 무료 분석 완료 배지 */}
      <div className="bg-gradient-to-br from-slate-950 via-violet-950 to-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 40%, #8b5cf6 0%, transparent 55%), radial-gradient(circle at 80% 60%, #f59e0b 0%, transparent 55%)',
          }}
        />
        <div className="relative z-10 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[11px] font-black">
              <Sparkles className="w-3.5 h-3.5" /> STEP 2 · 무료 만세력 &amp; 핵심 기질 원국 도출 완료
            </span>
            <span className="text-[11px] font-bold text-violet-200">
              {mbti} × {dayMasterTitle} · {dayPillarText}
            </span>
          </div>
          <h4 className="text-lg sm:text-xl font-black tracking-tight leading-snug">
            {displayName}의 타고난 일간은 <span className="text-amber-300">{dayMasterTitle}</span>이며,
            겉으로 드러나는 <span className="text-violet-300">{mbti}</span> 성향과 강하게 교차하고 있습니다.
          </h4>
          <p className="text-xs text-slate-300 leading-relaxed">
            핵심 키워드: <strong className="text-white">{saju.dayMaster.description}</strong>
          </p>
        </div>
      </div>

      {/* 1. 정통 만세력 4주 8자 원국표 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h5 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-violet-600" />
            정통 만세력 사주 원국표 (4주 8자 · 십성 · 12운성)
          </h5>
          <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">
            무료 공개
          </span>
        </div>
        <div className="[&>div]:!mb-0">
          <SajuGrid saju={saju} />
        </div>
      </div>

      {/* 2. 오행 에너지 밸런스 요약 */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-black text-slate-800">오행(五行) 에너지 분포</span>
          <div className="flex items-center gap-1.5 text-[11px] font-bold">
            <span className={`px-2 py-0.5 rounded-full border ${dominantMeta.badgeClass}`}>
              강한 기운: {dominantMeta.label}({dominantMeta.hanja}) {saju.elementRatio[dominantKey]}%
            </span>
            <span className="px-2 py-0.5 rounded-full border bg-slate-50 text-slate-600 border-slate-200">
              보완 기운: {lackingMeta.label}({lackingMeta.hanja}) {saju.elementRatio[lackingKey]}%
            </span>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {elementKeys.map((key) => {
            const meta = ELEMENT_META[key];
            const pct = saju.elementRatio[key] || 0;
            const count = saju.elements[key] || 0;
            return (
              <div key={key} className="bg-slate-50 rounded-xl p-2.5 text-center border border-slate-100">
                <div className="text-xs font-black text-slate-800">
                  {meta.label}({meta.hanja})
                </div>
                <div className="text-[11px] font-bold text-slate-500 mt-0.5">
                  {count}자 · {pct}%
                </div>
                <div className="w-full bg-slate-200/70 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className={`${meta.barClass} h-full rounded-full transition-all duration-500`}
                    style={{ width: `${Math.max(pct, 8)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. 무료 결과 + 끊겨있는 분석 문장 (Cliffhanger & Blur Gate) */}
      <div className="bg-white rounded-3xl border-2 border-violet-200 shadow-lg overflow-hidden relative">
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-50 text-violet-700 text-xs font-black">
              <Flame className="w-3.5 h-3.5 text-violet-600" />
              MBTI × 사주 교차 심층 분석 프리뷰
            </span>
            <span className="text-[11px] font-bold text-slate-400">핵심 요약 및 심층 영역</span>
          </div>

          {/* 공개된 도입 분석 문단 */}
          <div className="space-y-3 text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
            <p>
              <strong className="text-slate-950 font-black">1. 타고난 본성 × MBTI 시너지:</strong>{' '}
              {displayName}은 사주 원국에서 <strong className="text-violet-700">{dayMasterTitle}</strong> 일간을 중심으로{' '}
              <strong className="text-slate-900">
                {dominantMeta.label}({dominantMeta.hanja}) 기운({saju.elementRatio[dominantKey]}%)
              </strong>
              이 주도권을 쥐고 있습니다. 여기에 {mbti} 특유의 <em>“{mbtiGroup.persona}”</em> 기질이 결합되면서,{' '}
              {dominantMeta.trait}이 남들보다 훨씬 뚜렷하게 발현됩니다.
            </p>
            <p>
              <strong className="text-slate-950 font-black">2. 내면의 충돌 포인트:</strong>{' '}
              반면 원국 내 <strong className="text-rose-600">{lackingMeta.label}({lackingMeta.hanja}) 기운({saju.elementRatio[lackingKey]}%)</strong>이 상대적으로 약해질 때{' '}
              {dominantMeta.risk}이 나타나기 쉽고, {mbtiGroup.blindSpot}이 겹치며 결정적인 순간 에너지를 잃곤 합니다.
            </p>
          </div>

          {/* 끊겨있는 분석 문장 (하이라이트 클리프행어) */}
          <div className="p-4 rounded-2xl bg-violet-50/70 border border-violet-100 space-y-2 relative">
            <div className="flex items-center gap-1.5 text-xs font-black text-violet-800">
              <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
              <span>2026년 재물·연애·커리어 변곡점 &amp; 주의해야 할 운명 패턴</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-bold">
              특히 {displayName}의 <span className="text-violet-700">{dayPillarText}</span>와{' '}
              <span className="text-violet-700">{mbti}</span> 성향이 만났을 때 올해 가장 조심해야 할 인간관계·감정 소모 패턴은{' '}
              <span className="underline decoration-rose-400 decoration-2">
                {lackingMeta.label}({lackingMeta.hanja}) 기운이 흔들리는 시기
              </span>
              에 집중되며, 반대로 뜻밖의 목돈과 귀인이 들어오는 결정적 타이밍과 지금 당장 바꿔야 할 핵심 전략은
              <span className="text-slate-400">...</span>
            </p>
          </div>

          {/* 블러 처리된 잠금 섹션 미리보기 */}
          {!compact && (
            <div className="space-y-2.5 pt-1 select-none pointer-events-none" aria-hidden="true">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 blur-[4px] opacity-75">
                <div className="flex items-center gap-2 text-xs font-black text-slate-800 mb-1">
                  <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
                  [잠금] 2026년 월별 재물·이직·성과가 폭발하는 황금 시기
                </div>
                <p className="text-xs text-slate-500">
                  상반기와 하반기 중 {dayMasterTitle} 일간의 재성과 관성이 동시에 살아나는 달은 0월과 0월이며 이때 반드시...
                </p>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 blur-[5px] opacity-60">
                <div className="flex items-center gap-2 text-xs font-black text-slate-800 mb-1">
                  <Heart className="w-3.5 h-3.5 text-rose-500" />
                  [잠금] {mbti} × {dayPillarText} 연애·인간관계 치명적 약점 및 개운 솔루션
                </div>
                <p className="text-xs text-slate-500">
                  나에게 독이 되는 사람 유형과 시너지를 내는 귀인의 사주·MBTI 조합, 그리고 부족한 {lackingMeta.label} 기운을 채우는 행운 부스터...
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 그라데이션 오버레이 & STEP 3: 분석 더보기 (결제창 이동) CTA */}
        <div className="bg-gradient-to-t from-white via-white/95 to-white/80 px-5 pb-6 pt-4 border-t border-violet-100 text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-black">
            <Lock className="w-3 h-3 text-amber-600" />
            끊긴 뒷부분 + 2026 월별 운세 · 재물 · 연애 · 무의식 그림자 전체 리포트 (총 9개 챕터)
          </div>

          <button
            type="button"
            onClick={onUnlockClick}
            disabled={isPaying}
            className="w-full py-4 sm:py-4.5 px-6 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-2xl font-black text-sm sm:text-base shadow-xl shadow-violet-200 flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-60"
          >
            <Sparkles className="w-5 h-5 shrink-0" />
            <span>
              {isPaying
                ? '토스 결제창으로 이동 중...'
                : `분석 더보기 — 전체 결과 잠금 해제 (${SERVICE_COSTS.MBTI_SAJU.toLocaleString()}원)`}
            </span>
            <ArrowRight className="w-4 h-4 shrink-0" />
          </button>

          <p className="text-[11px] text-slate-500 font-medium">
            회원가입·구독 없이 <strong>{SERVICE_COSTS.MBTI_SAJU.toLocaleString()}원 단건 결제창</strong>으로 즉시 이동하며, 결제 즉시 끊긴 전체 분석이 열립니다.
          </p>

          {onTodayFortuneClick && (
            <div className="pt-1">
              <button
                type="button"
                onClick={onTodayFortuneClick}
                className="text-xs font-extrabold text-emerald-700 hover:text-emerald-800 underline underline-offset-4"
              >
                먼저 오늘의 운세(0원 · 무료)부터 확인해 볼래요 &rarr;
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FreeSajuPreviewCard;
