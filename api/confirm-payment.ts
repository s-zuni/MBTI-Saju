import { createClient } from '@supabase/supabase-js';

type VercelRequest = any;
type VercelResponse = any;

export default async function confirmPayment(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('[Confirm Payment] Missing Supabase configuration:', { hasUrl: !!supabaseUrl, hasKey: !!supabaseServiceKey });
        return res.status(500).json({ 
            message: '서버 설정 오류: Supabase 환경 변수가 누락되었습니다.',
            details: { 
                hasUrl: !!supabaseUrl, 
                hasKey: !!supabaseServiceKey,
                info: 'SUPABASE_URL 및 SUPABASE_SERVICE_ROLE_KEY가 필요합니다.'
            }
        });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { paymentKey, orderId, amount } = req.body;

    console.log('[Confirm Payment] Request Body:', { orderId, amount, paymentKey: paymentKey ? '***' + paymentKey.substring(paymentKey.length - 4) : 'null' });

    if (!paymentKey || !orderId || !amount) {
        return res.status(400).json({ message: 'Missing parameters (paymentKey, orderId, amount)' });
    }

    try {
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
        // customerKey를 우선순위로 사용 (StorePage에서 user.id가 전달됨)
        const userId = data.customerKey || data.metadata?.userId; 
        const productId = data.metadata?.productId || 'custom_credit';
        let addCredits = 0;

        // 금액에 따른 크레딧 부여 로직 (StorePage 기준: 1000원=100, 4500원=500, 8000원=1000)
        if (amount === 1000) addCredits = 100;
        else if (amount === 4500) addCredits = 500;
        else if (amount === 8000) addCredits = 1000;
        else if (amount === 5000) addCredits = 50; 
        else if (amount === 10000) addCredits = 120; 
        else if (amount === 30000) addCredits = 400; 
        else if (amount === 50000) addCredits = 750; 
        else {
            addCredits = Math.floor(amount / 10);
        }

        if (userId) {
            console.log('[Confirm Payment] Processing DB updates for user:', userId);
            
            // 2-1. orders 테이블 기록
            const { error: orderError } = await supabaseAdmin.from('orders').insert({
                user_id: userId,
                product_id: productId,
                payment_id: paymentKey,
                amount: amount,
                status: 'paid'
            });

            if (orderError) {
                console.error('[Confirm Payment] Order Insert Error:', orderError);
            }

            // 2-2. credit_purchases 테이블 기록
            if (addCredits > 0) {
                const { error: purchaseError } = await supabaseAdmin
                    .from('credit_purchases')
                    .insert({
                        user_id: userId,
                        plan_id: productId === 'custom_credit' ? null : productId,
                        purchased_credits: addCredits,
                        remaining_credits: addCredits,
                        price_paid: amount,
                        payment_id: paymentKey,
                        status: 'active'
                    });

                if (purchaseError) {
                    console.error('[Confirm Payment] Credit Purchase Insert Error:', purchaseError);
                    return res.status(500).json({ message: '크레딧 지급 기록에 실패했습니다.', error: purchaseError.message });
                }
            }

            // 3. profiles 테이블의 credits 즉시 업데이트
            const { data: profileData, error: profileFetchError } = await supabaseAdmin
                .from('profiles')
                .select('credits')
                .eq('id', userId)
                .single();

            if (!profileFetchError) {
                const newCredits = (profileData?.credits || 0) + addCredits;
                await supabaseAdmin
                    .from('profiles')
                    .update({ credits: newCredits })
                    .eq('id', userId);
                console.log(`Successfully updated credits for user ${userId}. New total: ${newCredits}`);
            }
        }

        return res.status(200).json({
            success: true,
            message: '결제가 성공적으로 처리되었으며 크레딧이 충전되었습니다.',
            data
        });

    } catch (error: any) {
        console.error('Payment Confirmation System Error:', error);
        return res.status(500).json({
            message: error.message || '서버 내부 오류가 발생했습니다.',
            error: error.stack
        });
    }
}
