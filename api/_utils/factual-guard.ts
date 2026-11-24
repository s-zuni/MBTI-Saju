import type { PreciseSajuData } from '../types';

/**
 * 결정론적 사실 데이터(MBTI · 사주 원국 · 오행 개수 · 현재 연도) 앵커링 및
 * 스트리밍 응답 실시간 사실 검증·교정 모듈.
 *
 * 목적:
 * 1. 사용자가 ENTP로 입력했는데 LLM이 중간에 INTP/INFP 등으로 잘못 표기하는 환각 차단
 * 2. 사주 일간·일주·오행 개수(특히 0개 결핍·과다)를 프롬프트 앞/뒤에서 명시 고정
 * 3. 청크 경계를 넘어 쪼개진 4글자 MBTI 코드나 과거 연도("올해 2024년")까지 실시간 교정
 */

export const ALL_MBTI_TYPES = [
  'ISTJ', 'ISFJ', 'INFJ', 'INTJ',
  'ISTP', 'ISFP', 'INFP', 'INTP',
  'ESTP', 'ESFP', 'ENFP', 'ENTP',
  'ESTJ', 'ESFJ', 'ENFJ', 'ENTJ',
] as const;

export type ValidMbti = (typeof ALL_MBTI_TYPES)[number];

const MBTI_SET = new Set<string>(ALL_MBTI_TYPES);

export interface MbtiStackInfo {
  code: ValidMbti;
  axesKo: string;
  dominant: string;
  auxiliary: string;
  tertiary: string;
  inferior: string;
  antiConfusion: string;
}

