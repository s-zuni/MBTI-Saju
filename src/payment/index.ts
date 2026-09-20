import { TossPaymentConfig, PaymentResponse } from './types';

// Toss Payments Client Key
const CLIENT_KEY = process.env.REACT_APP_TOSS_CLIENT_KEY || 'test_ck_mBZ1gQ4YVXbxv27PnmDqrLW2K0np';

/**
 * 결제창 호출 (웹 전용 TossPayments 위젯)
 */
export const requestPayment = async (config: TossPaymentConfig): Promise<PaymentResponse> => {
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
