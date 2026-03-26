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
 * 타임아웃 처리를 추가하여 Safari에서 getSession()이 무한 대기하는 현상을 방지합니다.
 */
export const ensureValidSession = async (): Promise<Session | null> => {
    const timeout = (ms: number) => new Promise((_, reject) => setTimeout(() => reject(new Error('Auth Timeout')), ms));

    try {
        // 1) 캐시에서 세션 가져오기 (타임아웃 적용)
        console.log('[ensureValidSession] 세션 확인 시작...');
        const sessionData = await Promise.race([
            supabase.auth.getSession(),
            timeout(3000) // 3초 타임아웃
        ]) as { data: { session: Session | null }, error: any };

        let session = sessionData.data.session;

        if (!session) {
            console.log('[ensureValidSession] 세션 없음');
            return null;
        }

        // 2) 토큰 만료 여부 확인 (만료 120초 전이면 미리 갱신)
        const expiresAt = session.expires_at ?? 0;
        const nowInSeconds = Math.floor(Date.now() / 1000);
        const isExpiringSoon = expiresAt - nowInSeconds < 120;

        if (isExpiringSoon) {
            console.log('[ensureValidSession] 토큰 만료 임박, 갱신 시도');
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
            if (!refreshError && refreshData.session) {
                return refreshData.session;
            }
        }

        // 3) 서버 사이드 검증 (getUser) - 지연 방지를 위해 타임아웃 적용
        try {
            const userData = await Promise.race([
                supabase.auth.getUser(),
                timeout(3000)
            ]) as { data: { user: any }, error: any };

            if (userData.error || !userData.data.user) {
                throw new Error('getUser failed');
            }
        } catch (e) {
            console.warn('[ensureValidSession] getUser 실패/타임아웃, refresh 시도');
            const { data: lastRefresh } = await supabase.auth.refreshSession();
            return lastRefresh.session;
        }

        return session;
    } catch (err: any) {
        console.error('[ensureValidSession] 중대한 예외 또는 타임아웃 발생:', err.message);
        // 타임아웃 발생 시, 현재 로컬에 저장된 세션이라도 반환해 보거나 null 반환
        return null; 
    }
};

