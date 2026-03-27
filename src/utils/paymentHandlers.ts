import { loadTossPayments } from '@tosspayments/tosspayments-sdk';

export interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    image_url: string;
    type: 'digital' | 'physical';
    content_url?: string;
}

export interface TossPaymentConfig {
    name: string;
    amount: number;
    orderId: string;
    customerKey: string; // V2 필수값 (Sanitized user id 또는 ANONYMOUS)
    customerName?: string;
    customerEmail?: string;
    metadata?: Record<string, any>;
    successUrl?: string;
    failUrl?: string;
}

export interface PaymentResponse {
    success: boolean;
    paymentKey?: string;
    orderId?: string;
    amount?: number;
    error_msg?: string;
}

// Toss Payments Client Key (Test/Live)
// 기본 테스트 키를 보다 범용적인 키로 변경 (Toss 공식 문서 기준)
const CLIENT_KEY = process.env.REACT_APP_TOSS_CLIENT_KEY || 'test_ck_mBZ1gQ4YVXbxv27PnmDqrLW2K0np';

if (!process.env.REACT_APP_TOSS_CLIENT_KEY) {
    console.warn('Toss Payments: REACT_APP_TOSS_CLIENT_KEY 환경 변수가 없습니다. 테스트 키를 사용합니다.');
}

/**
 * 토스페이먼츠 결제창 호출 (V2 SDK)
 */
export const requestPayment = async (config: TossPaymentConfig): Promise<PaymentResponse> => {
    try {
        console.log('결제 요청 시작 (Direct):', {
            name: config.name,
            amount: config.amount,
        });

        // Safari 대응: 로딩 타임아웃 추가
        const loadPromise = loadTossPayments(CLIENT_KEY);
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('결제 모듈을 불러오는 데 실패했습니다(타임아웃).')), 15000)
        );

        const tossPayments = await Promise.race([loadPromise, timeoutPromise]) as any;

        // V2 SDK 인스턴스 생성
        const payment = tossPayments.payment({
            customerKey: config.customerKey || 'ANONYMOUS',
        });

        // 결제 요청 (v2 규격)
        // Safari 특성상 팝업 차단이 발생할 수 있으므로, 비동기 호출 전 에러 핸들링 준비
        await payment.requestPayment({
            method: "CARD",
            amount: {
                currency: "KRW",
                value: config.amount,
            },
            orderId: config.orderId,
            orderName: config.name,
            successUrl: config.successUrl || `${window.location.origin}/payment/success`,
            failUrl: config.failUrl || `${window.location.origin}/payment/fail`,
            customerEmail: config.customerEmail,
            customerName: config.customerName,
            metadata: config.metadata,
            card: {
                flowMode: "DEFAULT",
                useCardPoint: false,
                useAppCardOnly: false,
            },
        } as any);

        return { success: true };
    } catch (error: any) {
        console.error('Toss Payments 상세 에러:', error);

        let errorMessage = "결제 준비 중 알 수 없는 오류가 발생했습니다.";
        if (error.message) {
            errorMessage = error.message;
        }
        
        if (error.code) {
            errorMessage = `[${error.code}] ${errorMessage}`;
        }

        // 구체적인 에러 메시지 반환하여 무한 로딩 방지 UI 트리거
        return {
            success: false,
            error_msg: errorMessage
        };
    }
};
