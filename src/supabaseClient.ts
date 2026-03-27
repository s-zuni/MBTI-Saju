import { createClient, Session } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL as string
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder')) {
    console.error('CRITICAL: Supabase 환경 변수가 설정되지 않았습니다.');
}

// Safari-safe storage: localStorage 접근 불가 시 메모리 폴백
const memoryStorage: Record<string, string> = {};
const safariSafeStorage = {
    getItem: (key: string): string | null => {
        try { return localStorage.getItem(key); }
        catch { return memoryStorage[key] ?? null; }
    },
    setItem: (key: string, value: string): void => {
        try { localStorage.setItem(key, value); }
        catch { memoryStorage[key] = value; }
    },
    removeItem: (key: string): void => {
        try { localStorage.removeItem(key); }
        catch { delete memoryStorage[key]; }
    },
};

export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder',
    {
        auth: {
            storage: safariSafeStorage,
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true,
            flowType: 'pkce',
        }
    }
);

// 세션 캐시 및 갱신 큐 (Safari ITP 대응)
let globalSessionCache: Session | null = null;
let lastSessionFetchTime = 0;
let refreshPromise: Promise<Session | null> | null = null;

/**
 * API 호출 전 유효한 세션을 보장합니다.
 * 전역 프로미스를 사용하여 동시 호출 시 단 한 번만 갱신을 수행합니다.
 */
export const ensureValidSession = async (): Promise<Session | null> => {
    const now = Date.now();
    
    // 10초 이내 캐시 히트 (현재 갱신 중이 아닐 때만)
    if (!refreshPromise && globalSessionCache && (now - lastSessionFetchTime < 10000)) {
        return globalSessionCache;
    }

    // 이미 갱신 중이면 해당 프로미스를 반환하여 대기
    if (refreshPromise) return refreshPromise;

    // 갱신 시작
    refreshPromise = (async () => {
        let attempts = 0;
        const maxAttempts = 2; // 타임아웃 시 최대 2회 시도

        while (attempts < maxAttempts) {
            try {
                const sessionData = await Promise.race([
                    supabase.auth.getSession(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Auth Timeout')), 3000))
                ]) as { data: { session: Session | null }; error: any };

                const session = sessionData.data.session;
                
                if (session) {
                    // 토큰 만료 5분 전 자동 갱신
                    const expiresAt = session.expires_at ?? 0;
                    if (expiresAt - Math.floor(Date.now() / 1000) < 300) {
                        const { data, error } = await supabase.auth.refreshSession();
                        if (!error && data.session) {
                            globalSessionCache = data.session;
                            lastSessionFetchTime = Date.now();
                            return data.session;
                        }
                    }

                    globalSessionCache = session;
                    lastSessionFetchTime = Date.now();
                    return session;
                }
                
                // 세션이 없으면 루프 탈출
                globalSessionCache = null;
                return null;
            } catch (err) {
                attempts++;
                console.warn(`[Supabase] Session refresh attempt ${attempts} failed:`, err);
                if (attempts >= maxAttempts) break;
                await new Promise(r => setTimeout(r, 500)); // 재시도 전 대기
            }
        }
        
        refreshPromise = null;
        return globalSessionCache; 
    })();

    return refreshPromise;
};
