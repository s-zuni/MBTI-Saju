import { supabase } from '../supabaseClient';

// 가입 → 구매 퍼널 측정용 이벤트. 실패해도 사용자 흐름에 영향을 주지 않는다(fire-and-forget).
export type FunnelEvent =
    | 'landing_view'
    | 'preview_submit'
    | 'preview_result_view'
    | 'signup_cta_click'
    | 'signup_modal_open'
    | 'profile_modal_open'
    | 'profile_completed'
    | 'first_result_view'
    | 'credit_modal_open'
    | 'checkout_start'
    | 'checkout_success'
    | 'checkout_resume_click'
    | 'kakao_consult_click'
    | 'hero_free_preview_click'
    | 'hero_today_fortune_free_click'
    | 'free_preview_calculate'
    | 'free_preview_more_analysis_pay_click'
    | 'funnel_bottom_report_click'
    | 'funnel_bottom_kakao_consult_click'
    | 'hero_saju_mate_banner_click'
    | 'saju_mate_free_preview_open'
    | 'saju_mate_payment_click'
    | 'saju_mate_story_download'
    | 'saju_mate_link_share'
    | 'saju_mate_landing_view'
    | 'saju_mate_payment_success'
    | 'saju_mate_result_view'
    | 'saju_mate_error';

const ANON_KEY = 'mbtiju_anon_id';

const getAnonId = (): string => {
    try {
        let id = localStorage.getItem(ANON_KEY);
        if (!id) {
            id = `a_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
            localStorage.setItem(ANON_KEY, id);
        }
        return id;
    } catch {
        return 'a_unknown';
    }
};

export const track = (event: FunnelEvent, props: Record<string, string | number | boolean | null> = {}) => {
    try {
        const gtag = (window as any).gtag;
        if (typeof gtag === 'function') gtag('event', event, props);

        void Promise.resolve(
            supabase.from('funnel_events').insert({
                event,
                anon_id: getAnonId(),
                path: window.location.pathname,
                props,
            })
        ).catch(() => {});
    } catch {
        // 측정 실패는 무시
    }
};

// 같은 세션에서 한 번만 기록해야 하는 이벤트용
export const trackOnce = (event: FunnelEvent, props: Record<string, string | number | boolean | null> = {}) => {
    try {
        const k = `mbtiju_tracked_${event}`;
        if (sessionStorage.getItem(k)) return;
        sessionStorage.setItem(k, '1');
    } catch {
        // sessionStorage 불가 시 그냥 기록
    }
    track(event, props);
};
