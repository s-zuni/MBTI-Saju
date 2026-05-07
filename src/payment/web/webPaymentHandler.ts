import { TossPaymentConfig, PaymentResponse } from '../types';

/**
 * 일반 웹 환경 전용 결제 처리 (CDN 방식)
 * 패키지 의존성을 완전히 제거하여 Apps In Toss 심사를 통과하기 위함입니다.
 */
export const requestWebPayment = async (config: TossPaymentConfig, clientKey: string): Promise<PaymentResponse> => {
    try {
        console.log('일반 웹 결제 요청 시작 (CDN):', {
            name: config.name,
            amount: config.amount,
        });

        // 1. SDK 스크립트 동적 로드
        await new Promise((resolve, reject) => {
            if ((window as any).TossPayments) {
                resolve(true);
                return;
            }
            const script = document.createElement('script');
            script.src = 'https://js.tosspayments.com/v2/standard';
            script.onload = () => resolve(true);
            script.onerror = () => reject(new Error('Toss Payments SDK 로드 실패'));
            document.head.appendChild(script);
        });

        const TossPayments = (window as any).TossPayments;
        const tossPayments = TossPayments(clientKey);

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
