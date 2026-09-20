import { corsHeaders, handleCors, getCorsHeaders } from './_utils/cors';
import { authenticateUser } from './_utils/auth';

export const config = {
    runtime: 'edge',
};

/**
 * POST /api/submit-consultation
 * 사용자가 상담 질문을 제출하는 엔드포인트.
 *
 * - 인증 필수 (비회원 불가)
 * - 서버에서 consume_consultation_question RPC를 호출해 잔여 횟수 원자적 1 차감
 * - 잔여 없으면 402 반환 → 프론트에서 결제 모달 노출
 * - 차감 성공 시 consultation_questions에 status='pending'으로 질문 저장
 * - isFirstQuestion 여부를 서버 판단 기준으로 응답에 포함 (기기 교체해도 일관)
 * - AI 호출 없음 (비동기 전문가 상담)
 */
export default async function handler(req: Request) {
    const corsResult = handleCors(req);
    if (corsResult) return corsResult;

    const reqCorsHeaders = getCorsHeaders(req);

    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
            status: 405,
            headers: reqCorsHeaders,
        });
    }

    // 인증 필수 (비회원 불가)
    const authResult = await authenticateUser(req, { allowAnonymous: false });
    if (authResult.errorResponse) return authResult.errorResponse;

    const userId = authResult.user!.id;
    const supabaseAdmin = authResult.supabaseAdmin;

    try {
        const body = await req.json();
        const { question_text } = body;

        if (!question_text || typeof question_text !== 'string' || question_text.trim().length === 0) {
            return new Response(JSON.stringify({ error: '질문 내용을 입력해주세요.' }), {
                status: 400,
                headers: reqCorsHeaders,
            });
        }

        if (question_text.trim().length > 2000) {
            return new Response(JSON.stringify({ error: '질문은 2,000자 이내로 입력해주세요.' }), {
                status: 400,
                headers: reqCorsHeaders,
            });
        }

        // 서버에서 원자적 차감 + 질문 저장 (consume_consultation_question RPC)
        // 이 RPC는 SECURITY DEFINER + GRANT service_role only 이므로,
        // service_role 클라이언트(supabaseAdmin)를 통해서만 호출 가능.
        const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc(
            'consume_consultation_question',
            {
                p_user_id: userId,
                p_question_text: question_text.trim(),
            }
        );

        if (rpcError) {
            console.error('[submit-consultation] RPC error:', rpcError);
            return new Response(
                JSON.stringify({ error: '상담 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' }),
                { status: 500, headers: reqCorsHeaders }
            );
        }

        // RPC 결과 처리
        const result = rpcResult as {
            success: boolean;
            code?: string;
            message?: string;
            question_id?: string;
            is_first_question?: boolean;
            questions_remaining?: number;
        };

        if (!result.success) {
            if (result.code === 'INSUFFICIENT_QUESTIONS') {
                // 잔여 상담 횟수 없음 → 프론트에서 결제 모달 노출
                return new Response(
                    JSON.stringify({
                        success: false,
                        error: '잔여 상담 횟수가 없습니다. 상담권을 구매해 주세요.',
                        code: 'INSUFFICIENT_QUESTIONS',
                    }),
                    { status: 402, headers: reqCorsHeaders }
                );
            }
            return new Response(
                JSON.stringify({ success: false, error: result.message || '상담 처리 중 오류가 발생했습니다.' }),
                { status: 500, headers: reqCorsHeaders }
            );
        }

        return new Response(
            JSON.stringify({
                success: true,
                question_id: result.question_id,
                is_first_question: result.is_first_question ?? false,
                questions_remaining: result.questions_remaining ?? 0,
                message: '질문이 성공적으로 접수되었습니다. 24시간 이내에 답변 드리겠습니다.',
            }),
            { status: 200, headers: { ...reqCorsHeaders, 'Content-Type': 'application/json' } }
        );
    } catch (error: any) {
        console.error('[submit-consultation] Unexpected error:', error);
        return new Response(
            JSON.stringify({ error: error.message || '서버 오류가 발생했습니다.' }),
            { status: 500, headers: reqCorsHeaders }
        );
    }
}

