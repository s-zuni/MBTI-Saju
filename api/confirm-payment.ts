import { createClient } from '@supabase/supabase-js';

type VercelRequest = any;
type VercelResponse = any;

export default async function confirmPayment(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    // 1. 환경 변수 폴백 로직 (Vercel 환경 변수 명명 규칙 대응)
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('[CRITICAL] Missing Supabase configuration');
        return res.status(500).json({ 
            success: false,
            message: '서버 설정 오류: Supabase 환경 변수가 누락되었습니다.',
            debug: { url: !!supabaseUrl, key: !!supabaseServiceKey }
        });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { paymentKey, orderId, amount } = req.body;

    if (!paymentKey || !orderId || !amount) {
        return res.status(400).json({ success: false, message: '필수 파라미터가 누락되었습니다.' });
    }

    try {
        // 2. 토스 결제 승인 요청
        const widgetSecretKey = process.env.TOSS_SECRET_KEY || 'test_sk_Z1aOwX7K8m2Y2a7Wq9Lp8yQxzvNP';
        const encryptedSecretKey = 'Basic ' + Buffer.from(widgetSecretKey + ':').toString('base64');

        console.log(`[Payment] Confirming order ${orderId} for ${amount}원`);

        const tossResponse = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
            method: 'POST',
            body: JSON.stringify({ orderId, amount, paymentKey }),
            headers: {
                Authorization: encryptedSecretKey,
                'Content-Type': 'application/json',
            },
        });

        const tossData = await tossResponse.json();

        if (!tossResponse.ok) {
            console.error('[Toss Error]', tossData);
            return res.status(tossResponse.status).json({
                success: false,
                message: tossData.message || '토스 결제 승인이 거절되었습니다.',
                code: tossData.code
            });
        }

        // 3. 사용자 식별 및 크레딧 계산
        // Toss V2 SDK에서 보낸 metadata는 tossData.metadata에 담겨 옵니다.
        // 여러 필드를 순차적으로 확인하여 누락 가능성을 최소화합니다.
        const userId = tossData.metadata?.userId || tossData.customerKey || tossData.metadata?.customerKey;
        const productId = tossData.metadata?.productId || 'credit_custom';
        
        console.log('[DEBUG] Full Toss Confirmation Data:', JSON.stringify(tossData));
        console.log('[DEBUG] Extraction Logic:', {
            'metadata.userId': tossData.metadata?.userId,
            'customerKey': tossData.customerKey,
            'metadata.customerKey': tossData.metadata?.customerKey,
            'finalUserId': userId
        });

        if (!userId || userId === 'ANONYMOUS') {
            console.error('[CRITICAL] User Identification Failed. Check data above.');
            return res.status(400).json({
                success: false,
                message: '사용자 장치 식별에 실패했습니다. (유저 ID 누락)',
                debug: { 
                    receivedUserId: userId,
                    hasMetadata: !!tossData.metadata,
                    metadataKeys: tossData.metadata ? Object.keys(tossData.metadata) : [],
                    fullData: tossData // 프론트엔드에서도 확인할 수 있도록 전달
                }
            });
        }

        let addCredits = 0;
        if (amount === 1000) addCredits = 100;
        else if (amount === 4500) addCredits = 500;
        else if (amount === 8000) addCredits = 1000;
        else if (amount === 5000) addCredits = 50; 
        else if (amount === 10000) addCredits = 120; 
        else if (amount === 30000) addCredits = 400; 
        else if (amount === 50000) addCredits = 750; 
        else addCredits = Math.floor(amount / 10);

        // 4. Supabase RPC 호출 (Atomic Transaction)
        // SQL: add_credits_after_payment(p_user_id, p_credits, p_amount, p_payment_id, p_plan_id)
        const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc('add_credits_after_payment', {
            p_user_id: userId,
            p_credits: addCredits,
            p_amount: amount,
            p_payment_id: paymentKey,
            p_plan_id: productId
        });

        if (rpcError) {
            console.error('[Supabase RPC Error]', rpcError);
            return res.status(500).json({ 
                success: false,
                message: '데이터베이스 연동 중 치명적 오류가 발생했습니다. (결제는 실제 차단되지 않았을 수 있습니다)',
                details: rpcError.message,
                debug: { userId, addCredits }
            });
        }

        // RPC 함수가 반환하는 JSON 검증
        if (rpcResult && rpcResult.success === false) {
            console.error('[SQL Error]', rpcResult.error);
            return res.status(500).json({
                success: false,
                message: '결제 기록 업데이트에 실패했습니다.',
                error: rpcResult.error
            });
        }

        return res.status(200).json({
            success: true,
            message: '결제 및 크레딧 충전이 성공적으로 완료되었습니다.',
            data: {
                credits: addCredits,
                new_balance: rpcResult?.new_balance,
                toss: { orderId: tossData.orderId, paymentKey: tossData.paymentKey }
            }
        });

    } catch (error: any) {
        console.error('[System Error]', error);
        return res.status(500).json({ 
            success: false, 
            message: '서버 내부 오류가 발생했습니다.',
            error: error.message 
        });
    }
}
