import { TossPaymentConfig, PaymentResponse } from './paymentHandlers';

/**
 * 일반 웹 환경 전용 결제 처리 (Toss Payments SDK)
 * 이 파일은 Apps In Toss 환경에서 로드되지 않도록 dynamic import로 사용해야 합니다.
 */
export const requestWebPayment = async (config: TossPaymentConfig, clientKey: string): Promise<PaymentResponse> => {
    try {
        console.log('일반 웹 결제 요청 시작 (Dynamic):', {
            name: config.name,
            amount: config.amount,
        });

        const { loadTossPayments } = await import('@tosspayments/tosspayments-sdk');
        const tossPayments = await loadTossPayments(clientKey);

        const payment = tossPayments.payment({
            customerKey: config.customerKey || 'ANONYMOUS',
        });

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
        console.error('Toss Payments 상세 에러 (Web):', error);
        return {
            success: false,
            error_msg: error.message || "결제 준비 중 오류가 발생했습니다."
        };
    }
};
