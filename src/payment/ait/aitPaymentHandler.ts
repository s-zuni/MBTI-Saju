import { TossPaymentConfig, PaymentResponse } from '../types';
import { IAP } from '@apps-in-toss/web-framework';

/**
 * 앱인토스(Apps In Toss) 전용 결제 처리
 */
export const requestAitPayment = async (config: TossPaymentConfig): Promise<PaymentResponse> => {
    console.log('앱인토스 결제 환경 감지됨');
    
    if (!config.aitProductId) {
        return {
            success: false,
            error_msg: '앱인토스 상품 ID(aitProductId)가 필요합니다.'
        };
    }

    return new Promise((resolve) => {
        let cleanup: (() => void) | undefined;
        
        cleanup = IAP.createOneTimePurchaseOrder({
            options: {
                sku: config.aitProductId!,
                processProductGrant: async ({ orderId }) => {
                    console.log('상품 지급 시작:', orderId);
                    if (config.onAitGrant) {
                        try {
                            const success = await config.onAitGrant(orderId, config.aitProductId!);
                            return success;
                        } catch (e) {
                            console.error('상품 지급 에러:', e);
                            return false;
                        }
                    } else {
                        console.warn('onAitGrant 콜백이 없어 true로 간주합니다.');
                        return true;
                    }
                }
            },
            onEvent: (event) => {
                console.log('앱인토스 결제 이벤트:', event);
                if (event.type === 'success') {
                    if (cleanup) cleanup();
                    resolve({ success: true, orderId: event.data.orderId });
                }
            },
            onError: (error: any) => {
                console.error('앱인토스 결제 에러:', error);
                if (cleanup) cleanup();
                resolve({
                    success: false,
                    error_msg: error.message || '결제 중 오류가 발생했습니다.'
                });
            }
        });
    });
};
