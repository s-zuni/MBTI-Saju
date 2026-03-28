import { createClient, Session } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL as string
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder')) {
    console.error('CRITICAL: Supabase 환경 변수가 설정되지 않았습니다.');
}

// Safari-safe storage: localStorage 접근 불가 시 메모리 폴백
const memoryStorage: Record<string, string> = {};

// Safari 및 크로스 도메인 공유를 위한 고도화된 스토리지
const safariSafeStorage = {
    getItem: (key: string): string | null => {
        if (typeof document === 'undefined') return null;
        
        // 1. 쿠키에서 먼저 시도 (.mbtiju.com 도메인 공유 세션용)
        const name = key + "=";
        const currentCookie = (typeof document !== 'undefined' && document) ? document.cookie : "";
        const ca = decodeURIComponent(currentCookie).split(';');
        for (const cookie of ca) {
            const c = cookie.trim();
            if (c.indexOf(name) === 0) return c.substring(name.length, c.length);
        }

        // 2. 로컬 스토리지 시도 (기존 세션 유지용)
        try { return localStorage.getItem(key); }
        catch { return memoryStorage[key] ?? null; }
    },
    setItem: (key: string, value: string): void => {
        if (typeof document === 'undefined') return;

        // 1. 쿠키 설정 (.mbtiju.com 모든 서브도메인이 공유 가능하게 함)
        const expires = new Date();
        expires.setTime(expires.getTime() + (365 * 24 * 60 * 60 * 1000));
        
        // mbtiju.com 환경에서만 도메인 설정 적용 (로컬 환경 호환성 유지)
        const domainSuffix = (typeof window !== 'undefined' && window.location.hostname.includes('mbtiju.com')) 
            ? ';domain=.mbtiju.com' 
            : '';
            
        document.cookie = `${key}=${value};expires=${expires.toUTCString()};path=/${domainSuffix};SameSite=Lax;Secure`;

        // 2. 로컬 스토리지/메모리에도 동기화 (최종 백업)
        try { localStorage.setItem(key, value); }
        catch { memoryStorage[key] = value; }
    },
    removeItem: (key: string): void => {
        if (typeof document === 'undefined') return;
        
        // 1. 쿠키 삭제 (도메인 옵션 포함)
        const domainSuffix = (typeof window !== 'undefined' && window.location.hostname.includes('mbtiju.com')) 
            ? ';domain=.mbtiju.com' 
            : '';
        document.cookie = `${key}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/${domainSuffix}`;
        
        // 2. 로컬 스토리지/메모리 삭제
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
            storageKey: 'sb-mbtiju-auth',
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            flowType: 'pkce',
            // 💡 cookieOptions는 @supabase/ssr 전용이므로 제거하고
            // safariSafeStorage 내부에서 쿠키 도메인을 직접 관리합니다.
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
