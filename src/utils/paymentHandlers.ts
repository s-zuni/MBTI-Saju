declare global {
    interface Window {
        TossPayments: any;
    }
}

export interface TossPaymentConfig {
    name: string;
    amount: number;
    orderId: string;
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
    return new Promise(async (resolve) => {
        try {
            if (!window.TossPayments) {
                resolve({ success: false, error_msg: "Toss Payments SDK가 로드되지 않았습니다." });
                return;
            }

            const tossPayments = window.TossPayments.load(CLIENT_KEY);

            // 결제 요청 (v2 기준)
            // 결제창 방식 (Payment Window) - 카드 결제 예시
            await tossPayments.requestPayment('CARD', {
                amount: {
                    currency: 'KRW',
                    value: config.amount,
                },
                orderId: config.orderId,
                orderName: config.name,
                customerName: config.customerName || '구매자',
                customerEmail: config.customerEmail || '',
                successUrl: `${window.location.origin}/payment/success`,
                failUrl: `${window.location.origin}/payment/fail`,
            });

            // 결제창 호출 후에는 페이지가 리다이렉트되므로 resolve가 호출되지 않을 수 있음.
            // 하지만 비정상적인 중단 등을 고려하여 구조 유지.
        } catch (error: any) {
            console.error('Toss Payments Error:', error);
            resolve({
                success: false,
                error_msg: error.message || "결제 준비 중 오류가 발생했습니다."
            });
        }
    });
};
