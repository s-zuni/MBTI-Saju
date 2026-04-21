import { createClient } from '@supabase/supabase-js';
import { setNodeCorsHeaders } from './_utils/cors';

type VercelRequest = any;
type VercelResponse = any;

export default async function handler(req: VercelRequest, res: VercelResponse) {
    setNodeCorsHeaders(res);
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { action } = req.query;

    if (action === 'confirm') {
        return confirmPayment(req, res);
    } else if (action === 'cancel') {
        return cancelPayment(req, res);
    } else {
        return res.status(400).json({ success: false, message: 'Invalid action' });
    }
}

async function confirmPayment(req: VercelRequest, res: VercelResponse) {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('Missing Supabase env vars in confirmPayment');
        return res.status(500).json({ success: false, message: 'Payment configuration missing (Supabase)' });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { paymentKey, orderId, amount, userId: bodyUserId } = req.body;

    if (!paymentKey || !orderId || !amount) {
        return res.status(400).json({ success: false, message: '필수 파라미터가 누락되었습니다.' });
    }

    try {
        const widgetSecretKey = process.env.TOSS_SECRET_KEY || 'test_sk_Z1aOwX7K8m2Y2a7Wq9Lp8yQxzvNP';
        const encryptedSecretKey = 'Basic ' + Buffer.from(widgetSecretKey + ':').toString('base64');

        const tossResponse = await fetch(new URL('https://api.tosspayments.com/v1/payments/confirm'), {
            method: 'POST',
            body: JSON.stringify({ orderId, amount, paymentKey }),
            headers: {
                Authorization: encryptedSecretKey,
                'Content-Type': 'application/json',
            },
        });

        const tossData = await tossResponse.json();

        if (!tossResponse.ok) {
            return res.status(tossResponse.status).json({
                success: false,
                message: tossData.message || '토스 결제 승인이 거절되었습니다.',
                code: tossData.code,
                tossError: tossData
            });
        }

        const userId = bodyUserId || tossData.metadata?.userId || tossData.customerKey || tossData.metadata?.customerKey;
        const productId = tossData.metadata?.productId || 'credit_custom';

        if (!userId || userId === 'ANONYMOUS') {
            return res.status(400).json({ success: false, message: '사용자 장치 식별에 실패했습니다.' });
        }

        if (productId === 'deep_report') {
            const { error: updateError } = await supabaseAdmin
                .from('deep_report_requests')
                .update({ status: 'paid' })
                .eq('order_id', orderId);

            if (updateError) {
                console.error('Failed to update deep report status:', updateError);
                throw updateError;
            }

            // 구매 내역에도 기록하여 사용자가 마이페이지에서 확인 가능하게 함
            await supabaseAdmin.from('credit_purchases').insert({
                user_id: userId,
                purchased_credits: 0,
                price_paid: amount,
                payment_id: paymentKey,
                plan_id: 'deep_report',
                status: 'active'
            });

            return res.status(200).json({
                success: true,
                message: '심층 결합 분석 리포트 결제 성공',
                data: { toss: tossData }
            });
        }

        let addCredits = 0;
        const { data: planData, error: planError } = await supabaseAdmin
            .from('pricing_plans')
            .select('credits')
            .eq('id', productId)
            .single();

        if (planData && !planError) {
            addCredits = planData.credits;
        } else {
            // Fallback
            if (amount === 4900) addCredits = 100;
            else if (amount === 2900) addCredits = 50;
            else if (amount === 900) addCredits = 10;
            else addCredits = Math.floor(amount / 49); // Default approximation
        }

        const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc('add_credits_after_payment', {
            p_user_id: userId,
            p_credits: addCredits,
            p_amount: amount,
            p_payment_id: paymentKey,
            p_plan_id: productId
        });

        if (rpcError) throw rpcError;

        return res.status(200).json({
            success: true,
            message: '결제 성공',
            data: { credits: addCredits, new_balance: rpcResult?.new_balance, toss: tossData }
        });
    } catch (error: any) {
        return res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
    }
}

async function cancelPayment(req: VercelRequest, res: VercelResponse) {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('Missing Supabase env vars in cancelPayment');
        return res.status(500).json({ success: false, message: 'Payment configuration missing (Supabase)' });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { purchaseId, cancelReason } = req.body;

    if (!purchaseId) {
        return res.status(400).json({ success: false, message: 'Missing purchaseId' });
    }

    try {
        const { data: purchase, error: fetchError } = await supabaseAdmin
            .from('credit_purchases')
            .select('*, profiles(id, credits)')
            .eq('id', purchaseId)
            .single();

        if (fetchError || !purchase) {
            return res.status(404).json({ success: false, message: 'Purchase not found' });
        }

        const widgetSecretKey = process.env.TOSS_SECRET_KEY || 'test_sk_Z1aOwX7K8m2Y2a7Wq9Lp8yQxzvNP';
        const encryptedSecretKey = 'Basic ' + Buffer.from(widgetSecretKey + ':').toString('base64');

        const tossResponse = await fetch(new URL(`https://api.tosspayments.com/v1/payments/${purchase.payment_id}/cancel`), {
            method: 'POST',
            body: JSON.stringify({ cancelReason: cancelReason || '관리자에 의한 환불' }),
            headers: {
                Authorization: encryptedSecretKey,
                'Content-Type': 'application/json',
            },
        });

        const tossData = await tossResponse.json();

        if (!tossResponse.ok) {
            return res.status(tossResponse.status).json({
                success: false,
                message: tossData.message || 'Toss cancel failed',
                code: tossData.code
            });
        }

        await supabaseAdmin.from('credit_purchases').update({ status: 'refunded', refunded_at: new Date().toISOString() }).eq('id', purchaseId);

        const currentCredits = purchase.profiles?.credits || 0;
        const newCredits = Math.max(0, currentCredits - purchase.purchased_credits);
        await supabaseAdmin.from('profiles').update({ credits: newCredits }).eq('id', purchase.user_id);

        return res.status(200).json({ success: true, message: 'Refund successful', data: { new_balance: newCredits, toss: tossData } });
    } catch (error: any) {
        return res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
    }
}
