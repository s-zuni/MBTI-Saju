import type { SupabaseClient } from '@supabase/supabase-js';
import { getCorsHeaders } from './cors';

export interface RateLimitOptions {
    /** Rate limit 버킷 식별자 (예: `ai:user:${userId}`, `preview:ip:${ip}`) */
    key: string;
    /** 윈도우당 최대 허용 횟수 */
    limit: number;
    /** 윈도우 길이(초) */
    windowSeconds: number;
}

export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    retryAfter: number;
}

/**
 * Edge Request 및 Node VercelRequest 양쪽에서 클라이언트 IP를 추출한다.
 */
export function getClientIp(req: Request | any): string {
    let forwarded: string | null = null;
    let realIp: string | null = null;

    if (typeof (req as Request)?.headers?.get === 'function') {
        forwarded = (req as Request).headers.get('x-forwarded-for');
        realIp = (req as Request).headers.get('x-real-ip');
    } else if (req?.headers) {
        const xff = req.headers['x-forwarded-for'];
        forwarded = Array.isArray(xff) ? xff[0] : xff || null;
        const xri = req.headers['x-real-ip'];
        realIp = Array.isArray(xri) ? xri[0] : xri || null;
    }

    if (forwarded) {
        const first = forwarded.split(',')[0]?.trim();
        if (first) return first.slice(0, 64);
    }
    if (realIp) {
        return realIp.trim().slice(0, 64);
    }
    const remoteAddr = req?.socket?.remoteAddress;
    if (typeof remoteAddr === 'string' && remoteAddr.trim()) {
        return remoteAddr.trim().slice(0, 64);
    }
    return 'unknown';
}

/**
 * Supabase `check_rate_limit` RPC를 호출해 원자적으로 요청 빈도를 검사한다.
 * DB 일시 오류 시 서비스 중단을 막기 위해 fail-open으로 동작하되 오류를 로깅한다.
 */
export async function checkRateLimit(
    supabaseAdmin: SupabaseClient,
    options: RateLimitOptions
): Promise<RateLimitResult> {
    try {
        const { data, error } = await supabaseAdmin.rpc('check_rate_limit', {
            p_key: options.key,
            p_limit: options.limit,
            p_window_seconds: options.windowSeconds,
        });

        if (error) {
            console.error('[rate-limit] RPC error:', error.message || error);
            return { allowed: true, remaining: options.limit, retryAfter: 0 };
        }

        const row = Array.isArray(data) ? data[0] : data;
        if (!row) {
            return { allowed: true, remaining: options.limit, retryAfter: 0 };
        }

        return {
            allowed: Boolean(row.allowed),
            remaining: Number(row.remaining ?? 0),
            retryAfter: Number(row.retry_after ?? options.windowSeconds),
        };
    } catch (err) {
        console.error('[rate-limit] unexpected error:', err);
        return { allowed: true, remaining: options.limit, retryAfter: 0 };
    }
}

export function createRateLimitEdgeResponse(req: Request | any, retryAfter: number): Response {
    const corsHeaders = getCorsHeaders(req);
    return new Response(
        JSON.stringify({
            success: false,
            error: `요청이 너무 많습니다. ${retryAfter}초 후 다시 시도해 주세요.`,
            code: 'RATE_LIMITED',
            retryAfter,
        }),
        {
            status: 429,
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
                'Retry-After': String(Math.max(1, retryAfter)),
            },
        }
    );
}

export function sendNodeRateLimitResponse(res: any, retryAfter: number) {
    const waitSeconds = Math.max(1, retryAfter);
    res.setHeader('Retry-After', String(waitSeconds));
    return res.status(429).json({
        success: false,
        error: `요청이 너무 많습니다. ${waitSeconds}초 후 다시 시도해 주세요.`,
        message: `요청이 너무 많습니다. ${waitSeconds}초 후 다시 시도해 주세요.`,
        code: 'RATE_LIMITED',
        retryAfter: waitSeconds,
    });
}

/**
 * Node 서버리스 핸들러용 공통 Rate Limit 검사.
 * 초과 시 429 응답을 전송하고 false를 반환하며, 통과 시 true를 반환한다.
 */
export async function enforceNodeRateLimit(
    supabaseAdmin: SupabaseClient | null,
    req: any,
    res: any,
    options: { scope: string; limit: number; windowSeconds: number }
): Promise<boolean> {
    if (!supabaseAdmin) return true;
    const rl = await checkRateLimit(supabaseAdmin, {
        key: `${options.scope}:ip:${getClientIp(req)}`,
        limit: options.limit,
        windowSeconds: options.windowSeconds,
    });
    if (!rl.allowed) {
        sendNodeRateLimitResponse(res, rl.retryAfter);
        return false;
    }
    return true;
}