export const MBTI_STACKS: Record<ValidMbti, MbtiStackInfo> = {
  ISTJ: {
    code: 'ISTJ',
    axesKo: '내향(I) · 감각(S) · 사고(T) · 판단(J)',
    dominant: '내향 감각(Si) — 검증된 경험과 데이터 축적, 디테일 기억',
    auxiliary: '외향 사고(Te) — 체계적 실행, 객관적 기준과 효율 관리',
    tertiary: '내향 감정(Fi)',
    inferior: '외향 직관(Ne)',
    antiConfusion: 'ESTJ·ISFJ·INTJ와 혼동 금지',
  },
  ISFJ: {
    code: 'ISFJ',
    axesKo: '내향(I) · 감각(S) · 감정(F) · 판단(J)',
    dominant: '내향 감각(Si) — 세심한 기억력, 안정과 책임 유지',
    auxiliary: '외향 감정(Fe) — 타인의 감정 배려, 관계 조화 추구',
    tertiary: '내향 사고(Ti)',
    inferior: '외향 직관(Ne)',
    antiConfusion: 'ESFJ·ISTJ·INFJ와 혼동 금지',
  },
  INFJ: {
    code: 'INFJ',
    axesKo: '내향(I) · 직관(N) · 감정(F) · 판단(J)',
    dominant: '내향 직관(Ni) — 본질 통찰, 장기적 흐름과 패턴 예측',
    auxiliary: '외향 감정(Fe) — 타인의 심리 공감, 관계의 의미 조율',
    tertiary: '내향 사고(Ti)',
    inferior: '외향 감각(Se)',
    antiConfusion: 'INFP·ENFJ·INTJ와 혼동 금지',
  },
  INTJ: {
    code: 'INTJ',
    axesKo: '내향(I) · 직관(N) · 사고(T) · 판단(J)',
    dominant: '내향 직관(Ni) — 거시적 비전, 장기 구조 설계',
    auxiliary: '외향 사고(Te) — 냉철한 실행 전략, 효율 최적화',
    tertiary: '내향 감정(Fi)',
    inferior: '외향 감각(Se)',
    antiConfusion: 'ENTJ·INTP·INFJ와 혼동 금지',
  },
  ISTP: {
    code: 'ISTP',
    axesKo: '내향(I) · 감각(S) · 사고(T) · 인식(P)',
    dominant: '내향 사고(Ti) — 원리 파악, 냉정한 문제 해결',
    auxiliary: '외향 감각(Se) — 현장 순발력, 즉각적 현실 대응',
    tertiary: '내향 직관(Ni)',
    inferior: '외향 감정(Fe)',
    antiConfusion: 'ESTP·INTP·ISFP와 혼동 금지',
  },
  ISFP: {
    code: 'ISFP',
    axesKo: '내향(I) · 감각(S) · 감정(F) · 인식(P)',
    dominant: '내향 감정(Fi) — 확고한 개인 취향과 진정성 기준',
    auxiliary: '외향 감각(Se) — 현재 순간의 감각과 심미적 표현',
    tertiary: '내향 직관(Ni)',
    inferior: '외향 사고(Te)',
    antiConfusion: 'INFP·ESFP·ISTP와 혼동 금지',
  },
  INFP: {
    code: 'INFP',
    axesKo: '내향(I) · 직관(N) · 감정(F) · 인식(P)',
    dominant: '내향 감정(Fi) — 깊은 내면 가치관과 진정성 탐색',
    auxiliary: '외향 직관(Ne) — 가능성과 의미의 확장, 상상력',
    tertiary: '내향 감각(Si)',
    inferior: '외향 사고(Te)',
    antiConfusion: 'ENFP·INFJ·ISFP·INTP와 혼동 금지',
  },
  INTP: {
    code: 'INTP',
    axesKo: '내향(I) · 직관(N) · 사고(T) · 인식(P)',
    dominant: '내향 사고(Ti) — 정교한 내적 논리 체계와 개념 검증',
    auxiliary: '외향 직관(Ne) — 다양한 가설 탐색과 지적 호기심',
    tertiary: '내향 감각(Si)',
    inferior: '외향 감정(Fe)',
    antiConfusion: 'ENTP·INTJ·ISTP와 혼동 금지',
  },
  ESTP: {
    code: 'ESTP',
    axesKo: '외향(E) · 감각(S) · 사고(T) · 인식(P)',
    dominant: '외향 감각(Se) — 즉각적 기회 포착, 현장 돌파력',
    auxiliary: '내향 사고(Ti) — 빠른 손익 계산과 현실 판단',
    tertiary: '외향 감정(Fe)',
    inferior: '내향 직관(Ni)',
    antiConfusion: 'ISTP·ENTP·ESFP와 혼동 금지',
  },
  ESFP: {
    code: 'ESFP',
    axesKo: '외향(E) · 감각(S) · 감정(F) · 인식(P)',
    dominant: '외향 감각(Se) — 생동감 있는 현장 감각과 실행력',
    auxiliary: '내향 감정(Fi) — 솔직한 감정 표현과 개인적 호불호',
    tertiary: '외향 사고(Te)',
    inferior: '내향 직관(Ni)',
    antiConfusion: 'ISFP·ENFP·ESTP와 혼동 금지',
  },
  ENFP: {
    code: 'ENFP',
    axesKo: '외향(E) · 직관(N) · 감정(F) · 인식(P)',
    dominant: '외향 직관(Ne) — 사람과 아이디어에서 가능성 발산',
    auxiliary: '내향 감정(Fi) — 진정성과 공감을 바탕으로 한 선택',
    tertiary: '외향 사고(Te)',
    inferior: '내향 감각(Si)',
    antiConfusion: 'INFP·ENTP·ESFP와 혼동 금지',
  },
  ENTP: {
    code: 'ENTP',
    axesKo: '외향(E) · 직관(N) · 사고(T) · 인식(P)',
    dominant: '외향 직관(Ne) — 판을 흔드는 발상, 가능성 확장, 토론·기획 추진',
    auxiliary: '내향 사고(Ti) — 구조적 모순 분석, 냉철한 논리 검증',
    tertiary: '외향 감정(Fe)',
    inferior: '내향 감각(Si)',
    antiConfusion: '외향(E) 유형이므로 내향(I)인 INTP·INTJ·INFP 및 ENFP·ENTJ와 절대 혼동 금지',
  },
  ESTJ: {
    code: 'ESTJ',
    axesKo: '외향(E) · 감각(S) · 사고(T) · 판단(J)',
    dominant: '외향 사고(Te) — 명확한 기준, 조직 운영과 목표 완수',
    auxiliary: '내향 감각(Si) — 검증된 절차와 책임감 있는 관리',
    tertiary: '외향 직관(Ne)',
    inferior: '내향 감정(Fi)',
    antiConfusion: 'ISTJ·ENTJ·ESFJ와 혼동 금지',
  },
  ESFJ: {
    code: 'ESFJ',
    axesKo: '외향(E) · 감각(S) · 감정(F) · 판단(J)',
    dominant: '외향 감정(Fe) — 공동체 화합, 관계 관리와 실질적 배려',
    auxiliary: '내향 감각(Si) — 익숙한 신뢰 관계와 약속의 지속성',
    tertiary: '외향 직관(Ne)',
    inferior: '내향 사고(Ti)',
    antiConfusion: 'ISFJ·ENFJ·ESTJ와 혼동 금지',
  },
  ENFJ: {
    code: 'ENFJ',
    axesKo: '외향(E) · 직관(N) · 감정(F) · 판단(J)',
    dominant: '외향 감정(Fe) — 타인의 성장 촉진, 관계 리더십과 공감',
    auxiliary: '내향 직관(Ni) — 사람과 상황의 장기 방향 통찰',
    tertiary: '외향 감각(Se)',
    inferior: '내향 사고(Ti)',
    antiConfusion: 'INFJ·ENFP·ENTJ와 혼동 금지',
  },
  ENTJ: {
    code: 'ENTJ',
    axesKo: '외향(E) · 직관(N) · 사고(T) · 판단(J)',
    dominant: '외향 사고(Te) — 전략적 결단, 목표 달성과 시스템 구축',
    auxiliary: '내향 직관(Ni) — 장기 판세 예측과 핵심 본질 집중',
    tertiary: '외향 감각(Se)',
    inferior: '내향 감정(Fi)',
    antiConfusion: 'INTJ·ENTP·ESTJ와 혼동 금지',
  },
};

