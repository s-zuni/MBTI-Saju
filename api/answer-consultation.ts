import { corsHeaders, handleCors, getCorsHeaders } from './_utils/cors';
import { authenticateUser } from './_utils/auth';

export const config = {
    runtime: 'edge',
};

/**
 * POST /api/answer-consultation
 * 관리자가 최종 상담 답변을 전송(저장)하는 엔드포인트.
 *
 * - 관리자 권한 인증 필수
 * - consultation_questions 테이블의 admin_answer, status, answered_at 갱신
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

    // 관리자 권한 검증
    const authResult = await authenticateUser(req, { allowAnonymous: false });
    if (authResult.errorResponse) return authResult.errorResponse;

    const supabaseAdmin = authResult.supabaseAdmin;
    const adminId = authResult.user!.id;

    const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', adminId)
        .maybeSingle();

    if (profile?.role !== 'admin') {
        return new Response(JSON.stringify({ error: '관리자 권한이 필요합니다.' }), {
            status: 403,
            headers: reqCorsHeaders,
        });
    }

    try {
        const body = await req.json();
        const { question_id, admin_answer } = body;

        if (!question_id || !admin_answer || typeof admin_answer !== 'string' || admin_answer.trim().length === 0) {
            return new Response(JSON.stringify({ error: 'question_id와 admin_answer가 필요합니다.' }), {
                status: 400,
                headers: reqCorsHeaders,
            });
        }

        // 질문 상태 갱신
        const { error: updateError } = await supabaseAdmin
            .from('consultation_questions')
            .update({
                admin_answer: admin_answer.trim(),
                status: 'answered',
                answered_at: new Date().toISOString(),
                answered_by: adminId,
            })
            .eq('id', question_id);

        if (updateError) {
            console.error('[answer-consultation] DB update error:', updateError);
            return new Response(JSON.stringify({ error: '답변 저장 중 오류가 발생했습니다.' }), {
                status: 500,
                headers: reqCorsHeaders,
            });
        }

        return new Response(
            JSON.stringify({ success: true, message: '답변이 성공적으로 전송되었습니다.' }),
            { status: 200, headers: { ...reqCorsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error: any) {
        console.error('[answer-consultation] Error:', error);
        return new Response(
            JSON.stringify({ error: error.message || '서버 오류가 발생했습니다.' }),
            { status: 500, headers: reqCorsHeaders }
        );
    }
}

