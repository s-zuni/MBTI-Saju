// 카카오톡 채널 1:1 상담 설정.
// 가격·채널 주소·안내 문구는 이 파일 한 곳에서만 관리한다(프런트 카드, 관리자 접수 화면이 공유).

export const KAKAO_CHANNEL_CHAT_URL = 'https://pf.kakao.com/_xcdXJX/chat';

export type KakaoConsultProductId = 'single' | 'triple';

export interface KakaoConsultProduct {
    id: KakaoConsultProductId;
    name: string;
    price: number;
    questions: number;
}

export const KAKAO_CONSULT_PRODUCTS: Record<KakaoConsultProductId, KakaoConsultProduct> = {
    single: { id: 'single', name: '한 가지 고민 상담', price: 9900, questions: 1 },
    triple: { id: 'triple', name: '3문항 상담', price: 19900, questions: 3 },
};

export const KAKAO_CONSULT_RESPONSE_TEXT = '평일 기준 24시간 이내 답변';

// 입금 안내문에 들어갈 사업자 계좌. 예: '○○은행 000-000-000000 (예금주 스즈니)'
// 비워 두면 관리자 화면의 "입금 안내문 복사"가 계좌 자리를 빈칸 표시로 남긴다.
export const KAKAO_CONSULT_BANK_ACCOUNT = '토스뱅크 1002-4660-9969 (예금주 이승준)';

export const buildDepositGuide = (receiptCode: string, productId: KakaoConsultProductId): string => {
    const product = KAKAO_CONSULT_PRODUCTS[productId];
    return [
        `접수번호 ${receiptCode}`,
        KAKAO_CONSULT_BANK_ACCOUNT || '[계좌 정보를 입력하세요]',
        `금액 ${product.price.toLocaleString()}원 (${product.name})`,
        '입금자명은 본인 이름으로 부탁드려요.',
        `입금 확인 후 ${KAKAO_CONSULT_RESPONSE_TEXT}드립니다.`,
        '답변 발송 전에는 전액 환불, 발송 후에는 환불이 어렵습니다.',
        '현금영수증이 필요하시면 번호를 남겨주세요.',
    ].join('\n');
};
