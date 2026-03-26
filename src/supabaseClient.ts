import { createClient, Session } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL as string
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY as string

// Explicit validation for environment variables
if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder')) {
    const errorMsg = 'CRITICAL: Supabase 환경 변수가 설정되지 않았습니다. .env 파일이나 Vercel 프로젝트 설정을 확인해주세요.';
    console.error(errorMsg);

    if (typeof window !== 'undefined') {
        const hasAlerted = (window as any)._supabaseAlertShown;
        if (!hasAlerted) {
            alert(errorMsg);
            (window as any)._supabaseAlertShown = true;
        }
    }
}

// Safari-safe storage adapter: falls back to in-memory if localStorage is unavailable
const memoryStorage: Record<string, string> = {};

const safariSafeStorage = {
    getItem: (key: string): string | null => {
        try {
            return localStorage.getItem(key);
        } catch (e) {
            console.info('[safariSafeStorage] getItem fallback to memory:', key);
            return memoryStorage[key] ?? null;
        }
    },
    setItem: (key: string, value: string): void => {
        try {
            localStorage.setItem(key, value);
        } catch (e) {
            console.info('[safariSafeStorage] setItem fallback to memory:', key);
            memoryStorage[key] = value;
        }
    },
    removeItem: (key: string): void => {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            console.info('[safariSafeStorage] removeItem fallback to memory:', key);
            delete memoryStorage[key];
        }
    },
};

export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder',
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            flowType: 'pkce',
            storage: safariSafeStorage,
        }
    }
);

/**
 * Safari ITP 대응: API 호출 전 유효한 세션을 보장합니다.
 * 
 * getSession()은 localStorage 캐시에서만 읽어 만료된 토큰을 반환할 수 있습니다.
 * 이 함수는 토큰 만료 여부를 확인하고 필요 시 refreshSession()으로 갱신합니다.
 * 최종적으로 getUser()로 서버 사이드 검증을 수행합니다.
 */
export const ensureValidSession = async (): Promise<Session | null> => {
    try {
        // 1) 캐시에서 세션 가져오기
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            // 세션이 아예 없으면 null 반환
            return null;
        }

        // 2) 토큰 만료 여부 확인 (만료 60초 전이면 미리 갱신)
        const expiresAt = session.expires_at ?? 0;
        const nowInSeconds = Math.floor(Date.now() / 1000);
        const isExpiringSoon = expiresAt - nowInSeconds < 60;

        if (isExpiringSoon) {
            console.log('[ensureValidSession] 토큰 만료 임박, refreshSession 호출');
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
            if (refreshError) {
                console.warn('[ensureValidSession] refreshSession 실패:', refreshError.message);
                // refreshSession 실패 시 getUser()로 서버 검증 시도
            } else if (refreshData.session) {
                return refreshData.session;
            }
        }

        // 3) 서버 사이드 검증 (getUser는 토큰이 유효하지 않으면 에러 반환)
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            console.warn('[ensureValidSession] getUser 실패, 최종 refreshSession 시도:', userError?.message);
            // 토큰이 서버에서 거부됨 → 마지막으로 refresh 시도
            const { data: lastRefresh } = await supabase.auth.refreshSession();
            return lastRefresh.session;
        }

        // getUser 성공 → 현재 세션이 유효함
        // getSession()을 다시 호출하여 갱신된 세션 반환
        const { data: { session: validSession } } = await supabase.auth.getSession();
        return validSession;
    } catch (err) {
        console.error('[ensureValidSession] 예외 발생:', err);
        return null;
    }
};

