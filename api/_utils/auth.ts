import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { corsHeaders } from './cors';

export const SERVICE_COSTS = {
    FORTUNE_TODAY: 0,
    FORTUNE_TOMORROW: 3,
    MBTI_SAJU: 20,
    COMPATIBILITY_TRIP: 5,
    COMPATIBILITY: 5,
    TRIP: 5,
    JAMIDUSU: 15,
    KBO: 5,
    RELATIONSHIP_ADD: 5,
    AI_CHAT_5: 20,
    TAROT: 2,
    REGENERATE_MBTI_SAJU: 10,
    GOLD_WEALTH: 5,
    GOLD_BUSINESS: 5,
    GOLD_JOB: 5,
    GOLD_JOBCHANGE: 5,
    LOVE_COUPLE: 5,
    LOVE_MARRIED: 5,
    LOVE_MARRIAGE: 5,
    LOVE_REUNION: 5,
    LOVE_CRUSH: 5
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
}

export interface AuthResult {
    user: User | null;
    supabaseAdmin: SupabaseClient;
    errorResponse: Response | null;
    deductedCredits?: number | undefined;
}

/**
 * AI 엔드포인트 공통 인증 및 크레딧 차감 미들웨어 (Edge / Node 공용)
 */
export async function authenticateUser(req: Request | any, options: AuthOptions = {}): Promise<AuthResult> {
    const supabaseAdmin = getSupabaseAdmin();
    const token = extractBearerToken(req);

    if (!token) {
        if (options.allowAnonymous && (options.cost === 0 || !options.cost)) {
            return { user: null, supabaseAdmin, errorResponse: null };
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

    // 크레딧 차감 결정
    let costToDeduct = 0;
    if (typeof options.cost === 'number') {
        costToDeduct = options.cost;
    } else if (options.serviceType && options.serviceType in SERVICE_COSTS) {
        costToDeduct = SERVICE_COSTS[options.serviceType as ServiceType];
    }

    if (costToDeduct > 0) {
        const { data: deductResult, error: deductError } = await supabaseAdmin.rpc('deduct_credits', {
            p_user_id: user.id,
            p_service_type: options.serviceType || 'AI_SERVICE',
            p_cost: costToDeduct
        });

        if (deductError) {
            console.error('[auth] Credit deduction RPC error:', deductError);
            return {
                user,
                supabaseAdmin,
                errorResponse: new Response(
                    JSON.stringify({ 
                        success: false, 
                        error: '크레딧 처리 중 오류가 발생했습니다.', 
                        code: 'CREDIT_ERROR' 
                    }),
                    { 
                        status: 500, 
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
                    }
                )
            };
        }

        if (deductResult && deductResult.success === false) {
            return {
                user,
                supabaseAdmin,
                errorResponse: new Response(
                    JSON.stringify({ 
                        success: false, 
                        error: `크레딧이 부족합니다. (필요: ${costToDeduct}C, 보유: ${deductResult.current_credits ?? 0}C)`, 
                        code: 'INSUFFICIENT_CREDITS',
                        requiredCredits: costToDeduct,
                        currentCredits: deductResult.current_credits ?? 0
                    }),
                    { 
                        status: 402, 
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
                    }
                )
            };
        }
    }

    return { 
        user, 
        supabaseAdmin, 
        errorResponse: null, 
        deductedCredits: costToDeduct 
    };
}
