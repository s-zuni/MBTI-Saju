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
        console.error('[Confirm Payment] Missing Supabase configuration');
        return res.status(500).json({ message: '서버 설정 오류: Supabase 환경 변수가 누락되었습니다.' });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { paymentKey, orderId, amount } = req.body;

    if (!paymentKey || !orderId || !amount) {
        return res.status(400).json({ message: '필수 파라미터가 누락되었습니다.' });
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

        // 사용자 식별 (Toss에서 넘어오는 customerKey가 유저의 id임)
        const userId = data.customerKey || data.metadata?.userId; 
        const productId = data.metadata?.productId || 'custom_credit';
        let addCredits = 0;

        // 크레딧 매핑 (StorePage & PricingPage)
        if (amount === 1000) addCredits = 100;
        else if (amount === 4500) addCredits = 500;
        else if (amount === 8000) addCredits = 1000;
        else if (amount === 5000) addCredits = 50; 
        else if (amount === 10000) addCredits = 120; 
        else if (amount === 30000) addCredits = 400; 
        else if (amount === 50000) addCredits = 750; 
        else addCredits = Math.floor(amount / 10);

        if (userId) {
            // RPC 함수 호출 (Atomic Transaction)
            // SQL: add_credits_after_payment(p_user_id, p_credits, p_amount, p_payment_id, p_plan_id)
            const { error: rpcError } = await supabaseAdmin.rpc('add_credits_after_payment', {
                p_user_id: userId,
                p_credits: addCredits,
                p_amount: amount,
                p_payment_id: paymentKey,
                p_plan_id: productId === 'custom_credit' ? 'credit_custom' : productId
            });

            if (rpcError) {
                console.error('RPC Error (add_credits_after_payment):', rpcError);
                // 만약 RPC 실패 시 개별 테이블 인서트라도 시도하는 폴백 로직을 고려할 수 있으나,
                // RPC 자체가 트랜잭션을 보장하므로 여기선 에러 응답을 보냅니다.
                return res.status(500).json({ 
                    message: '데이터베이스 연동 중 오류가 발생했습니다.',
                    details: rpcError.message 
                });
            }

            console.log(`Successfully synced credits for user ${userId}: +${addCredits} credits`);
        }

        return res.status(200).json({
            success: true,
            message: '결제 및 크레딧 충전이 완료되었습니다.',
            data
        });

    } catch (error: any) {
        console.error('System Error:', error);
        return res.status(500).json({ message: '서버 내부 오류가 발생했습니다.' });
    }
}
