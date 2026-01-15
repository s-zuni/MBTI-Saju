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
    item: { name: string; amount: number; buyer_email: string; buyer_name: string; buyer_tel?: string },
): Promise<{ success: boolean; error_msg?: string; imp_uid?: string; merchant_uid?: string }> => {
    return new Promise((resolve) => {
        if (!window.IMP) {
            resolve({ success: false, error_msg: "Payment SDK not loaded" });
            return;
        }

        const { IMP } = window;
        IMP.init('imp47648364'); // Replace with your PortOne Merchant ID

        const merchant_uid = `ord_${new Date().getTime()}`;

        IMP.request_pay({
            pg: 'html5_inicis', // Test PG
            pay_method: 'card',
            merchant_uid: merchant_uid,
            name: item.name,
            amount: item.amount,
            buyer_email: item.buyer_email,
            buyer_name: item.buyer_name,
            buyer_tel: item.buyer_tel || '010-0000-0000',
        }, (rsp: any) => {
            if (rsp.success) {
                resolve({
                    success: true,
                    imp_uid: rsp.imp_uid,
                    merchant_uid: rsp.merchant_uid
                });
            } else {
                resolve({
                    success: false,
                    error_msg: rsp.error_msg
                });
            }
        });
    });
};
