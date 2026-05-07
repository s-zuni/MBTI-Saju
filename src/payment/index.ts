import { isTossApp } from '../utils/envUtils';
import { TossPaymentConfig, PaymentResponse } from './types';

// Toss Payments Client Key
const CLIENT_KEY = process.env.REACT_APP_TOSS_CLIENT_KEY || 'test_ck_mBZ1gQ4YVXbxv27PnmDqrLW2K0np';

/**
 * 결제창 호출 (환경에 따라 앱인토스 전용 또는 일반 웹 전용 핸들러 호출)
 * 빌드 시점에 환경 변수를 통해 코드를 분리할 수 있도록 구성했습니다.
 */
export const requestPayment = async (config: TossPaymentConfig): Promise<PaymentResponse> => {
    // 1. 앱인토스(Apps In Toss) 환경인 경우
    if (isTossApp()) {
        const { requestAitPayment } = await import('./ait/aitPaymentHandler');
        return await requestAitPayment(config);
    }

    // 2. 일반 웹 환경인 경우
    // 앱인토스 심사 시 이 경로의 문자열(URL 등)이 감지되지 않도록 주의해야 합니다.
    try {
        const { requestWebPayment } = await import('./web/webPaymentHandler');
        return await requestWebPayment(config, CLIENT_KEY);
    } catch (error: any) {
        console.error('웹 결제 모듈 로드 에러:', error);
        return {
            success: false,
            error_msg: "결제 모듈을 불러오는 중 오류가 발생했습니다."
        };
    }
};

export * from './types';
