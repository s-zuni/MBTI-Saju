/**
 * Supabase Edge Functions 및 Vercel Edge Runtime을 위한 표준 CORS 헤더
 * https://supabase.com/docs/guides/functions/cors 가이드라인을 준수합니다.
 */
export const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Max-Age': '86400',
};

/**
 * OPTIONS 프리플라이트 요청을 처리합니다. (Edge Runtime용)
 */
export const handleCors = (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }
    return null;
};

/**
 * 표준 Vercel Serverless (Node.js) 함수에서 CORS 헤더를 설정합니다.
 */
export const setNodeCorsHeaders = (res: any) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Max-Age', '86400');
};
