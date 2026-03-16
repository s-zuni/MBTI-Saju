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

    // 환경 변수 확인 (로그)
    console.log('[Confirm Payment] Env Check:', {
        HAS_SUPABASE_URL: !!process.env.VITE_SUPABASE_URL || !!process.env.SUPABASE_URL,
        HAS_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        HAS_TOSS_KEY: !!process.env.TOSS_SECRET_KEY
    });

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
        let productId = data.metadata?.productId || 'custom_credit';
        let addCredits = 0;

        // 금액에 따른 크레딧 부여 로직 (PricingPage의 요금제와 일치시킴)
        if (amount === 5000) addCredits = 50;
        else if (amount === 10000) addCredits = 120;
        else if (amount === 30000) addCredits = 400;
        else if (amount === 50000) addCredits = 750;
        else if (amount >= 1000) {
            // StorePage의 예시 상품들 (1000원, 1500원 등) 처리
            // 여기서는 금액 10원당 1크레딧 등으로 환산하거나, 상품 ID에 따라 처리 가능
            // 일단 1000원당 10크레딧으로 임시 설정 (필요시 수정)
            addCredits = Math.floor(amount / 100);
        }

        if (userId) {
            console.log('[Confirm Payment] Processing DB updates for user:', userId);
            // 2-1. orders 테이블에 기록
            const { error: orderError } = await supabaseAdmin.from('orders').insert({
                user_id: userId,
                product_id: productId,
                payment_id: paymentKey,
                amount: amount,
                status: 'paid'
            });

            if (orderError) {
                console.error('[Confirm Payment] Order Insert Error:', orderError);
                return res.status(500).json({ message: '결제는 완료되었으나 주문 기록에 실패했습니다.', error: orderError.message });
            }

            // 2-2. credit_purchases 테이블에 기록 (Frontend hook과 연동)
            if (addCredits > 0) {
                console.log('[Confirm Payment] Adding credits:', addCredits);
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
                    // Critical failure because credits won't show up otherwise
                    return res.status(500).json({ message: '결제는 완료되었으나 크레딧 지급에 실패했습니다.', error: purchaseError.message });
                }
            }
        } else {
            console.warn('[Confirm Payment] No userId found in metadata or customerKey');
        }

        // 5. profiles 테이블의 credits 업데이트
        console.log(`Updating credits for user ${userId}: adding ${addCredits}`);
        
        // 현재 크레딧을 가져와서 더해주는 방식 (동시성 방지를 위해 rpc를 쓰는 것이 좋으나 우선 직접 업데이트)
        const { data: profileData, error: profileFetchError } = await supabaseAdmin
            .from('profiles')
            .select('credits')
            .eq('id', userId)
            .single();

        if (profileFetchError) {
            console.error('Error fetching profile for credit update:', profileFetchError);
            // 구매 기록은 남았으므로 에러를 던지지 않고 로그만 남김 (나중에 대조 가능)
        } else {
            const newCredits = (profileData?.credits || 0) + addCredits;
            const { error: profileUpdateError } = await supabaseAdmin
                .from('profiles')
                .update({ credits: newCredits })
                .eq('id', userId);

            if (profileUpdateError) {
                console.error('Error updating profile credits:', profileUpdateError);
            } else {
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
