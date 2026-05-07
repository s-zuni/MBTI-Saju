import { TossPaymentConfig, PaymentResponse } from './types';

/**
 * 결제창 호출 (환경에 따라 앱인토스 전용 또는 일반 웹 전용 핸들러 호출)
 * 빌드 시점에 환경 변수를 통해 코드를 분리할 수 있도록 구성했습니다.
 */
export const requestPayment = async (config: TossPaymentConfig): Promise<PaymentResponse> => {
    const { requestAitPayment } = await import('./ait/aitPaymentHandler');
    return await requestAitPayment(config);
};

export * from './types';
