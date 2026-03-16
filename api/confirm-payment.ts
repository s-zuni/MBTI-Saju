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
    const { paymentKey, orderId, amount, userId: bodyUserId } = req.body;

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
            console.error('[Toss Error API Response]', tossData);
            return res.status(tossResponse.status).json({
                success: false,
                message: tossData.message || '토스 결제 승인이 거절되었습니다.',
                code: tossData.code,
                tossError: tossData // 상세 에러 객체 포함
            });
        }

        // 3. 사용자 식별
        const userId = bodyUserId || tossData.metadata?.userId || tossData.customerKey || tossData.metadata?.customerKey;
        const productId = tossData.metadata?.productId || 'credit_custom';
        
        console.log('[DEBUG] Full Toss Confirmation Data:', JSON.stringify(tossData));

        if (!userId || userId === 'ANONYMOUS') {
            console.error('[CRITICAL] User Identification Failed.');
            return res.status(400).json({
                success: false,
                message: '사용자 장치 식별에 실패했습니다. (유저 ID 누락)',
                debug: { 
                    receivedUserId: userId,
                    fullData: tossData 
                }
            });
        }

        // 4. 크레딧 양 조회 (DB 기반 동적 매핑)
        let addCredits = 0;
        
        // 4-1. DB에서 해당 플랜의 크레딧 조회
        const { data: planData, error: planError } = await supabaseAdmin
            .from('pricing_plans')
            .select('credits')
            .eq('id', productId)
            .single();

        if (planData && !planError) {
            addCredits = planData.credits;
            console.log(`[Payment] Plan found: ${productId}, Credits to add: ${addCredits}`);
        } else {
            // 4-2. 플랜을 못 찾을 경우 금액 기반 폴백 (기존 호환성 유지)
            console.warn(`[Payment] Plan ${productId} not found. Falling back to amount-based calculation.`);
            if (amount === 9900) addCredits = 100;
            else if (amount === 5900) addCredits = 50;
            else if (amount === 2900) addCredits = 10;
            else if (amount === 1000) addCredits = 100;
            else if (amount === 4500) addCredits = 500;
            else if (amount === 8000) addCredits = 1000;
            else addCredits = Math.floor(amount / 10);
            
            console.log(`[Payment] Fallback applied. Amount: ${amount}, Credits to add: ${addCredits}`);
        }

        // 5. Supabase RPC 호출 (Atomic Transaction)
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
                error: rpcResult.error,
                debug: { userId, addCredits, paymentKey }
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
