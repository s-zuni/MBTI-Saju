import React from 'react';
import { Lock } from 'lucide-react';
import SajuGrid from './SajuGrid';
import { SajuResult } from '../../utils/sajuUtils';
import { SERVICE_COSTS } from '../../config/creditConfig';

interface FreeSajuPreviewCardProps {
  saju: SajuResult;
  mbti?: string;
  userName?: string;
  isPaying?: boolean;
  onUnlockClick: () => void;
  onTodayFortuneClick?: () => void;
  compact?: boolean;
}

const ELEMENT_COPY: Record<
  'wood' | 'fire' | 'earth' | 'metal' | 'water',
  {
    label: string;
    hanja: string;
    barColor: string;
    pillClass: string;
    naturePhrase: string;
    excessPattern: string;
    missingCue: string;
  }
> = {
  wood: {
    label: '목',
    hanja: '木',
    barColor: 'bg-emerald-600',
    pillClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    naturePhrase: '새 판을 짜고 앞으로 뻗어나가는 힘',
    excessPattern: '시작은 빠르지만 혼자 감당하려는 일이 겹치면서 기력이 먼저 빠지기 쉽습니다',
    missingCue: '목 기운이 꺾이는 초봄과 늦가을 사이',
  },
  fire: {
    label: '화',
    hanja: '火',
    barColor: 'bg-rose-600',
    pillClass: 'bg-rose-50 text-rose-800 border-rose-200',
    naturePhrase: '한번 마음을 정하면 주변 공기까지 데우는 열기',
    excessPattern: '감정이 뜨겁게 달아오른 뒤 한순간 식어버려 인간관계에서 피로가 쌓이기 쉽습니다',
    missingCue: '열기가 과해지거나 반대로 기운이 가라앉는 환절기',
  },
  earth: {
    label: '토',
    hanja: '土',
    barColor: 'bg-amber-600',
    pillClass: 'bg-amber-50 text-amber-800 border-amber-200',
    naturePhrase: '사람과 일을 묵직하게 붙잡아 두는 중심',
    excessPattern: '겉으로는 괜찮은 척하면서 속으로 고민을 오래 품다 결정 시기를 늦추는 편입니다',
    missingCue: '버티는 힘만 쓰다 흐름이 바뀔 때',
  },
  metal: {
    label: '금',
    hanja: '金',
    barColor: 'bg-slate-600',
    pillClass: 'bg-slate-100 text-slate-800 border-slate-300',
    naturePhrase: '안 되는 건 딱 잘라내고 핵심만 남기는 결단력',
    excessPattern: '내 기준이 분명한 만큼 타인에게 선을 긋고 혼자 해결하려 드는 경향이 강합니다',
    missingCue: '예민함과 완벽주의가 겹치는 시기',
  },
  water: {
    label: '수',
    hanja: '水',
    barColor: 'bg-blue-600',
    pillClass: 'bg-blue-50 text-blue-800 border-blue-200',
    naturePhrase: '상황의 이면까지 먼저 읽어내는 깊은 생각과 유연함',
    excessPattern: '머릿속 시뮬레이션이 길어져 정작 손발이 움직여야 할 때 망설임이 남습니다',
    missingCue: '밤늦게까지 생각이 끊기지 않는 시기',
  },
};

