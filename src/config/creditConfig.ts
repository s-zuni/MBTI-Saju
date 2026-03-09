// 크레딧 서비스 비용 설정

export const SERVICE_COSTS = {
    FORTUNE_TODAY: 0,
    FORTUNE_TOMORROW: 3,
    MBTI_SAJU: 20,
    REGENERATE_MBTI_SAJU: 10,
    COMPATIBILITY_TRIP: 5,
    HEALING: 3,
    JOB: 3,
    RELATIONSHIP_ADD: 5,
    AI_CHAT_10: 25,
    TAROT: 2
} as const;

export type ServiceType = keyof typeof SERVICE_COSTS;

// 서비스 이름 한글화
export const SERVICE_NAMES: Record<ServiceType, string> = {
    FORTUNE_TODAY: '오늘의 운세',
    FORTUNE_TOMORROW: '내일의 운세',
    MBTI_SAJU: 'MBTI & 사주 분석',
    REGENERATE_MBTI_SAJU: '분석 데이터 재생성',
    COMPATIBILITY_TRIP: '궁합여행',
    HEALING: '힐링장소',
    JOB: '추천직업',
    RELATIONSHIP_ADD: '인연 추가',
    AI_CHAT_10: '심층 상담 (10회)',
    TAROT: '신비타로'
};

// 환불 및 유효 기간 설정 (토스페이먼츠 권고 사항 반영)
export const REFUND_PERIOD_DAYS = 7;
export const CREDIT_VALIDITY_YEARS = 1;
export const MAX_RECHARGE_AMOUNT = 100000; // 1회 충전 한도 10만원