export function normalizeValidMbti(mbti?: string | null): ValidMbti | null {
  if (!mbti || typeof mbti !== 'string') return null;
  const cleaned = mbti.trim().toUpperCase();
  if (MBTI_SET.has(cleaned)) {
    return cleaned as ValidMbti;
  }
  return null;
}

function summarizeSajuFacts(saju: PreciseSajuData, labelPrefix = '내담자'): string {
  const e = saju.elements;
  const r = saju.elementRatio;
  const total = e.wood + e.fire + e.earth + e.metal + e.water;
  const elMeta = [
    { name: '목(木)', count: e.wood, ratio: r.wood },
    { name: '화(火)', count: e.fire, ratio: r.fire },
    { name: '토(土)', count: e.earth, ratio: r.earth },
    { name: '금(金)', count: e.metal, ratio: r.metal },
    { name: '수(水)', count: e.water, ratio: r.water },
  ];
  const zeroList = elMeta.filter((x) => x.count === 0).map((x) => x.name);
  const maxCount = Math.max(...elMeta.map((x) => x.count));
  const dominantList = elMeta.filter((x) => x.count === maxCount && x.count > 0).map((x) => `${x.name} ${x.count}개`);

  return [
    `- ${labelPrefix} 일간(日干): ${saju.dayMaster.korean}(${saju.dayMaster.chinese})`,
    `- ${labelPrefix} 일주(日柱): ${saju.ganZhi.day}(${saju.ganZhiHanja.day}) / 4주 원국: 년주 ${saju.ganZhi.year}(${saju.ganZhiHanja.year}), 월주 ${saju.ganZhi.month}(${saju.ganZhiHanja.month}), 일주 ${saju.ganZhi.day}(${saju.ganZhiHanja.day}), 시주 ${saju.ganZhi.hour}(${saju.ganZhiHanja.hour})`,
    `- ${labelPrefix} 오행 개수(총 ${total}자, 1개도 틀리지 말 것): 목(木) ${e.wood}개(${r.wood}%), 화(火) ${e.fire}개(${r.fire}%), 토(土) ${e.earth}개(${r.earth}%), 금(金) ${e.metal}개(${r.metal}%), 수(水) ${e.water}개(${r.water}%)`,
    `- ${labelPrefix} 최다 오행: ${dominantList.join(', ')} / 결핍(0개) 오행: ${zeroList.length > 0 ? zeroList.join(', ') : '없음(5행 모두 존재)'}`,
  ].join('\n');
}

