import { useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import { requestPayment } from '../payment';

export interface ShopPaymentItem {
    product_id: string;
    product_name: string;
    product_price: number;
    quantity: number;
}

export interface ShippingInfo {
    name: string;
    phone: string;
    address: string;
    memo: string;
}

export function useShopPayment() {
    const { session } = useAuth();
    const [loading, setLoading] = useState(false);

    const performPayment = useCallback(async (items: ShopPaymentItem[], shippingInfo?: ShippingInfo) => {
        if (!session?.user) {
            alert('로그인이 필요합니다.');
            return;
        }

        try {
            setLoading(true);

            // Generate orderId
            const orderId = `SHOP-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`.toUpperCase();

            // Calculate total amount
            const totalAmount = items.reduce((sum, item) => sum + item.product_price * item.quantity, 0);

            // Name of the payment item
            let paymentName = items[0]?.product_name ?? '운세템 쇼핑몰 주문';
            if (items.length > 1) {
                paymentName = `${paymentName} 외 ${items.length - 1}건`;
            }

            // Save order detail to localstorage for pending state recovery
            const pendingOrder = {
                orderId,
                items,
                shippingInfo
            };
            localStorage.setItem('pending_shop_order', JSON.stringify(pendingOrder));

            // Call standard payment request
            const response = await requestPayment({
                name: paymentName,
                amount: totalAmount,
                orderId,
                customerKey: session.user.id,
                customerEmail: session.user.email ?? undefined,
                metadata: {
                    productId: 'shop_order',
                    items: JSON.stringify(items),
                    shippingName: shippingInfo?.name ?? '',
                    shippingPhone: shippingInfo?.phone ?? '',
                    shippingAddress: shippingInfo?.address ?? '',
                    shippingMemo: shippingInfo?.memo ?? ''
                },
                successUrl: `${window.location.origin}/payment/success`,
                failUrl: `${window.location.origin}/payment/fail`
            });

            if (!response.success) {
                alert(response.error_msg || '결제 요청에 실패했습니다.');
            }
        } catch (error) {
            console.error('Payment request error:', error);
            alert('결제 처리 중 요류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    }, [session]);

    const requestShopPayment = useCallback(async (items: ShopPaymentItem[], shippingInfo?: ShippingInfo) => {
        return performPayment(items, shippingInfo);
    }, [performPayment]);

    const requestDirectPurchase = useCallback(async (item: ShopPaymentItem, shippingInfo?: ShippingInfo) => {
        return performPayment([item], shippingInfo);
    }, [performPayment]);

    return {
        loading,
        requestShopPayment,
        requestDirectPurchase
    };
}
