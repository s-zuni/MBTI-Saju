import { loadTossPayments } from '@tosspayments/tosspayments-sdk';
import { isTossApp } from './envUtils';

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
    // Apps In Toss (AIT) 전용 필드
    aitProductId?: string;
    onAitGrant?: (orderId: string, productId: string) => Promise<boolean>;
}

export interface PaymentResponse {
    success: boolean;
    paymentKey?: string;
    orderId?: string;
    amount?: number;
    error_msg?: string;
}

// Toss Payments Client Key (Test/Live)
const CLIENT_KEY = process.env.REACT_APP_TOSS_CLIENT_KEY || 'test_ck_mBZ1gQ4YVXbxv27PnmDqrLW2K0np';

/**
 * 결제창 호출 (환경에 따라 Toss Payments Web SDK 또는 Apps In Toss SDK 사용)
 */
export const requestPayment = async (config: TossPaymentConfig): Promise<PaymentResponse> => {
    // 1. 앱인토스(Apps In Toss) 환경인 경우
    if (isTossApp()) {
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
                // SDK 1.1.3+ 지급 완료 과정 필수
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
    }

    // 2. 일반 웹 환경인 경우 (기존 토스페이먼츠)
    try {
        console.log('일반 웹 결제 요청 시작:', {
            name: config.name,
            amount: config.amount,
        });

        const loadPromise = loadTossPayments(CLIENT_KEY);
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('결제 모듈을 불러오는 데 실패했습니다(타임아웃).')), 15000)
        );

        const tossPayments = await Promise.race([loadPromise, timeoutPromise]) as any;

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
        console.error('Toss Payments 상세 에러:', error);
        return {
            success: false,
            error_msg: error.message || "결제 준비 중 오류가 발생했습니다."
        };
    }
};

