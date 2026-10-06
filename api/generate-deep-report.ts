import { corsHeaders, handleCors, getCorsHeaders } from './_utils/cors';
import { authenticateUser } from './_utils/auth';
import { generateDeepReport } from './_utils/report-generator';

export const config = {
    runtime: 'edge',
};

// 관리자 전용: 심층 리포트를 (재)생성해 JSON 으로 돌려준다. 저장은 호출한 관리자 화면이 수행한다.
export default async function handler(req: Request) {
    const corsResult = handleCors(req);
    if (corsResult) return corsResult;

    const reqCorsHeaders = getCorsHeaders(req);

    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
            status: 405,
            headers: reqCorsHeaders
        });
    }

    // 관리자 인증 및 인가 검증
    const authResult = await authenticateUser(req);
    if (authResult.errorResponse) return authResult.errorResponse;

    const { data: profile } = await authResult.supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', authResult.user!.id)
        .maybeSingle();

    if (profile?.role !== 'admin') {
        return new Response(JSON.stringify({ error: '관리자 권한이 필요합니다.' }), {
            status: 403,
            headers: reqCorsHeaders
        });
    }

    try {
        const { mbti, birthInfo, name, specialRequest, report_type, partnerInfo, gender } = await req.json();
        if (!birthInfo) {
            return new Response(JSON.stringify({ error: 'birthInfo 가 필요합니다.' }), { status: 400, headers: reqCorsHeaders });
        }

        const report = await generateDeepReport({
            name,
            mbti,
            birthInfo,
            gender,
            reportType: report_type,
            specialRequest,
            partnerInfo,
        });

        return new Response(JSON.stringify(report), { status: 200, headers: reqCorsHeaders });
    } catch (error: any) {
        console.error('generate-deep-report error:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: reqCorsHeaders });
    }
}
