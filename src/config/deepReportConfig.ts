// 3개년 심층 리포트 상품 설정 (프런트/서버 공용 — api/payment.ts 도 이 값을 가져다 검증한다)

export const DEEP_REPORT_ORIGINAL_PRICE = 49000;
export const DEEP_REPORT_SALE_PRICE = 29000;

export const DEEP_REPORT_DISCOUNT_RATE = Math.round(
  ((DEEP_REPORT_ORIGINAL_PRICE - DEEP_REPORT_SALE_PRICE) / DEEP_REPORT_ORIGINAL_PRICE) * 100
);

export type DeepReportType = 'mbti_saju' | 'saju';

/** DB(deep_report_requests.report_type)에 저장되는 한글 상품명 */
export const DEEP_REPORT_TYPE_LABEL: Record<DeepReportType, string> = {
  mbti_saju: 'MBTI 사주 심층 리포트',
  saju: '사주 전용 심층 리포트',
};

export const formatWon = (n: number) => `${n.toLocaleString('ko-KR')}원`;
