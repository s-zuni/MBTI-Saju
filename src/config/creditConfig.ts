// 건당 단품 과금 가격 설정 (회원가입·크레딧 폐지)

export interface CreditPackage {
  id: string;
  credits: number;
  originalPrice: number;
  price: number;
  isDiscount: boolean;
}

/** @deprecated 크레딧 제도 폐지 (기존 어드민 호환용 빈 배열/유지) */
export const COIN_PACKAGES: CreditPackage[] = [
  { id: 'credit_100', credits: 100, originalPrice: 15000, price: 12000, isDiscount: true },
  { id: 'credit_50', credits: 50, originalPrice: 10000, price: 6900, isDiscount: true },
  { id: 'credit_10', credits: 10, originalPrice: 3000, price: 1500, isDiscount: true }
];

// 심층 리포트 구매 고객 전용 이벤트 패키지 (기존 호환용)
export const EVENT_CREDIT_PACKAGE = {
  id: 'event_credit_500',
  credits: 500,
  price: 9900,
  originalPrice: 49000,
  eventType: 'deep_report_credit_500',
} as const;

// 운명 심층 상담 (유료 비동기 전문가 상담) 패키지
export const CONSULTATION_PACKAGES = {
  // 첫 구매: 19,900원 → 질문 3회권
  PACKAGE: {
    id: 'consultation_package_3',
    price: 19900,
    questions: 3,
    name: '운명 심층 상담 3회 패키지',
    description: '전문 상담사가 사주·MBTI를 바탕으로 24시간 내 답변',
  },
  // 추가 질문: 9,900원 → 1회
  EXTRA: {
    id: 'consultation_extra_question',
    price: 9900,
    questions: 1,
    name: '운명 심층 상담 1회 추가',
    description: '기존 패키지 소진 후 추가 질문 1회',
  },
} as const;

/**
 * 서비스별 건당 이용 요금 (KRW 원)
 * - 사주, 자미두수 계열: 990원
 * - 나머지 운세 서비스(오늘/내일 운세, 타로, 여행, KBO 등): 490원
 */
export const SERVICE_COSTS = {
  FORTUNE_TODAY: 490,
  FORTUNE_TOMORROW: 490,
  MBTI_SAJU: 990,
  COMPATIBILITY_TRIP: 490,
  COMPATIBILITY: 990,
  TRIP: 490,
  JAMIDUSU: 990,
  KBO: 490,
  RELATIONSHIP_ADD: 490,
  AI_CHAT_5: 490,
  TAROT: 490,
  REGENERATE_MBTI_SAJU: 990,
  GOLD_WEALTH: 990,
  GOLD_BUSINESS: 990,
  GOLD_JOB: 990,
  GOLD_JOBCHANGE: 990,
  LOVE_COUPLE: 990,
  LOVE_MARRIED: 990,
  LOVE_MARRIAGE: 990,
  LOVE_REUNION: 990,
  LOVE_CRUSH: 990
} as const;

export type ServiceType = keyof typeof SERVICE_COSTS;

export const REFUND_PERIOD_DAYS = 7;

// 서비스 이름 한글화
export const SERVICE_NAMES: Record<ServiceType, string> = {
  FORTUNE_TODAY: '오늘의 운세',
  FORTUNE_TOMORROW: '내일의 운세',
  MBTI_SAJU: 'MBTI & 사주 분석',
  COMPATIBILITY_TRIP: '궁합여행',
  COMPATIBILITY: '심층 궁합',
  TRIP: '행운의 여행지 분석',
  JAMIDUSU: '자미두수 수호별 찾기',
  KBO: 'KBO 팬 궁합',
  RELATIONSHIP_ADD: '인연 추가',
  AI_CHAT_5: 'AI 운명 상담',
  TAROT: '신비타로',
  REGENERATE_MBTI_SAJU: 'MBTI & 사주 분석',
  GOLD_WEALTH: '내 재물운 보기',
  GOLD_BUSINESS: '창업 및 사업 사주',
  GOLD_JOB: '취직 사주',
  GOLD_JOBCHANGE: '이직 사주',
  LOVE_COUPLE: '연인 궁합 사주',
  LOVE_MARRIED: '부부 궁합 사주',
  LOVE_MARRIAGE: '결혼 궁합 사주',
  LOVE_REUNION: '재회 사주',
  LOVE_CRUSH: '짝사랑 사주'
};

export function getServicePrice(serviceType: ServiceType | string): number {
  if (serviceType in SERVICE_COSTS) {
    return SERVICE_COSTS[serviceType as ServiceType];
  }
  const upper = String(serviceType).toUpperCase();
  if (upper.includes('SAJU') || upper.includes('JAMIDUSU') || upper.includes('GOLD') || upper.includes('LOVE') || upper.includes('COMPATIBILITY')) {
    return 990;
  }
  return 490;
}

export function formatServicePrice(serviceType: ServiceType | string): string {
  return `${getServicePrice(serviceType).toLocaleString()}원`;
}
