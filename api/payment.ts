import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { setNodeCorsHeaders } from './_utils/cors';
import { extractBearerToken } from './_utils/auth';

type VercelRequest = any;
type VercelResponse = any;

function getSupabaseAdmin(): SupabaseClient {
    const supabaseUrl = process.env.SUPABASE_URL || 
                        process.env.VITE_SUPABASE_URL || 
                        process.env.REACT_APP_SUPABASE_URL || 
                        process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                              process.env.SUPABASE_SERVICE_KEY || 
                              process.env.SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Supabase configuration missing (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)');
    }

    return createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        }
    });
}

function getTossAuthHeader(): string {
    const secretKey = process.env.TOSS_SECRET_KEY;
    if (!secretKey) {
        throw new Error('TOSS_SECRET_KEY is missing in server environment. Payment operation aborted.');
    }
    return 'Basic ' + Buffer.from(secretKey + ':').toString('base64');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    setNodeCorsHeaders(res, req);
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST' && req.method !== 'GET') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { action } = req.query;

    if (action === 'confirm') {
        if (req.method !== 'POST') {
            return res.status(405).json({ success: false, message: 'Method Not Allowed. Use POST for confirmation.' });
        }
        return confirmPayment(req, res);
    } else if (action === 'cancel') {
        if (req.method !== 'POST') {
            return res.status(405).json({ success: false, message: 'Method Not Allowed. Use POST for cancellation.' });
        }
        return cancelPayment(req, res);
    } else if (action === 'info') {
        return getPaymentInfo(req, res);
    } else {
        return res.status(400).json({ success: false, message: 'Invalid action' });
    }
}

