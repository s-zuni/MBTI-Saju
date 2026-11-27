import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { getCorsHeaders } from './cors';
import { checkRateLimit, createRateLimitEdgeResponse, getClientIp } from './rate-limit';

export const SERVICE_COSTS = {
    FORTUNE_TODAY: 0,
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
    LOVE_CRUSH: 990,
    SAJU_MATE: 990
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

export function extractServiceReceipt(req: Request | any): string | null {
    let receipt: string | null = null;
    if (typeof (req as Request).headers?.get === 'function') {
        receipt = (req as Request).headers.get('x-service-receipt');
    } else if (req.headers) {
        receipt = req.headers['x-service-receipt'] || req.headers['X-Service-Receipt'] || null;
    }
    return receipt && typeof receipt === 'string' && receipt.trim() ? receipt.trim() : null;
}

export async function releaseServiceReceipt(supabaseAdmin: SupabaseClient | null | undefined, receiptToken: string | null | undefined): Promise<void> {
    if (!supabaseAdmin || !receiptToken) return;
    try {
        await supabaseAdmin.rpc('release_service_receipt_use', { p_receipt_token: receiptToken });
    } catch (err) {
        console.warn('[auth] releaseServiceReceipt error:', err);
    }
}

export interface AuthOptions {
    serviceType?: ServiceType | string | undefined;
    cost?: number | undefined;
    allowAnonymous?: boolean | undefined;
    /** 유료 AI 엔드포인트의 경우 서버 발급 1회(또는 N회) 결제 티켓(`X-Service-Receipt`) 검증 필수 */
    requirePaymentReceipt?: boolean | undefined;
    allowedServiceTypes?: string[] | undefined;
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
    receiptToken?: string | null | undefined;
    remainingUses?: number | null | undefined;
}

/**
 * AI 엔드포인트 공통 인증, 결제 티켓 검증 및 Rate Limit 미들웨어 (Edge / Node 공용)
 */
export async function authenticateUser(req: Request | any, options: AuthOptions = {}): Promise<AuthResult> {
    const corsHeaders = getCorsHeaders(req);
    const supabaseAdmin = getSupabaseAdmin();
    const token = extractBearerToken(req);
    const receiptToken = extractServiceReceipt(req);
    const requireAuth = options.allowAnonymous === false;
    let authedUser: User | null = null;

    if (!token) {
        if (requireAuth) {
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
    } else {
        // Supabase JWT 검증
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

        if (authError || !user) {
            if (requireAuth) {
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
        } else {
            authedUser = user;
            if (!options.skipRateLimit) {
                const rl = await checkRateLimit(supabaseAdmin, {
                    key: `ai:user:${user.id}`,
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
        }
    }

    if (options.requirePaymentReceipt) {
        let isAdminBypass = false;
        if (authedUser) {
            const { data: profileRow } = await supabaseAdmin
                .from('profiles')
                .select('role')
                .eq('id', authedUser.id)
                .maybeSingle();
            if (profileRow?.role === 'admin') {
                isAdminBypass = true;
            }
        }

        if (!isAdminBypass) {
            if (!receiptToken) {
                return {
                    user: authedUser,
                    supabaseAdmin,
                    errorResponse: new Response(
                        JSON.stringify({
                            success: false,
                            error: '결제 확인 티켓이 없습니다. 결제를 먼저 진행해 주세요.',
                            code: 'PAYMENT_REQUIRED',
                        }),
                        {
                            status: 402,
                            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                        }
                    ),
                };
            }

            const allowedTypes = options.allowedServiceTypes
                ?? (options.serviceType ? [String(options.serviceType)] : null);

            const { data: consumedRows, error: consumeError } = await supabaseAdmin.rpc('consume_service_receipt', {
                p_receipt_token: receiptToken,
                p_allowed_types: allowedTypes,
            });

            const consumed = Array.isArray(consumedRows) ? consumedRows[0] : consumedRows;
            if (consumeError || !consumed) {
                if (consumeError) {
                    console.error('[auth] consume_service_receipt error:', consumeError);
                }
                return {
                    user: authedUser,
                    supabaseAdmin,
                    errorResponse: new Response(
                        JSON.stringify({
                            success: false,
                            error: '유효하지 않거나 이미 사용된 결제 티켓입니다. 다시 결제해 주세요.',
                            code: 'INVALID_OR_USED_RECEIPT',
                        }),
                        {
                            status: 402,
                            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                        }
                    ),
                };
            }

            return {
                user: authedUser,
                supabaseAdmin,
                errorResponse: null,
                deductedCredits: 0,
                receiptToken,
                remainingUses: Number(consumed.remaining_uses ?? 0),
            };
        }
    }

    return {
        user: authedUser,
        supabaseAdmin,
        errorResponse: null,
        deductedCredits: 0,
        receiptToken: null,
        remainingUses: null,
    };
}