function summarizeMbtiFacts(mbti: ValidMbti | null, labelPrefix = '내담자', forbidOtherCodes = true): string {
  if (!mbti) {
    return [
      `- ${labelPrefix} MBTI: 선택 안 함 (미입력)`,
      `- [절대 금지] MBTI를 입력하지 않았으므로 본문 어디에도 임의의 MBTI 4글자 코드(ENTP, INTP, INFP 등)를 적지 말고, "정보 없음/미입력" 같은 기계적 문구도 쓰지 마십시오. 오직 사주 원국 기질로만 서술하십시오.`,
    ].join('\n');
  }
  const stack = MBTI_STACKS[mbti];
  const lines = [
    `- ${labelPrefix} MBTI (100% 고정 사실): ${stack.code} [${stack.axesKo}]`,
    `  * 주기능: ${stack.dominant}`,
    `  * 부기능: ${stack.auxiliary}`,
    `  * 3차/열등기능: ${stack.tertiary} / ${stack.inferior}`,
    `  * 혼동 방지: ${stack.antiConfusion}`,
  ];
  if (forbidOtherCodes) {
    lines.push(
      `- [절대 금지] 본 리포트에서 ${labelPrefix}의 MBTI는 처음부터 끝까지 오직 ${stack.code}만 표기하십시오. 다른 15개 MBTI 4글자 코드(예: INTP, INFP, ENFP, ENTJ 등)는 비교·예시·동행 추천 용도로도 본문에 절대 적지 마십시오. (타인의 성향을 언급할 때는 4글자 코드 대신 "차분하고 계획적인 사람"처럼 한국어 형용사로 표현하십시오.)`
    );
  }
  return lines.join('\n');
}

/**
 * 단일 사용자 분석용 사실 데이터 고정 앵커 블록.
 * 프롬프트 맨 끝(recency 위치)에 배치해 긴 생성 도중 MBTI·오행 드리프트를 차단한다.
 */
export function buildSingleFactualLockBlock(params: {
  saju?: PreciseSajuData | null;
  mbti?: string | null;
  name?: string | null;
}): string {
  const validMbti = normalizeValidMbti(params.mbti);
  const label = params.name?.trim() ? `${params.name.trim()}님` : '내담자';
  const sections: string[] = [
    '[사실 데이터 절대 고정 검증표 — 본문 전체에서 단 1건의 오표기도 금지]',
  ];
  sections.push(summarizeMbtiFacts(validMbti, label, true));
  if (params.saju) {
    sections.push(summarizeSajuFacts(params.saju, label));
  }
  sections.push(
    '- 작성 완료 전 스스로 확인: (1) 일간·일주·오행 개수(특히 0개인 결핍 오행과 실제 개수가 일치하는가), (2) MBTI 4글자가 중간에 다른 유형으로 바뀌지 않았는가, (3) 올해 연도가 현재 KST 연도인가.'
  );
  return sections.join('\n');
}

/**
 * 두 사람(궁합/연애 사주) 분석용 사실 데이터 고정 앵커 블록.
 */
export function buildPairFactualLockBlock(params: {
  mySaju: PreciseSajuData;
  myMbti?: string | null;
  myName?: string | null;
  partnerSaju?: PreciseSajuData | null;
  partnerMbti?: string | null;
  partnerName?: string | null;
}): string {
  const validMyMbti = normalizeValidMbti(params.myMbti);
  const validPartnerMbti = normalizeValidMbti(params.partnerMbti);
  const myLabel = params.myName?.trim() ? `본인(${params.myName.trim()})` : '본인(A)';
  const partnerLabel = params.partnerName?.trim() ? `상대방(${params.partnerName.trim()})` : '상대방(B)';

  const allowedList = [validMyMbti, validPartnerMbti].filter((v): v is ValidMbti => Boolean(v));
  const sections: string[] = [
    '[사실 데이터 절대 고정 검증표 — A와 B의 사주·MBTI를 절대 뒤바꾸거나 제3의 유형으로 변조 금지]',
    summarizeMbtiFacts(validMyMbti, myLabel, false),
    summarizeSajuFacts(params.mySaju, myLabel),
  ];

  if (params.partnerSaju) {
    sections.push(summarizeMbtiFacts(validPartnerMbti, partnerLabel, false));
    sections.push(summarizeSajuFacts(params.partnerSaju, partnerLabel));
  }

  if (allowedList.length > 0) {
    sections.push(
      `- [MBTI 4글자 표기 제한] 본문에는 오직 입력된 유형(${Array.from(new Set(allowedList)).join(', ')})만 표기하고, 두 사람 중 누구의 MBTI도 다른 4글자 코드로 잘못 바꾸지 마십시오.`
    );
  } else {
    sections.push(
      '- [MBTI 4글자 표기 제한] 두 사람 모두 MBTI가 미입력이므로 임의의 MBTI 4글자 코드를 지어내지 말고 사주 기질 중심으로만 서술하십시오.'
    );
  }

  return sections.join('\n');
}

