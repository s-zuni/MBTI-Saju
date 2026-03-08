import { createClient } from '@supabase/supabase-js';

type VercelRequest = any;
type VercelResponse = any;

const supabaseAdmin = createClient(
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export default async function confirmPayment(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { paymentKey, orderId, amount } = req.body;

    if (!paymentKey || !orderId || !amount) {
        return res.status(400).json({ message: 'Missing parameters (paymentKey, orderId, amount)' });
    }

    try {
        // 1. 토스페이먼츠 승인(Confirm) API 호출
        const widgetSecretKey = process.env.TOSS_SECRET_KEY || 'test_sk_Z1aOwX7K8m2Y2a7Wq9Lp8yQxzvNP';
        const encryptedSecretKey = 'Basic ' + Buffer.from(widgetSecretKey + ':').toString('base64');

        const response = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
            method: 'POST',
            body: JSON.stringify({ orderId, amount, paymentKey }),
            headers: {
                Authorization: encryptedSecretKey,
                'Content-Type': 'application/json',
            },
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Toss Payments Confirm Error:', data);
            return res.status(response.status).json({
                message: data.message || '결제 승인이 거절되었습니다.',
                code: data.code
            });
        }

        // 2. 승인 완료 -> DB 업데이트
        let userId = data.metadata?.userId || data.customerKey; // V2에서는 customerKey가 전송됨
        let productId = data.metadata?.productId || 'custom_coin';
        let addCoins = 0;

        // 금액에 따른 코인 부여 로직 (PricingPage의 요금제와 일치시킴)
        if (amount === 5000) addCoins = 50;
        else if (amount === 10000) addCoins = 120;
        else if (amount === 30000) addCoins = 400;
        else if (amount === 50000) addCoins = 750;
        else if (amount >= 1000) {
            // StorePage의 예시 상품들 (1000원, 1500원 등) 처리
            // 여기서는 금액 10원당 1코인 등으로 환산하거나, 상품 ID에 따라 처리 가능
            // 일단 1000원당 10코인으로 임시 설정 (필요시 수정)
            addCoins = Math.floor(amount / 100);
        }

        if (userId) {
            // 2-1. orders 테이블에 기록
            const { error: orderError } = await supabaseAdmin.from('orders').insert({
                user_id: userId,
                product_id: productId,
                payment_id: paymentKey,
                amount: amount,
                status: 'paid'
            });

            if (orderError) {
                console.error('Order Insert Error:', orderError);
                return res.status(500).json({ message: '결제는 완료되었으나 주문 기록에 실패했습니다.', error: orderError });
            }

            // 2-2. 사용자 코인 증감
            if (addCoins > 0) {
                const { data: profile, error: profileErr } = await supabaseAdmin
                    .from('profiles')
                    .select('coins')
                    .eq('id', userId)
                    .single();

                if (profileErr) {
                    console.error('Profile Fetch Error:', profileErr);
                } else if (profile) {
                    const { error: updateErr } = await supabaseAdmin
                        .from('profiles')
                        .update({ coins: (profile.coins || 0) + addCoins })
                        .eq('id', userId);

                    if (updateErr) console.error('Profile Update Error:', updateErr);
                }
            }
        }

        return res.status(200).json({ success: true, payment: data });

    } catch (error: any) {
        console.error('Confirm Payment Internal Error:', error);
        return res.status(500).json({ message: '서버 내부 오류가 발생했습니다.' });
    }
}
