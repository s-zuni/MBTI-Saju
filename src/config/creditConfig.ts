// 크레딧 서비스 비용 설정

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

// 환불 가능 기간 (일)
export const REFUND_PERIOD_DAYS = 7;
