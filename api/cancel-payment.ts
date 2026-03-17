import { createClient } from '@supabase/supabase-js';

type VercelRequest = any;
type VercelResponse = any;

export default async function cancelPayment(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        return res.status(500).json({ success: false, message: '서버 설정 오류: Supabase 환경 변수가 누락되었습니다.' });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { purchaseId, cancelReason } = req.body;

    if (!purchaseId) {
        return res.status(400).json({ success: false, message: '필수 파라미터(purchaseId)가 누락되었습니다.' });
    }

    try {
        // 1. 구매 내역 조회
        const { data: purchase, error: fetchError } = await supabaseAdmin
            .from('credit_purchases')
            .select('*, profiles(id, credits)')
            .eq('id', purchaseId)
            .single();

        if (fetchError || !purchase) {
            return res.status(404).json({ success: false, message: '구매 내역을 찾을 수 없습니다.' });
        }

        if (purchase.status === 'refunded') {
            return res.status(400).json({ success: false, message: '이미 환불된 주문입니다.' });
        }

        if (!purchase.payment_id) {
            return res.status(400).json({ success: false, message: '결제 키(paymentKey)가 없는 주문입니다.' });
        }

        // 2. 토스 결제 취소 요청
        const widgetSecretKey = process.env.TOSS_SECRET_KEY || 'test_sk_Z1aOwX7K8m2Y2a7Wq9Lp8yQxzvNP';
        const encryptedSecretKey = 'Basic ' + Buffer.from(widgetSecretKey + ':').toString('base64');

        const tossResponse = await fetch(`https://api.tosspayments.com/v1/payments/${purchase.payment_id}/cancel`, {
            method: 'POST',
            body: JSON.stringify({ cancelReason: cancelReason || '관리자에 의한 환불' }),
            headers: {
                Authorization: encryptedSecretKey,
                'Content-Type': 'application/json',
            },
        });

        const tossData = await tossResponse.json();

        if (!tossResponse.ok) {
            console.error('[Toss Cancel Error]', tossData);
            return res.status(tossResponse.status).json({
                success: false,
                message: tossData.message || '토스 결제 취소가 거절되었습니다.',
                code: tossData.code
            });
        }

        // 3. DB 상태 업데이트 (트랜잭션 대신 순차 처리 - 서비스 롤이므로 안전)
        // 3-1. 구매 상태 변경
        const { error: updateError } = await supabaseAdmin
            .from('credit_purchases')
            .update({ 
                status: 'refunded',
                refunded_at: new Date().toISOString()
            })
            .eq('id', purchaseId);

        if (updateError) throw updateError;

        // 3-2. 프로필 크레딧 차감
        // 남은 크레딧이 구매한 크레딧보다 적을 경우 0으로 (정상적인 경우라면 이미 프론트에서 막았어야 함)
        const currentCredits = purchase.profiles?.credits || 0;
        const newCredits = Math.max(0, currentCredits - purchase.purchased_credits);

        const { error: creditError } = await supabaseAdmin
            .from('profiles')
            .update({ credits: newCredits })
            .eq('id', purchase.user_id);

        if (creditError) throw creditError;

        return res.status(200).json({
            success: true,
            message: '환불 처리가 완료되었습니다.',
            data: {
                new_balance: newCredits,
                toss: tossData
            }
        });

    } catch (error: any) {
        console.error('[System Refund Error]', error);
        return res.status(500).json({ 
            success: false, 
            message: '서버 내부 오류가 발생했습니다.',
            error: error.message 
        });
    }
}
