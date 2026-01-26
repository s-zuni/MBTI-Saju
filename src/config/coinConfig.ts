// 코인 패키지 및 서비스 비용 설정

export interface CoinPackage {
  id: string;
  coins: number;
  originalPrice: number;
  price: number;
  isDiscount: boolean;
}

export const COIN_PACKAGES: CoinPackage[] = [
  { id: 'coin_100', coins: 100, originalPrice: 29000, price: 9900, isDiscount: true },
  { id: 'coin_50', coins: 50, originalPrice: 13900, price: 5900, isDiscount: true },
  { id: 'coin_10', coins: 10, originalPrice: 3900, price: 2900, isDiscount: true }
];

export const SERVICE_COSTS = {
  FORTUNE_TODAY: 0,
  FORTUNE_TOMORROW: 3,
  MBTI_SAJU: 20,
  COMPATIBILITY_TRIP: 5,
  HEALING: 3,
  JOB: 3,
  RELATIONSHIP_ADD: 5,
  AI_CHAT_10: 25,
  TAROT: 2
} as const;

export type ServiceType = keyof typeof SERVICE_COSTS;

// 할인 종료일 - 배포 후 설정 예정 (현재 null은 무제한 할인 의미)
export const DISCOUNT_END_DATE: string | null = null;

// 할인 남은 일수 계산 함수
export const getDiscountDaysRemaining = (): number | null => {
  if (!DISCOUNT_END_DATE) return null;
  const endDate = new Date(DISCOUNT_END_DATE);
  const today = new Date();
  const diffTime = endDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
};

// 서비스 이름 한글화
export const SERVICE_NAMES: Record<ServiceType, string> = {
  FORTUNE_TODAY: '오늘의 운세',
  FORTUNE_TOMORROW: '내일의 운세',
  MBTI_SAJU: 'MBTI & 사주 분석',
  COMPATIBILITY_TRIP: '궁합여행',
  HEALING: '힐링장소',
  JOB: '추천직업',
  RELATIONSHIP_ADD: '인연 추가',
  AI_CHAT_10: 'AI 상담 (10회)',
  TAROT: '신비타로'
};
