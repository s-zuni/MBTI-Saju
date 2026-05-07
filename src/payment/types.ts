export interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    image_url: string;
    type: 'digital' | 'physical';
    content_url?: string | undefined;
}

export interface TossPaymentConfig {
    name: string;
    amount: number;
    orderId: string;
    customerKey: string;
    customerName?: string | undefined;
    customerEmail?: string | undefined;
    metadata?: Record<string, any> | undefined;
    successUrl?: string | undefined;
    failUrl?: string | undefined;
    aitProductId?: string | undefined;
    onAitGrant?: ((orderId: string, productId: string) => Promise<boolean>) | undefined;
}

export interface PaymentResponse {
    success: boolean;
    paymentKey?: string;
    orderId?: string;
    amount?: number;
    error_msg?: string;
}
