import { TossPaymentConfig, PaymentResponse } from '../types';

/**
 * 앱인토스(Apps In Toss) 전용 결제 처리
 */
export const requestAitPayment = async (config: TossPaymentConfig): Promise<PaymentResponse> => {
    console.log('앱인토스 결제 환경 감지됨');
    try {
        // @ts-ignore - toss 객체는 앱인토스 환경에서 주입됨
        const toss = window.toss;
        if (!toss || !toss.iap) {
            throw new Error('앱인토스 SDK를 찾을 수 없습니다.');
        }

        if (!config.aitProductId) {
            throw new Error('앱인토스 상품 ID(aitProductId)가 필요합니다.');
        }

        // 앱인토스 결제 요청
        const result = await toss.iap.createOneTimePurchaseOrder({
            productId: config.aitProductId,
            orderId: config.orderId,
            grantProduct: async (order: { orderId: string; productId: string }) => {
                console.log('상품 지급 시작:', order);
                if (config.onAitGrant) {
                    const success = await config.onAitGrant(order.orderId, order.productId);
                    if (!success) {
                        throw new Error('상품 지급 처리 실패 (Partner Server Error)');
                    }
                } else {
                    console.warn('onAitGrant 콜백이 없어 지급 처리를 생략합니다.');
                }
            }
        });

        console.log('앱인토스 결제 결과:', result);
        return { success: true, orderId: config.orderId };
    } catch (error: any) {
        console.error('앱인토스 결제 에러:', error);
        return {
            success: false,
            error_msg: error.message || '앱인토스 결제 중 오류가 발생했습니다.'
        };
    }
};
