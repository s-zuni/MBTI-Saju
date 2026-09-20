/**
 * Supabase Edge Functions 및 Vercel Edge Runtime을 위한 안전한 CORS 헤더
 */

const ALLOWED_ORIGINS = [
    'https://www.mbtiju.com',
    'https://mbtiju.com',
    'http://localhost:3000',
    'http://localhost:5173',
];

export function getAllowedOrigin(originHeader: string | null | undefined): string {
    if (!originHeader) return '*';
    if (ALLOWED_ORIGINS.includes(originHeader)) {
        return originHeader;
    }
    // Vercel Preview Deployments 허용 (*.vercel.app)
    if (originHeader.endsWith('.vercel.app')) {
        return originHeader;
    }
    return 'https://www.mbtiju.com';
}

export const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Max-Age': '86400',
};

export const getCorsHeaders = (req?: Request | any): Record<string, string> => {
    let origin: string | null = null;
    if (req) {
        if (typeof (req as Request).headers?.get === 'function') {
            origin = (req as Request).headers.get('origin');
        } else if (req.headers) {
            origin = req.headers['origin'] || req.headers['Origin'] || null;
        }
    }
    const effectiveOrigin = getAllowedOrigin(origin);
    return {
        ...corsHeaders,
        'Access-Control-Allow-Origin': effectiveOrigin
    };
};

/**
 * OPTIONS 프리플라이트 요청을 처리합니다. (Edge Runtime용)
 */
export const handleCors = (req: Request) => {
    if (req.method === 'OPTIONS') {
        const origin = req.headers.get('origin');
        const effectiveOrigin = getAllowedOrigin(origin);
        return new Response('ok', { 
            headers: {
                ...corsHeaders,
                'Access-Control-Allow-Origin': effectiveOrigin
            } 
        });
    }
    return null;
};

/**
 * 표준 Vercel Serverless (Node.js) 함수에서 CORS 헤더를 설정합니다.
 */
export const setNodeCorsHeaders = (res: any, req?: any) => {
    const origin = req?.headers?.origin;
    const effectiveOrigin = getAllowedOrigin(origin);
    res.setHeader('Access-Control-Allow-Origin', effectiveOrigin);
    res.setHeader('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Max-Age', '86400');
};
