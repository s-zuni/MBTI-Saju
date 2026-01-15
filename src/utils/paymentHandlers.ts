import { supabase } from '../supabaseClient';

declare global {
    interface Window {
        IMP: any;
    }
}

export interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    image_url: string;
    type: 'digital' | 'physical';
    content_url?: string;
}

export const requestPayment = (
    product: Product,
    user: any,
    onSuccess: (paymentId: string) => void,
    onError: (msg: string) => void
) => {
    if (!window.IMP) {
        onError("Payment SDK not loaded");
        return;
    }

    const { IMP } = window;
    IMP.init('imp47648364'); // Replace with your PortOne Merchant ID if needed. This is a sample code.

    const merchant_uid = `ord_${new Date().getTime()}`;

    IMP.request_pay({
        pg: 'html5_inicis', // Test PG
        pay_method: 'card',
        merchant_uid: merchant_uid,
        name: product.name,
        amount: product.price,
        buyer_email: user.email,
        buyer_name: user.user_metadata?.full_name || 'User',
        buyer_tel: '010-1234-5678', // Optional
    }, async (rsp: any) => {
        if (rsp.success) {
            // 1. Save Order to Supabase
            const { error } = await supabase.from('orders').insert({
                user_id: user.id,
                product_id: product.id,
                payment_id: rsp.imp_uid,
                amount: rsp.paid_amount,
                status: 'paid'
            });

            if (error) {
                console.error("Order save failed", error);
                onError(`결제는 성공했으나 주문 저장에 실패했습니다. 관리자에게 문의하세요. (${rsp.imp_uid})`);
            } else {
                onSuccess(rsp.imp_uid);
            }
        } else {
            onError(`결제 실패: ${rsp.error_msg}`);
        }
    });
};
