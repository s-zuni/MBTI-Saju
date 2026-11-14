import { setNodeCorsHeaders } from './_utils/cors';
import { buildScorePreview, PreviewInputError } from './_utils/report-preview';
import { getSupabaseAdmin } from './_utils/auth';
import { enforceNodeRateLimit } from './_utils/rate-limit';

type VercelRequest = any;
type VercelResponse = any;

/**
 * 무료 미리보기(결제 전): 올해 남은 기간 + 앞으로 3개년 점수표만 반환한다.
 * AI 를 호출하지 않는 순수 계산이라 인증 없이 열어 두며, IP Rate Limit(분당 30회)을 적용한다.
 * 응답에 총평·월별 지도·본문은 포함하지 않는다.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    setNodeCorsHeaders(res, req);

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method Not Allowed' });
    }

    let supabaseAdmin = null;
    try {
        supabaseAdmin = getSupabaseAdmin();
    } catch {
        // Supabase env 미설정 환경에서도 순수 계산 미리보기는 계속 동작하도록 fail-open
    }
    const allowed = await enforceNodeRateLimit(supabaseAdmin, req, res, {
        scope: 'preview',
        limit: 30,
        windowSeconds: 60,
    });
    if (!allowed) return;

    try {
        const { birthInfo, gender, longitude } = req.body || {};
        const preview = buildScorePreview({ birthInfo, gender, longitude });
        return res.status(200).json({ success: true, ...preview });
    } catch (e: any) {
        if (e instanceof PreviewInputError) {
            return res.status(400).json({ success: false, message: e.message });
        }
        console.error('[report-preview] error:', e);
        return res.status(500).json({ success: false, message: '미리보기를 계산하지 못했습니다. 입력값을 확인해 주세요.' });
    }
}