const DAY_MASTER_LEAD: Record<string, { headline: string; body: string }> = {
  갑목: {
    headline: '꺾이지 않고 위로 뻗어 오르는 큰 나무의 명식입니다',
    body: '눈치 보며 맞추기보다 스스로 기준을 세우고 앞장설 때 기운이 살아납니다. 남들 밑에서 시키는 일만 반복하면 금방 답답해지기 쉽습니다.',
  },
  을목: {
    headline: '바람에도 부러지지 않고 결국 제 자리를 찾아내는 덩굴의 명식입니다',
    body: '겉은 부드러워 보여도 속은 누구보다 현실적이고 끈기가 셉니다. 낯선 환경에 던져져도 기어코 살아남는 힘이 있습니다.',
  },
  병화: {
    headline: '한낮의 태양처럼 스스로 빛을 내어 주변을 밝히는 명식입니다',
    body: '속내를 오래 숨기지 못하고 좋으면 좋다, 아니면 아니다가 얼굴에 드러납니다. 사람들 앞에서 중심을 잡을수록 운이 따라옵니다.',
  },
  정화: {
    headline: '어둠 속에서 길을 비추는 촛불처럼 섬세하고 온기가 깊은 명식입니다',
    body: '평소에는 조용하고 배려심이 깊지만, 내가 아끼는 사람이나 일 앞에서는 놀라울 정도로 집요하게 끝을 봅니다.',
  },
  무토: {
    headline: '쉽게 흔들리지 않고 주변 사람들이 기대어 쉬는 큰 산의 명식입니다',
    body: '한번 믿고 곁을 준 사람에게는 끝까지 의리를 지킵니다. 다만 변화를 두려워해 낡은 인연이나 자리를 너무 오래 붙잡을 때가 있습니다.',
  },
  기토: {
    headline: '작은 씨앗도 싹틔워 열매로 거두는 비옥한 땅의 명식입니다',
    body: '실속 없는 명분보다 눈에 보이는 결과를 챙길 줄 압니다. 주변 사람의 감정을 잘 받아주는 대신, 정작 내 속마음은 잘 내보이지 않습니다.',
  },
  경금: {
    headline: '단단한 원석을 다듬어 제 쓰임을 만드는 무쇠와 같은 명식입니다',
    body: '애매한 타협보다 분명한 흑백과 의리를 중요하게 생각합니다. 큰 고비를 한 번 넘길 때마다 사람 자체가 한 단계 단단해집니다.',
  },
  신금: {
    headline: '티끌을 가려내고 가치를 빛내는 예리한 보석의 명식입니다',
    body: '감각과 자존심이 섬세해 어설픈 일 처리나 무례한 태도를 견디지 못합니다. 스스로 납득한 분야에서는 누구도 흉내 낼 수 없는 완성도를 보여줍니다.',
  },
  임수: {
    headline: '모든 물을 받아들이며 멀리 흘러가는 큰 바다의 명식입니다',
    body: '스케일이 크고 임기응변에 능해 작은 틀 안에 가두면 빛이 바랩니다. 여러 갈래의 사람과 정보를 엮어 큰 판을 굴릴 때 가장 강합니다.',
  },
  계수: {
    headline: '메마른 땅을 적시는 단비처럼 눈치가 빠르고 생각이 깊은 명식입니다',
    body: '남들이 놓치는 작은 틈과 속마음을 한눈에 읽어냅니다. 조용히 판을 읽다가 결정적인 한 수를 두는 데 탁월합니다.',
  },
};

const MBTI_NATURAL_NOTE: Record<string, string> = {
  NT: '머릿속으로 앞뒤 계산과 구조를 빠르게 짚어내는 편이라, 감정에 흔들리지 않는 일에서는 두각을 드러내지만 가까운 관계에서는 말이 차갑게 들릴 때가 있습니다.',
  NF: '상대방의 표정과 말투 변화에 유독 민감하게 반응하다 보니, 남을 챙기느라 정작 본인의 몫과 컨디션을 뒤로 미루기 쉽습니다.',
  SJ: '약속과 책임을 허투루 넘기지 못해 주변의 신뢰는 두텁지만, 새로운 기회가 와도 검증된 길만 고집하다 반 박자 늦게 움직이곤 합니다.',
  SP: '분위기와 현장 감각을 읽는 속도가 빨라 순발력이 좋지만, 꾸준히 쌓아 올려야 하는 재물 관리나 루틴에서 기복이 생기기 쉽습니다.',
};