const ANY_MBTI_RE = /(?<![A-Za-z])(ISTJ|ISFJ|INFJ|INTJ|ISTP|ISFP|INFP|INTP|ESTP|ESFP|ENFP|ENTP|ESTJ|ESFJ|ENFJ|ENTJ)(?![A-Za-z])/g;
const PAST_CURRENT_YEAR_RE = /(올해\s*)202[345]년/g;
const PAST_YEAR_FORTUNE_RE = /202[345]년(\s*(?:병오년|운세|상반기|하반기|에는|은|의\s*운세|기준))/g;

export interface FactualGuardOptions {
  /** 단일 사용자 모드에서 확정된 MBTI (예: 'ENTP'). 설정 시 다른 15개 MBTI 코드 오출력을 자동 교정 */
  expectedSingleMbti?: string | null;
  /** 현재 연도 (기본 KST 현재 연도) */
  currentYear?: number;
}

/**
 * 단일 텍스트 문자열에 대한 결정론적 사실 교정기.
 * - JSON 구조를 깨뜨리지 않도록 따옴표/백슬래시를 건드리지 않는 순수 문자열 치환만 수행.
 */
export function sanitizeFactualText(text: string, options: FactualGuardOptions): string {
  if (!text) return text;
  let out = text;

  const expectedMbti = normalizeValidMbti(options.expectedSingleMbti);
  if (expectedMbti) {
    out = out.replace(ANY_MBTI_RE, (matched) => {
      if (matched !== expectedMbti) {
        console.warn(`[factual-guard] Auto-corrected drifted MBTI: ${matched} -> ${expectedMbti}`);
        return expectedMbti;
      }
      return matched;
    });
  }

  const targetYear = options.currentYear || new Date(Date.now() + 9 * 60 * 60 * 1000).getUTCFullYear();
  out = out.replace(PAST_CURRENT_YEAR_RE, `$1${targetYear}년`);
  out = out.replace(PAST_YEAR_FORTUNE_RE, `${targetYear}년$1`);

  return out;
}

/**
 * 청크 경계에 걸쳐 쪼개진 토큰(예: "IN" + "TP", "202" + "4년")도 누락 없이
 * 실시간 교정하는 Web Streams TransformStream.
 * JSON 텍스트 스트림과 일반 채팅 텍스트 스트림 모두에 안전하게 적용 가능하다.
 */
export function createFactualStreamGuard(options: FactualGuardOptions): TransformStream<Uint8Array, Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  const OVERLAP = 20;
  let carry = '';

  return new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      const decoded = decoder.decode(chunk, { stream: true });
      if (!decoded) return;
      const combined = carry + decoded;
      if (combined.length <= OVERLAP) {
        carry = combined;
        return;
      }
      const sanitized = sanitizeFactualText(combined, options);
      const flushLen = sanitized.length - OVERLAP;
      if (flushLen > 0) {
        controller.enqueue(encoder.encode(sanitized.slice(0, flushLen)));
        carry = sanitized.slice(flushLen);
      } else {
        carry = sanitized;
      }
    },
    flush(controller) {
      const tail = carry + decoder.decode();
      if (tail) {
        const sanitized = sanitizeFactualText(tail, options);
        controller.enqueue(encoder.encode(sanitized));
      }
      carry = '';
    },
  });
}

/**
 * 기존 Response의 스트림 본문에 createFactualStreamGuard를 투명하게 연결한다.
 */
export function wrapResponseWithFactualGuard(response: Response, options: FactualGuardOptions): Response {
  if (!response.body) return response;
  const guardedBody = response.body.pipeThrough(createFactualStreamGuard(options));
  return new Response(guardedBody, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}
