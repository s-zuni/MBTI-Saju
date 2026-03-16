import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL as string
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY as string

// Explicit validation for environment variables
if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder')) {
    const errorMsg = 'CRITICAL: Supabase 환경 변수가 설정되지 않았습니다. .env 파일이나 Vercel 프로젝트 설정을 확인해주세요.';
    console.error(errorMsg);

    // In browser environment, show a clear alert once to the developer
    if (typeof window !== 'undefined') {
        const hasAlerted = (window as any)._supabaseAlertShown;
        if (!hasAlerted) {
            alert(errorMsg);
            (window as any)._supabaseAlertShown = true;
        }
    }
}

export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder',
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            flowType: 'pkce'
        }
    }
);

