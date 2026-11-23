import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { getCorsHeaders } from './cors';
import { checkRateLimit, createRateLimitEdgeResponse, getClientIp } from './rate-limit';

export const SERVICE_COSTS = {
    FORTUNE_TODAY: 490,
    FORTUNE_TOMORROW: 490,
    MBTI_SAJU: 990,
    COMPATIBILITY_TRIP: 490,
    COMPATIBILITY: 990,
    TRIP: 490,
    JAMIDUSU: 990,
    KBO: 490,
    RELATIONSHIP_ADD: 490,
    AI_CHAT_5: 490,
    TAROT: 490,
    REGENERATE_MBTI_SAJU: 990,
    GOLD_WEALTH: 990,
    GOLD_BUSINESS: 990,
    GOLD_JOB: 990,
    GOLD_JOBCHANGE: 990,
    LOVE_COUPLE: 990,
    LOVE_MARRIED: 990,
    LOVE_MARRIAGE: 990,
    LOVE_REUNION: 990,
    LOVE_CRUSH: 990
} as const;

export type ServiceType = keyof typeof SERVICE_COSTS;

export function getSupabaseAdmin(): SupabaseClient {
    const supabaseUrl = process.env.SUPABASE_URL || 
                        process.env.VITE_SUPABASE_URL || 
                        process.env.REACT_APP_SUPABASE_URL || 
                        process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                              process.env.SUPABASE_SERVICE_KEY || 
                              process.env.SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Supabase admin configuration missing (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)');
    }

    return createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        }
    });
}

export function getSupabaseAnon(): SupabaseClient {
    const supabaseUrl = process.env.SUPABASE_URL || 
                        process.env.VITE_SUPABASE_URL || 
                        process.env.REACT_APP_SUPABASE_URL || 
                        process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 
                           process.env.VITE_SUPABASE_ANON_KEY || 
                           process.env.REACT_APP_SUPABASE_ANON_KEY || 
                           process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    return createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        }
    });
}

export function extractBearerToken(req: Request | any): string | null {
    let authHeader: string | null = null;
    if (typeof (req as Request).headers?.get === 'function') {
        authHeader = (req as Request).headers.get('authorization');
    } else if (req.headers) {
        authHeader = req.headers['authorization'] || req.headers['Authorization'] || null;
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    return authHeader.substring(7).trim();
}

export interface AuthOptions {
    serviceType?: ServiceType | string | undefined;
    cost?: number | undefined;
    allowAnonymous?: boolean | undefined;
    /**
     * JWT 검증으로 user가 확보된 뒤, 실제 청구할 serviceType/cost를 서버가 직접 계산하도록 위임한다.
     * "첫 사용 무료" 같은 정책은 요청 body의 클라이언트 입력(boolean/문자열)을 신뢰하면 반복 호출로
     * 우회당할 수 있으므로, DB 상태를 조회/원자적으로 갱신해 판정해야 하는 엔드포인트에서 사용한다.
     * 반환값이 있으면 options.serviceType/options.cost보다 우선 적용된다.
     */
    resolveCost?: (ctx: { user: User; supabaseAdmin: SupabaseClient }) => Promise<{ serviceType?: ServiceType | string | undefined; cost: number }>;
    /** Rate limit 검사 생략 (같은 요청에서 authenticateUser를 2회 호출할 때 중복 차감 방지) */
    skipRateLimit?: boolean | undefined;
    /** 분당(또는 rateLimitWindowSeconds당) 허용 요청 수 (기본 20) */
    rateLimitMax?: number | undefined;
    /** Rate limit 윈도우 길이(초, 기본 60) */
    rateLimitWindowSeconds?: number | undefined;
}

export interface AuthResult {
    user: User | null;
    supabaseAdmin: SupabaseClient;
    errorResponse: Response | null;
    deductedCredits?: number | undefined;
}

/**
 * AI 엔드포인트 공통 인증 및 Rate Limit 미들웨어 (Edge / Node 공용)
 * 크레딧 제도 폐지 및 비회원 즉시 이용 전환에 따라:
 * - allowAnonymous가 명시적으로 false가 아니면 비회원(토큰 없음) 요청도 허용한다.
 * - DB 크레딧 차감(deduct_credits)은 수행하지 않고 IP/사용자 Rate Limit만 적용한다.
 */
export async function authenticateUser(req: Request | any, options: AuthOptions = {}): Promise<AuthResult> {
    const corsHeaders = getCorsHeaders(req);
    const supabaseAdmin = getSupabaseAdmin();
    const token = extractBearerToken(req);
    const requireAuth = options.allowAnonymous === false;

    if (!token) {
        if (!requireAuth) {
            if (!options.skipRateLimit) {
                const rl = await checkRateLimit(supabaseAdmin, {
                    key: `ai:ip:${getClientIp(req)}`,
                    limit: options.rateLimitMax ?? 20,
                    windowSeconds: options.rateLimitWindowSeconds ?? 60,
                });
                if (!rl.allowed) {
                    return {
                        user: null,
                        supabaseAdmin,
                        errorResponse: createRateLimitEdgeResponse(req, rl.retryAfter),
                    };
                }
            }
            return { user: null, supabaseAdmin, errorResponse: null, deductedCredits: 0 };
        }
        return {
            user: null,
            supabaseAdmin,
            errorResponse: new Response(
                JSON.stringify({ 
                    success: false, 
                    error: '로그인이 필요한 서비스입니다.', 
                    code: 'UNAUTHORIZED' 
                }),
                { 
                    status: 401, 
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
                }
            )
        };
    }

    // Supabase JWT 검증
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
        if (!requireAuth) {
            // 비회원 전환 이후 구 만료 토큰이 전달된 경우에도 일반 AI 엔드포인트는 비회원으로 통과 허용
            if (!options.skipRateLimit) {
                const rl = await checkRateLimit(supabaseAdmin, {
                    key: `ai:ip:${getClientIp(req)}`,
                    limit: options.rateLimitMax ?? 20,
                    windowSeconds: options.rateLimitWindowSeconds ?? 60,
                });
                if (!rl.allowed) {
                    return {
                        user: null,
                        supabaseAdmin,
                        errorResponse: createRateLimitEdgeResponse(req, rl.retryAfter),
                    };
                }
            }
            return { user: null, supabaseAdmin, errorResponse: null, deductedCredits: 0 };
        }
        return {
            user: null,
            supabaseAdmin,
            errorResponse: new Response(
                JSON.stringify({ 
                    success: false, 
                    error: '인증 토큰이 유효하지 않거나 만료되었습니다. 다시 로그인해주세요.', 
                    code: 'INVALID_TOKEN' 
                }),
                { 
                    status: 401, 
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
                }
            )
        };
    }

    // 사용자 단위 AI/API Rate Limit
    if (!options.skipRateLimit) {
        const rl = await checkRateLimit(supabaseAdmin, {
            key: `ai:user:${user.id}`,
            limit: options.rateLimitMax ?? 20,
            windowSeconds: options.rateLimitWindowSeconds ?? 60,
        });
        if (!rl.allowed) {
            return {
                user,
                supabaseAdmin,
                errorResponse: createRateLimitEdgeResponse(req, rl.retryAfter),
            };
        }
    }

    return {
        user,
        supabaseAdmin,
        errorResponse: null,
        deductedCredits: 0
    };
}
