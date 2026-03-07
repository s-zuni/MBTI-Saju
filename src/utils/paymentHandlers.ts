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
}

export interface PaymentResponse {
    success: boolean;
    paymentKey?: string;
    orderId?: string;
    amount?: number;
    error_msg?: string;
}

// Toss Payments Client Key (Test/Live)
const CLIENT_KEY = process.env.REACT_APP_TOSS_CLIENT_KEY || 'test_ck_mE9mYv0zM899Anp9z6MrV4daE2Y5'; // Toss 공식 테스트 클라이언트 키

/**
 * 토스페이먼츠 결제창 호출
 */
export const requestPayment = async (config: TossPaymentConfig): Promise<PaymentResponse> => {
    try {
        const tossPayments = await loadTossPayments(CLIENT_KEY);

        // V2에서는 customerKey를 포함하여 payment 인스턴스를 생성합니다.
        const payment = tossPayments.payment({
            customerKey: config.customerKey,
        });

        // 결제 요청
        await payment.requestPayment({
            method: "CARD", // 카드 결제
            amount: {
                currency: "KRW",
                value: config.amount,
            },
            orderId: config.orderId,
            orderName: config.name,
            successUrl: `${window.location.origin}/payment/success`,
            failUrl: `${window.location.origin}/payment/fail`,
            customerEmail: config.customerEmail || '',
            customerName: config.customerName || '구매자',
        });

        return { success: true }; // 리다이렉트되므로 실제로는 사용되지 않음
    } catch (error: any) {
        console.error('Toss Payments Error:', error);
        return {
            success: false,
            error_msg: error.message || "결제 준비 중 오류가 발생했습니다."
        };
    }
};