async function confirmPayment(req: VercelRequest, res: VercelResponse) {
    let supabaseAdmin: SupabaseClient;
    let encryptedSecretKey: string;

    try {
        supabaseAdmin = getSupabaseAdmin();
        encryptedSecretKey = getTossAuthHeader();
    } catch (envError: any) {
        console.error('[confirmPayment] Configuration Error:', envError.message);
        return res.status(500).json({ success: false, message: envError.message });
    }

    const { paymentKey, orderId, amount, userId: bodyUserId } = req.body || {};

    if (!paymentKey || !orderId || !amount) {
        return res.status(400).json({ success: false, message: '필수 파라미터가 누락되었습니다.' });
    }

    try {
        // 1. TossPayments 승인 API 호출
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

        const approvedAmount = Number(tossData.totalAmount || amount);
        const userId = bodyUserId || tossData.metadata?.userId || tossData.customerKey || tossData.metadata?.customerKey;
        const productId = tossData.metadata?.productId || 'credit_custom';

        // deep_report는 비회원(GUEST_*)도 허용. 그 외 상품은 유효한 사용자 필요.
        const isGuestUser = !userId || userId === 'ANONYMOUS' || userId.startsWith('GUEST_');

        // 2. 상품별 카탈로그 및 금액 위변조 검증 (Security Hardening)
        if (productId === 'deep_report') {
            // 심층 리포트 정가 검증 (최소 29,000원 이상이어야 함)
            if (approvedAmount < 29000) {
                console.error(`[Security] Suspicious deep_report amount: ${approvedAmount} for orderId: ${orderId}`);
                return res.status(400).json({
                    success: false,
                    message: '결제 승인 금액이 심층 리포트 정가와 일치하지 않습니다.'
                });
            }

            const { error: updateError } = await supabaseAdmin
                .from('deep_report_requests')
                .update({ status: 'paid', payment_id: paymentKey })
                .eq('order_id', orderId);

            if (updateError) {
                console.error('Failed to update deep report status:', updateError);
                throw updateError;
            }

            if (!isGuestUser) {
                await supabaseAdmin.from('credit_purchases').insert({
                    user_id: userId,
                    purchased_credits: 0,
                    remaining_credits: 0,
                    price_paid: approvedAmount,
                    payment_id: paymentKey,
                    plan_id: 'deep_report',
                    status: 'active'
                });
            }

            return res.status(200).json({
                success: true,
                message: '심층 결합 분석 리포트 결제 성공',
                data: { toss: tossData }
            });
        }

        // ------------------------------------------------------------------
        // 운명 심층 상담 패키지 (3회권 19,900원)
        // ------------------------------------------------------------------
        if (productId === 'consultation_package_3') {
            if (isGuestUser) {
                return res.status(400).json({ success: false, message: '로그인이 필요합니다.' });
            }

            // 금액 위변조 검증: 반드시 19,900원이어야 함
            if (approvedAmount !== 19900) {
                console.error(`[Security] Suspicious consultation_package_3 amount: ${approvedAmount} for orderId: ${orderId}`);
                return res.status(400).json({
                    success: false,
                    message: '결제 승인 금액이 상담 패키지 정가와 일치하지 않습니다. (기대: 19,900원)'
                });
            }

            // 중복 orderId 방지
            const { data: existingPurchase } = await supabaseAdmin
                .from('consultation_purchases')
                .select('id')
                .eq('order_id', orderId)
                .maybeSingle();

            if (existingPurchase) {
                return res.status(400).json({ success: false, message: '이미 처리된 주문입니다.' });
            }

            const { error: insertError } = await supabaseAdmin
                .from('consultation_purchases')
                .insert({
                    user_id: userId,
                    order_id: orderId,
                    payment_id: paymentKey,
                    price_paid: approvedAmount,
                    questions_granted: 3,
                    questions_used: 0,
                    status: 'active',
                });

            if (insertError) {
                console.error('[consultation_package_3] Insert error:', insertError);
                throw insertError;
            }

            return res.status(200).json({
                success: true,
                message: '운명 심층 상담 3회권 지급 완료',
                data: { questions_granted: 3, toss: tossData }
            });
        }

        // ------------------------------------------------------------------
        // 운명 심층 상담 추가 1회권 (9,900원)
        // ------------------------------------------------------------------
        if (productId === 'consultation_extra_question') {
            if (isGuestUser) {
                return res.status(400).json({ success: false, message: '로그인이 필요합니다.' });
            }

            // 금액 위변조 검증: 반드시 9,900원이어야 함
            if (approvedAmount !== 9900) {
                console.error(`[Security] Suspicious consultation_extra_question amount: ${approvedAmount} for orderId: ${orderId}`);
                return res.status(400).json({
                    success: false,
                    message: '결제 승인 금액이 추가 상담권 정가와 일치하지 않습니다. (기대: 9,900원)'
                });
            }

            // 중복 orderId 방지
            const { data: existingPurchaseExtra } = await supabaseAdmin
                .from('consultation_purchases')
                .select('id')
                .eq('order_id', orderId)
                .maybeSingle();

            if (existingPurchaseExtra) {
                return res.status(400).json({ success: false, message: '이미 처리된 주문입니다.' });
            }

            const { error: insertExtraError } = await supabaseAdmin
                .from('consultation_purchases')
                .insert({
                    user_id: userId,
                    order_id: orderId,
                    payment_id: paymentKey,
                    price_paid: approvedAmount,
                    questions_granted: 1,
                    questions_used: 0,
                    status: 'active',
                });

            if (insertExtraError) {
                console.error('[consultation_extra_question] Insert error:', insertExtraError);
                throw insertExtraError;
            }

            return res.status(200).json({
                success: true,
                message: '운명 심층 상담 추가 1회권 지급 완료',
                data: { questions_granted: 1, toss: tossData }
            });
        }

        // 쇼핑몰 주문 결제 처리
        if (productId === 'shop_order') {
            if (isGuestUser) {
                return res.status(400).json({ success: false, message: '로그인이 필요합니다.' });
            }

            try {
                const itemsRaw = tossData.metadata?.items;
                const items = typeof itemsRaw === 'string' ? JSON.parse(itemsRaw) : itemsRaw;

                if (!items || !Array.isArray(items) || items.length === 0) {
                    return res.status(400).json({ success: false, message: '주문 상품 정보가 없습니다.' });
                }

                const { data: orderResult, error: orderError } = await supabaseAdmin.rpc('process_shop_order', {
                    p_user_id: userId,
                    p_order_number: orderId,
                    p_total_amount: approvedAmount,
                    p_payment_key: paymentKey,
                    p_shipping_name: tossData.metadata?.shippingName || '',
                    p_shipping_phone: tossData.metadata?.shippingPhone || '',
                    p_shipping_address: tossData.metadata?.shippingAddress || '',
                    p_shipping_memo: tossData.metadata?.shippingMemo || '',
                    p_items: items,
                    p_shipping_fee: Number(tossData.metadata?.shippingFee || 0)
                });

                if (orderError) {
                    console.error('Shop order processing failed:', orderError);
                    throw orderError;
                }

                return res.status(200).json({
                    success: true,
                    message: '쇼핑몰 주문 결제가 완료되었습니다.',
                    data: { orderId: orderResult, toss: tossData }
                });
            } catch (shopError: any) {
                console.error('Shop order error:', shopError);
                return res.status(500).json({
                    success: false,
                    message: '주문 처리 중 오류가 발생했습니다.'
                });
            }
        }

        if (isGuestUser) {
            return res.status(400).json({ success: false, message: '사용자 장치 식별에 실패했습니다.' });
        }

        // 이벤트 크레딧 패키지 (심층 리포트 구매 후 500크레딧 9,900원)
        if (productId === 'event_credit_500') {
            // 이벤트 패키지 금액 정확 검증 (9,900원)
            if (approvedAmount !== 9900) {
                console.error(`[Security] Suspicious event_credit_500 amount: ${approvedAmount}`);
                return res.status(400).json({
                    success: false,
                    message: '이벤트 패키지 결제 금액이 올바르지 않습니다.'
                });
            }

            const eventType = tossData.metadata?.eventType || 'deep_report_credit_500';

            // 중복 참여 방지
            const { data: existingClaim } = await supabaseAdmin
                .from('event_claims')
                .select('id')
                .eq('user_id', userId)
                .eq('event_type', eventType)
                .maybeSingle();

            if (existingClaim) {
                return res.status(400).json({
                    success: false,
                    message: '이미 참여한 이벤트입니다.'
                });
            }

            // 500 크레딧 부여 (서버 RPC)
            const { error: rpcError } = await supabaseAdmin.rpc('add_credits_after_payment', {
                p_user_id: userId,
                p_credits: 500,
                p_amount: approvedAmount,
                p_payment_id: paymentKey,
                p_plan_id: productId
            });

            if (rpcError) throw rpcError;

            // 이벤트 참여 기록
            await supabaseAdmin.from('event_claims').insert({
                user_id: userId,
                event_type: eventType,
                order_id: orderId,
            });

            return res.status(200).json({
                success: true,
                message: '이벤트 크레딧 500개 지급 완료',
                data: { credits: 500, toss: tossData }
            });
        }

        // 일반 크레딧 패키지 금액 및 카탈로그 대조 검증
        let addCredits = 0;
        const { data: planData } = await supabaseAdmin
            .from('pricing_plans')
            .select('credits, price')
            .eq('id', productId)
            .maybeSingle();

        if (planData) {
            // 카탈로그 요금제와 결제 승인 금액 대조
            if (approvedAmount !== planData.price) {
                console.error(`[Security] Plan price mismatch: expected ${planData.price}, got ${approvedAmount}`);
                return res.status(400).json({
                    success: false,
                    message: '결제 승인 금액이 선택한 요금제 가격과 일치하지 않습니다.'
                });
            }
            addCredits = planData.credits;
        } else {
            // DB 미등록 패키지인 경우 표준 패키지 단가 엄격 대조
            if (approvedAmount === 12000 || approvedAmount === 4900) {
                addCredits = 100;
            } else if (approvedAmount === 6900 || approvedAmount === 2900) {
                addCredits = 50;
            } else if (approvedAmount === 1500 || approvedAmount === 900) {
                addCredits = 10;
            } else {
                console.error(`[Security] Unrecognized credit package amount: ${approvedAmount}`);
                return res.status(400).json({
                    success: false,
                    message: '승인된 결제 금액에 해당하는 유효한 크레딧 패키지를 찾을 수 없습니다.'
                });
            }
        }

        // 3. 서버 사이드 원자적 크레딧 부여 (add_credits_after_payment RPC)
        const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc('add_credits_after_payment', {
            p_user_id: userId,
            p_credits: addCredits,
            p_amount: approvedAmount,
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
        console.error('[confirmPayment] Error:', error);
        return res.status(500).json({ 
            success: false, 
            message: '결제 승인 처리 중 내부 오류가 발생했습니다.' 
        });
    }
}

async function cancelPayment(req: VercelRequest, res: VercelResponse) {
    let supabaseAdmin: SupabaseClient;
    let encryptedSecretKey: string;

    try {
        supabaseAdmin = getSupabaseAdmin();
        encryptedSecretKey = getTossAuthHeader();
    } catch (envError: any) {
        console.error('[cancelPayment] Configuration Error:', envError.message);
        return res.status(500).json({ success: false, message: envError.message });
    }

    // 1. 요청자 인증 및 인가 검증 (Security Hardening: 소유자 또는 admin만 환불 가능)
    const token = extractBearerToken(req);
    if (!token) {
        return res.status(401).json({ success: false, message: '인증 토큰이 누락되었습니다.' });
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
        return res.status(401).json({ success: false, message: '유효하지 않은 인증 토큰입니다.' });
    }

    // 관리자 여부 확인
    const { data: userProfile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

    const isAdmin = userProfile?.role === 'admin';

    const { purchaseId, cancelReason, type } = req.body || {};

    if (!purchaseId) {
        return res.status(400).json({ success: false, message: 'Missing purchaseId' });
    }

    try {
        if (type === 'deep_report') {
            const { data: request, error: fetchError } = await supabaseAdmin
                .from('deep_report_requests')
                .select('*')
                .eq('id', purchaseId)
                .single();

            if (fetchError || !request) {
                return res.status(404).json({ success: false, message: 'Deep report request not found' });
            }

            // 소유권 검증 (관리자가 아니면 본인의 요청만 취소 가능)
            if (!isAdmin && request.user_id !== user.id) {
                return res.status(403).json({ success: false, message: '해당 결제 건을 취소할 권한이 없습니다.' });
            }

            if (!request.payment_id) {
                return res.status(400).json({ success: false, message: '결제 정보(payment_id)가 없는 요청입니다.' });
            }

            const tossResponse = await fetch(new URL(`https://api.tosspayments.com/v1/payments/${request.payment_id}/cancel`), {
                method: 'POST',
                body: JSON.stringify({ cancelReason: cancelReason || (isAdmin ? '관리자에 의한 환불' : '사용자 요청 환불') }),
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

            await supabaseAdmin.from('deep_report_requests').update({ status: 'refunded' }).eq('id', purchaseId);
            await supabaseAdmin.from('credit_purchases').update({ status: 'refunded', refunded_at: new Date().toISOString() }).eq('payment_id', request.payment_id);

            return res.status(200).json({ success: true, message: 'Refund successful', data: { toss: tossData } });
        } else {
            const { data: purchase, error: fetchError } = await supabaseAdmin
                .from('credit_purchases')
                .select('*, profiles(id, credits)')
                .eq('id', purchaseId)
                .single();

            if (fetchError || !purchase) {
                return res.status(404).json({ success: false, message: 'Purchase not found' });
            }

            // 소유권 검증 (관리자가 아니면 본인의 구매 건만 취소 가능)
            if (!isAdmin && purchase.user_id !== user.id) {
                return res.status(403).json({ success: false, message: '해당 결제 건을 취소할 권한이 없습니다.' });
            }

            if (!purchase.payment_id) {
                return res.status(400).json({ success: false, message: '결제 정보(payment_id)가 없는 구매 건입니다.' });
            }

            const tossResponse = await fetch(new URL(`https://api.tosspayments.com/v1/payments/${purchase.payment_id}/cancel`), {
                method: 'POST',
                body: JSON.stringify({ cancelReason: cancelReason || (isAdmin ? '관리자에 의한 환불' : '사용자 요청 환불') }),
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

            await supabaseAdmin.from('credit_purchases').update({ 
                status: 'refunded', 
                refunded_at: new Date().toISOString() 
            }).eq('id', purchaseId);

            const currentCredits = purchase.profiles?.credits || 0;
            const newCredits = Math.max(0, currentCredits - purchase.purchased_credits);
            await supabaseAdmin.from('profiles').update({ credits: newCredits }).eq('id', purchase.user_id);

            return res.status(200).json({ success: true, message: 'Refund successful', data: { new_balance: newCredits, toss: tossData } });
        }
    } catch (error: any) {
        console.error('[cancelPayment] Error:', error);
        return res.status(500).json({ success: false, message: '환불 처리 중 내부 오류가 발생했습니다.' });
    }
}

async function getPaymentInfo(req: VercelRequest, res: VercelResponse) {
    let encryptedSecretKey: string;

    try {
        encryptedSecretKey = getTossAuthHeader();
    } catch (envError: any) {
        console.error('[getPaymentInfo] Configuration Error:', envError.message);
        return res.status(500).json({ success: false, message: envError.message });
    }

    const paymentKey = req.query.paymentKey || req.body?.paymentKey;
    const orderId = req.query.orderId || req.body?.orderId;
    
    if ((!paymentKey || paymentKey === '-') && (!orderId || orderId === '-')) {
        return res.status(400).json({ success: false, message: '유효한 paymentKey나 orderId가 없습니다.' });
    }

    try {
        const url = (paymentKey && paymentKey !== '-') 
            ? `https://api.tosspayments.com/v1/payments/${paymentKey}`
            : `https://api.tosspayments.com/v1/payments/orders/${orderId}`;

        const tossResponse = await fetch(url, {
            method: 'GET',
            headers: {
                Authorization: encryptedSecretKey,
                'Content-Type': 'application/json',
            },
        });

        const tossData = await tossResponse.json();

        if (!tossResponse.ok) {
            return res.status(tossResponse.status).json({
                success: false,
                message: tossData.message || 'Toss info failed',
                code: tossData.code,
                tossError: tossData
            });
        }

        return res.status(200).json({ success: true, data: tossData });
    } catch (error: any) {
        console.error('[getPaymentInfo] Error:', error);
        return res.status(500).json({ success: false, message: '결제 정보 조회 중 내부 오류가 발생했습니다.' });
    }
}
