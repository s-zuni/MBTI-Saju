// 크레딧 패키지 및 서비스 비용 설정

export interface CreditPackage {
  id: string;
  credits: number;
  originalPrice: number;
  price: number;
  isDiscount: boolean;
}

export const COIN_PACKAGES: CreditPackage[] = [
  { id: 'credit_100', credits: 100, originalPrice: 15000, price: 12000, isDiscount: true },
  { id: 'credit_50', credits: 50, originalPrice: 10000, price: 6900, isDiscount: true },
  { id: 'credit_10', credits: 10, originalPrice: 3000, price: 1500, isDiscount: true }
];

// 심층 리포트 구매 고객 전용 이벤트 패키지 (일반 웹 전용)
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


export const SERVICE_COSTS = {
  FORTUNE_TODAY: 0,
  FORTUNE_TOMORROW: 3,
  MBTI_SAJU: 20,
  COMPATIBILITY_TRIP: 5,
  COMPATIBILITY: 5,
  TRIP: 5,
  JAMIDUSU: 15,
  KBO: 5,
  RELATIONSHIP_ADD: 5,
  AI_CHAT_5: 20,
  TAROT: 2,
  REGENERATE_MBTI_SAJU: 10,
  GOLD_WEALTH: 5,
  GOLD_BUSINESS: 5,
  GOLD_JOB: 5,
  GOLD_JOBCHANGE: 5,
  LOVE_COUPLE: 5,
  LOVE_MARRIED: 5,
  LOVE_MARRIAGE: 5,
  LOVE_REUNION: 5,
  LOVE_CRUSH: 5
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
  TRIP: '여행지 추천',
  JAMIDUSU: '자미두수',
  KBO: 'KBO 프로야구 성향 분석',
  RELATIONSHIP_ADD: '인연 추가',
  AI_CHAT_5: '운명 심층 상담 (5회)',
  TAROT: '신비타로',
  REGENERATE_MBTI_SAJU: 'MBTI & 사주 재분석',
  GOLD_WEALTH: '내 재물운 보기',
  GOLD_BUSINESS: '창업 및 사업 사주',
  GOLD_JOB: '취직 사주',
  GOLD_JOBCHANGE: '이직 사주',
  LOVE_COUPLE: '연인 궁합',
  LOVE_MARRIED: '부부 궁합',
  LOVE_MARRIAGE: '결혼 궁합',
  LOVE_REUNION: '재회 사주',
  LOVE_CRUSH: '짝사랑 사주'
};
