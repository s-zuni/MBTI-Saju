import { createClient, Session } from '@supabase/supabase-js'

const supabaseUrl = (process.env.REACT_APP_SUPABASE_URL || '').trim();
const supabaseAnonKey = (process.env.REACT_APP_SUPABASE_ANON_KEY || '').trim();

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder')) {
    console.warn('[Supabase] 환경 변수가 설정되지 않았습니다. .env 파일을 확인해주세요.');
}

/**
 * 표준 Supabase 클라이언트 설정 (React SPA 전용)
 */
export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder',
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            flowType: 'pkce',
            storageKey: 'sb-mbtiju-auth-v2' 
        }
    }
);

// 세션 관리 및 갱신 최적화를 위한 내부 상태
let globalSessionCache: Session | null = null;
let lastSessionFetchTime = 0;
let refreshPromise: Promise<Session | null> | null = null;

/**
 * API 호출 전 유효한 세션을 보장하는 안전 장치입니다.
 * 
 * 1. 최근 10초 내 조회한 세션이 있다면 캐시를 반환합니다.
 * 2. 동시 다발적인 세션 확인 요청 시 단 한 번의 네트워크 요청만 발생하도록 프로미스를 공유합니다.
 * 3. 만료가 임박(5분 미만)한 경우 자동으로 토큰을 갱신합니다.
 */
export const ensureValidSession = async (): Promise<Session | null> => {
    const now = Date.now();
    
    // 1. 캐시 히트: 10초 이내에 조회된 유효한 세션이 있는 경우
    if (!refreshPromise && globalSessionCache && (now - lastSessionFetchTime < 10000)) {
        return globalSessionCache;
    }

    // 2. 이미 갱신 중인 요청이 있다면 해당 프로미스 공유
    if (refreshPromise) return refreshPromise;

    // 3. 신규 세션 로드 및 검증 시작
    refreshPromise = (async () => {
        let attempts = 0;
        const maxAttempts = 2;

        try {
            while (attempts < maxAttempts) {
                try {
                    // 세션 조회를 타임아웃(3초)으로 보호
                    const { data: { session }, error } = await Promise.race([
                        supabase.auth.getSession(),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('Auth Timeout')), 3000))
                    ]) as { data: { session: Session | null }; error: any };

                    if (error) throw error;

                    if (session) {
                        // 세션 만료 5분 전이면 즉시 강제 갱신
                        const expiresAt = session.expires_at ?? 0;
                        const isExpiringSoon = expiresAt - Math.floor(Date.now() / 1000) < 300;

                        if (isExpiringSoon) {
                            const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
                            if (!refreshError && refreshed.session) {
                                globalSessionCache = refreshed.session;
                                lastSessionFetchTime = Date.now();
                                return refreshed.session;
                            }
                        }

                        globalSessionCache = session;
                        lastSessionFetchTime = Date.now();
                        return session;
                    }
                    
                    globalSessionCache = null;
                    return null;
                } catch (err) {
                    attempts++;
                    if (attempts >= maxAttempts) throw err;
                    await new Promise(r => setTimeout(r, 500)); // 재시도 전 짧은 대기
                }
            }
        } catch (err) {
            console.error('[Supabase] 세션 유효성 검사 최종 실패:', err);
            return globalSessionCache; // 에러 발생 시 최후의 수단으로 마지막 캐시 반환 시도
        } finally {
            refreshPromise = null;
        }
        return null;
    })();

    return refreshPromise;
};
