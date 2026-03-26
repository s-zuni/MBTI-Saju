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
            // 세션 유지 활세화: 사용자 편의를 위해 Safari에서도 persistSession을 true로 설정합니다.
            // (ITP 관련 Hang 현상은 ensureValidSession과 useAuth의 타임아웃 로직으로 방어함)
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            flowType: 'pkce',
            storage: safariSafeStorage,
        }
    }
);

// 전역 세션 캐시 및 락 상태 관리
let globalSessionCache: Session | null = null;
let lastSessionFetchTime = 0;
let isRefreshingSession = false;

/**
 * Safari ITP 대응: API 호출 전 유효한 세션을 보장합니다.
 * 전역 캐시와 락(Lock)을 사용하여 Safari에서 다수 컴포넌트가 getSession()을
 * 동시 호출할 때 발생하는 교착 상태(Deadlock)를 방지합니다.
 */
export const ensureValidSession = async (): Promise<Session | null> => {
    const now = Date.now();
    
    // 1. 최근 10초 이내에 확인된 세션이 있다면 즉시 반환 (Safari hang 방지)
    if (globalSessionCache && (now - lastSessionFetchTime < 10000)) {
        return globalSessionCache;
    }

    // 2. 이미 다른 곳에서 세션을 갱신 중이라면 현재 캐시(또는 null) 반환
    if (isRefreshingSession) {
        return globalSessionCache;
    }

    isRefreshingSession = true;
    const timeout = (ms: number) => new Promise((_, reject) => setTimeout(() => reject(new Error('Auth Timeout')), ms));

    try {
        console.log('[ensureValidSession] 세션 확인 시작...');
        
        // 3. getSession() 호출 (타임아웃 적용)
        interface SessionResponse { data: { session: Session | null }; error: any }
        const sessionData = await Promise.race([
            supabase.auth.getSession(),
            timeout(2500) // 2.5초로 단축하여 빠른 응답 유도
        ]) as SessionResponse;

        let session = sessionData.data.session;

        // 세션 결과를 전역 캐시에 저장
        globalSessionCache = session;
        lastSessionFetchTime = Date.now();

        if (!session) {
            return null;
        }

        // 4. 토큰 만료 5분 전이면 갱신 시도
        const expiresAt = session.expires_at ?? 0;
        const nowInSeconds = Math.floor(Date.now() / 1000);
        const isExpiringSoon = expiresAt - nowInSeconds < 300;

        if (isExpiringSoon) {
            console.log('[ensureValidSession] 토큰 만료 임박, 갱신 시도');
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
            if (!refreshError && refreshData.session) {
                globalSessionCache = refreshData.session;
                return refreshData.session;
            }
        }

        return session;
    } catch (err: any) {
        console.warn('[ensureValidSession] 세션 확인 중 타임아웃/오류:', err.message);
        // 타임아웃 시 현재 캐시를 믿고 반환 (없으면 null)
        return globalSessionCache; 
    } finally {
        isRefreshingSession = false;
    }
};