function getMbtiGroupKey(mbti?: string): keyof typeof MBTI_NATURAL_NOTE | null {
  const upper = (mbti || '').trim().toUpperCase();
  if (upper.length !== 4) return null;
  if (upper.includes('NT')) return 'NT';
  if (upper.includes('NF')) return 'NF';
  if (upper[1] === 'S' && upper[3] === 'J') return 'SJ';
  if (upper[1] === 'S' && upper[3] === 'P') return 'SP';
  return null;
}

const FreeSajuPreviewCard: React.FC<FreeSajuPreviewCardProps> = ({
  saju,
  mbti,
  userName,
  isPaying = false,
  onUnlockClick,
  onTodayFortuneClick,
}) => {
  const cleanName = userName?.trim() || '';
  const hasMbti = Boolean(mbti && mbti.trim());
  const cleanMbti = hasMbti ? mbti!.trim().toUpperCase() : '';
  const elementKeys = ['wood', 'fire', 'earth', 'metal', 'water'] as const;

  const sortedElements = [...elementKeys].sort(
    (a, b) => (saju.elementRatio[b] || 0) - (saju.elementRatio[a] || 0)
  );
  const dominantKey = sortedElements[0] || 'wood';
  const lackingKey = sortedElements[sortedElements.length - 1] || 'water';
  const dominantMeta = ELEMENT_COPY[dominantKey];
  const lackingMeta = ELEMENT_COPY[lackingKey];

  const dayPillarText = `${saju.ganZhi.day}일주`;
  const dayMasterTitle = `${saju.dayMaster.korean}(${saju.dayMaster.chinese})`;
  const lead = DAY_MASTER_LEAD[saju.dayMaster.korean] || {
    headline: `${dayMasterTitle} 일간의 기운을 중심에 둔 명식입니다`,
    body: `${dominantMeta.naturePhrase}이 두드러지며, 스스로 납득한 방향일 때 큰 집중력을 발휘합니다.`,
  };

  const mbtiGroupKey = getMbtiGroupKey(cleanMbti);
  const mbtiNote = mbtiGroupKey ? MBTI_NATURAL_NOTE[mbtiGroupKey] : null;

  return (
    <div className="space-y-6 text-left">
      {/* 1. 한지/상담서 톤의 명식 요약 헤더 (AI 그라데이션·네온·스텝 배지 제거) */}
      <div className="bg-[#FAF7F0] border border-[#E6DFD1] rounded-2xl p-6 sm:p-7 space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2 pb-3 border-b border-[#E6DFD1]/80">
          <span className="text-xs font-semibold text-stone-600">
            {cleanName ? `${cleanName}님의 사주 명식` : '타고난 사주 명식'}
          </span>
          <span className="text-xs font-bold text-stone-800">
            {dayPillarText}, {dayMasterTitle} 일간
            {hasMbti ? `, ${cleanMbti}` : ''}
          </span>
        </div>

        <h4
          className="text-xl sm:text-[23px] font-bold text-[#1A1917] leading-snug tracking-tight"
          style={{ fontFamily: "'NanumMyungjo', 'Noto Serif KR', serif" }}
        >
          {lead.headline}
        </h4>

        <p className="text-sm text-stone-700 leading-relaxed">
          {lead.body}
        </p>
      </div>

      {/* 2. 정통 만세력 4주 8자 원국표 */}
      <div className="space-y-2.5">
        <div className="flex items-baseline justify-between px-0.5">
          <h5 className="text-sm font-bold text-stone-900">
            만세력 사주 원국표 (4주 8자)
          </h5>
          <span className="text-xs text-stone-500">십성 / 지장간 / 12운성 포함</span>
        </div>
        <div className="[&>div]:!mb-0">
          <SajuGrid saju={saju} />
        </div>
      </div>

      {/* 3. 오행 에너지 균형표 */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-sm font-bold text-stone-900">오행 균형</span>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className={`px-2.5 py-0.5 rounded-full border font-semibold ${dominantMeta.pillClass}`}>
              강한 기운: {dominantMeta.label}({dominantMeta.hanja}) {saju.elementRatio[dominantKey]}%
            </span>
            <span className="px-2.5 py-0.5 rounded-full border bg-stone-50 text-stone-600 border-stone-200 font-semibold">
              부족한 기운: {lackingMeta.label}({lackingMeta.hanja}) {saju.elementRatio[lackingKey]}%
            </span>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {elementKeys.map((key) => {
            const meta = ELEMENT_COPY[key];
            const pct = saju.elementRatio[key] || 0;
            const count = saju.elements[key] || 0;
            return (
              <div key={key} className="bg-stone-50/80 rounded-xl p-2.5 text-center border border-stone-200/70">
                <div className="text-xs font-bold text-stone-800">
                  {meta.label}({meta.hanja})
                </div>
                <div className="text-[11px] font-semibold text-stone-500 mt-0.5">
                  {count}자 ({pct}%)
                </div>
                <div className="w-full bg-stone-200/80 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className={`${meta.barColor} h-full rounded-full transition-all duration-500`}
                    style={{ width: `${Math.max(pct, 6)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. 상담 노트 형식의 도입 풀이 + 자연스럽게 끊기는 지점 */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="p-6 pb-2 relative">
          <h5 className="text-base sm:text-lg font-bold text-stone-900 mb-3">
            명식으로 먼저 짚어보는 기본 성향
          </h5>

          <div className="space-y-3.5 text-[15px] text-stone-700 leading-[1.8]">
            <p>
              전체 사주에서 {dominantMeta.label}({dominantMeta.hanja}) 기운이 {saju.elementRatio[dominantKey]}%로 가장 먼저 힘을 씁니다. 평소 {dominantMeta.naturePhrase}이 잘 드러나는 편이지만, {dominantMeta.excessPattern}.
            </p>

            {mbtiNote && (
              <p>
                여기에 {cleanMbti} 성향까지 더해지면 {mbtiNote}
              </p>
            )}

            {/* 끊겨있는 분석 문장 + 자연스러운 페이드아웃 */}
            <div className="relative pt-1">
              <p className="text-stone-800 font-medium">
                반대로 원국에서 비어 있거나 약한 {lackingMeta.label}({lackingMeta.hanja}) 기운({saju.elementRatio[lackingKey]}%) 때문에, {lackingMeta.missingCue}에는 일과 관계가 한꺼번에 꼬이는 느낌이 들 수 있습니다. 특히 올해 하반기와 내년으로 넘어가는 갈림길에서 재물이 붙기 시작하는 달과 반대로 꼭 피해야 할 인연의 특징은...
              </p>
              <div
                aria-hidden="true"
                className="pointer-events-none h-16 -mt-12 relative z-10 bg-gradient-to-b from-transparent via-white/85 to-white"
              />
            </div>
          </div>
        </div>

        {/* 분석 더보기 결제 이동 */}
        <div className="px-6 pb-6 pt-3 border-t border-stone-100 bg-[#FAF7F0]/50 text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-stone-700">
            <Lock className="w-3.5 h-3.5 text-stone-500" />
            <span>이어지는 {new Date().getFullYear()}년 월별 흐름, 재물, 연애, 주의할 점 전체 풀이</span>
          </div>

          <button
            type="button"
            onClick={onUnlockClick}
            disabled={isPaying}
            className="w-full py-4 px-6 bg-slate-950 hover:bg-indigo-950 text-white rounded-xl font-bold text-sm sm:text-base transition-colors disabled:opacity-60"
          >
            {isPaying
              ? '결제 창으로 이동하고 있습니다...'
              : `분석 더보기 (${SERVICE_COSTS.MBTI_SAJU.toLocaleString()}원)`}
          </button>

          <p className="text-xs text-stone-500">
            회원가입 없이 1회 결제 후 바로 전체 리포트가 열립니다.
          </p>

          {onTodayFortuneClick && (
            <div className="pt-1">
              <button
                type="button"
                onClick={onTodayFortuneClick}
                className="text-xs font-semibold text-stone-600 hover:text-slate-950 underline underline-offset-4"
              >
                오늘의 운세만 무료로 먼저 보기
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FreeSajuPreviewCard;
