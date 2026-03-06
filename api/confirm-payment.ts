import { createClient } from '@supabase/supabase-js';
import { VercelRequest, VercelResponse } from '@vercel/node';

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
        // 개발환경 테스트 시크릿 키 (test_sk_) 또는 프로덕션 키 사용
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
            // 토스페이먼츠 승인 거절됨
            return res.status(response.status).json({ message: data.message || 'Payment approval failed', error: data });
        }

        // 2. 승인 완료 -> DB 업데이트
        // data 객체 안에는 구매자 정보, 메타데이터 등이 포함되어 있음 (주문 생성 시 넘긴 값)
        // customerEmail이나 customerKey 등을 참조하여 유저 식별 가능

        let userId = null;
        let productId = 'custom_coin'; // 기본값
        let addCoins = 0;

        // 결제 요청 시 orderName에 들어있거나, metadata에 유저 아이디와 상품정보를 숨겨 보내는 방식을 씁니다.
        // 현재 StorePage 로직상 metadata를 곧 만들 예정입니다.
        if (data.metadata?.userId) {
            userId = data.metadata.userId;
        }
        if (data.metadata?.productId) {
            productId = data.metadata.productId;
        }

        // 상품 종류에 따른 코인 부여량 결정 
        if (amount === 1000) addCoins = 100;
        else if (amount === 5000) addCoins = 550;
        else if (amount === 10000) addCoins = 1200;
        else if (amount === 30000) addCoins = 3800;
        else if (amount === 50000) addCoins = 6500;
        else {
            // 다른 상품(부적 등)일 경우 (코인이 아닐 수도 있음)
            addCoins = 0; // 혹은 필요시 하드코딩된 변환 로직 적용
        }

        if (userId) {
            // 2-1. orders 테이블에 기록 (어드민 권한)
            const { error: orderError } = await supabaseAdmin.from('orders').insert({
                user_id: userId,
                product_id: productId,
                payment_id: paymentKey,
                amount: amount,
                status: 'paid'
            });

            if (orderError) {
                console.error('Order Insert Error: ', orderError);
                // 결제는 성공했는데 DB 저장이 실패한 심각한 상태 -> 환불 로직을 트리거하거나 CS 연결 처리 필요
                return res.status(500).json({ message: 'Payment confirmed but failed to record order.', tossContext: data });
            }

            // 2-2. 사용자 코인 증감 (코인 상품인 경우에만)
            if (addCoins > 0) {
                // 기존 코인 조회
                const { data: profile, error: profileErr } = await supabaseAdmin
                    .from('profiles')
                    .select('coins')
                    .eq('id', userId)
                    .single();

                if (!profileErr && profile) {
                    await supabaseAdmin
                        .from('profiles')
                        .update({ coins: (profile.coins || 0) + addCoins })
                        .eq('id', userId);
                }
            }
        }

        return res.status(200).json({ success: true, payment: data });

    } catch (error: any) {
        console.error(error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}
