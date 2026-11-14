-- =============================================================================
-- 17_rate_limit_and_rls_cleanup.sql
--
-- 목적:
--   1. API Rate Limit 테이블(api_rate_limits) 및 원자적 check_rate_limit RPC 추가
--      (Edge / Node 서버리스 공용, service_role 전용)
--   2. check_is_admin_v3() STABLE 및 (select auth.uid()) 최적화
--   3. 중복 인덱스 정리 (posts.idx_posts_announcement)
--   4. 미사용 레거시/세션 테이블의 {public} true 정책 잠금
--      (schedules, custom_shift_codes, clinical_documents, clinical_knowledge_chunks,
--       app_sessions, service_usage_logs — 데이터 보존, 무단 접근/변경 차단)
--   5. auth_rls_initplan 및 multiple_permissive_policies 일괄 해소
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. API Rate Limiting (DB-backed atomic fixed window)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.api_rate_limits (
    bucket_key text PRIMARY KEY,
    window_start timestamptz NOT NULL DEFAULT clock_timestamp(),
    hit_count integer NOT NULL DEFAULT 1
);

ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.api_rate_limits FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.api_rate_limits TO service_role;

CREATE OR REPLACE FUNCTION public.check_rate_limit(
    p_key text,
    p_limit integer,
    p_window_seconds integer
)
RETURNS TABLE (
    allowed boolean,
    remaining integer,
    retry_after integer,
    current_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
    v_now timestamptz := clock_timestamp();
    v_window interval := make_interval(secs => GREATEST(1, p_window_seconds));
    v_hit integer;
    v_start timestamptz;
    v_retry integer;
BEGIN
    IF p_key IS NULL OR length(trim(p_key)) = 0 OR p_limit < 1 THEN
        RETURN QUERY SELECT true, 0, 0, 0;
        RETURN;
    END IF;

    INSERT INTO public.api_rate_limits (bucket_key, window_start, hit_count)
    VALUES (p_key, v_now, 1)
    ON CONFLICT (bucket_key) DO UPDATE
    SET
        hit_count = CASE
            WHEN public.api_rate_limits.window_start + v_window <= v_now THEN 1
            ELSE public.api_rate_limits.hit_count + 1
        END,
        window_start = CASE
            WHEN public.api_rate_limits.window_start + v_window <= v_now THEN v_now
            ELSE public.api_rate_limits.window_start
        END
    RETURNING public.api_rate_limits.hit_count, public.api_rate_limits.window_start
    INTO v_hit, v_start;

    -- 가끔 만료된 버킷 정리 (약 1% 확률)
    IF random() < 0.01 THEN
        DELETE FROM public.api_rate_limits
        WHERE public.api_rate_limits.window_start < v_now - interval '1 hour';
    END IF;

    v_retry := GREATEST(1, CEIL(EXTRACT(EPOCH FROM ((v_start + v_window) - v_now)))::integer);

    IF v_hit > p_limit THEN
        RETURN QUERY SELECT false, 0, v_retry, v_hit;
    ELSE
        RETURN QUERY SELECT true, (p_limit - v_hit), v_retry, v_hit;
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.check_rate_limit(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) TO service_role;

-- ---------------------------------------------------------------------------
-- 2. check_is_admin_v3() STABLE + (select auth.uid()) 최적화
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_is_admin_v3()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = (SELECT auth.uid())
          AND role = 'admin'
    );
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. 중복 인덱스 제거
-- ---------------------------------------------------------------------------
DROP INDEX IF EXISTS public.idx_posts_announcement;

-- ---------------------------------------------------------------------------
-- 4. 레거시/세션 테이블 잠금 (데이터 보존, {public} true 제거)
-- ---------------------------------------------------------------------------
-- schedules
DROP POLICY IF EXISTS "Allow public all access on schedules" ON public.schedules;
DROP POLICY IF EXISTS "schedules_admin_all" ON public.schedules;
CREATE POLICY "schedules_admin_all"
    ON public.schedules
    FOR ALL TO authenticated
    USING ((SELECT public.check_is_admin_v3()))
    WITH CHECK ((SELECT public.check_is_admin_v3()));

-- custom_shift_codes
DROP POLICY IF EXISTS "Allow public all access on custom_shift_codes" ON public.custom_shift_codes;
DROP POLICY IF EXISTS "custom_shift_codes_admin_all" ON public.custom_shift_codes;
CREATE POLICY "custom_shift_codes_admin_all"
    ON public.custom_shift_codes
    FOR ALL TO authenticated
    USING ((SELECT public.check_is_admin_v3()))
    WITH CHECK ((SELECT public.check_is_admin_v3()));

-- clinical_documents
DROP POLICY IF EXISTS "Allow public insert on clinical_documents" ON public.clinical_documents;
DROP POLICY IF EXISTS "Allow public read on clinical_documents" ON public.clinical_documents;
DROP POLICY IF EXISTS "clinical_documents_admin_all" ON public.clinical_documents;
CREATE POLICY "clinical_documents_admin_all"
    ON public.clinical_documents
    FOR ALL TO authenticated
    USING ((SELECT public.check_is_admin_v3()))
    WITH CHECK ((SELECT public.check_is_admin_v3()));

-- clinical_knowledge_chunks
DROP POLICY IF EXISTS "Allow public insert on clinical_knowledge_chunks" ON public.clinical_knowledge_chunks;
DROP POLICY IF EXISTS "Allow public read on clinical_knowledge_chunks" ON public.clinical_knowledge_chunks;
DROP POLICY IF EXISTS "clinical_knowledge_chunks_admin_all" ON public.clinical_knowledge_chunks;
CREATE POLICY "clinical_knowledge_chunks_admin_all"
    ON public.clinical_knowledge_chunks
    FOR ALL TO authenticated
    USING ((SELECT public.check_is_admin_v3()))
    WITH CHECK ((SELECT public.check_is_admin_v3()));

-- app_sessions ({public} UPDATE/INSERT true 제거)
DROP POLICY IF EXISTS "Admins can select sessions" ON public.app_sessions;
DROP POLICY IF EXISTS "Anyone can insert sessions" ON public.app_sessions;
DROP POLICY IF EXISTS "Anyone can update own sessions" ON public.app_sessions;
CREATE POLICY "Admins can select sessions"
    ON public.app_sessions
    FOR SELECT TO authenticated
    USING ((SELECT public.check_is_admin_v3()) OR (SELECT auth.uid()) = user_id);
CREATE POLICY "Users can insert own sessions"
    ON public.app_sessions
    FOR INSERT TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);

-- service_usage_logs ({public} UPDATE/INSERT true 제거)
DROP POLICY IF EXISTS "Admins can select service logs" ON public.service_usage_logs;
DROP POLICY IF EXISTS "Anyone can insert service logs" ON public.service_usage_logs;
DROP POLICY IF EXISTS "Anyone can update service logs" ON public.service_usage_logs;
CREATE POLICY "Admins can select service logs"
    ON public.service_usage_logs
    FOR SELECT TO authenticated
    USING ((SELECT public.check_is_admin_v3()) OR (SELECT auth.uid()) = user_id);
CREATE POLICY "Users can insert own service logs"
    ON public.service_usage_logs
    FOR INSERT TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- 5. 서비스 테이블 RLS initplan & 다중 허용 정책 정리
-- ---------------------------------------------------------------------------
-- ai_result_cache
DROP POLICY IF EXISTS "ai_result_cache_select_own" ON public.ai_result_cache;
CREATE POLICY "ai_result_cache_select_own"
    ON public.ai_result_cache
    FOR SELECT TO authenticated
    USING ((SELECT auth.uid()) = user_id);

-- analyses
DROP POLICY IF EXISTS "Users can insert own analyses" ON public.analyses;
DROP POLICY IF EXISTS "Users can view own analyses" ON public.analyses;
CREATE POLICY "Users can insert own analyses"
    ON public.analyses
    FOR INSERT TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can view own analyses"
    ON public.analyses
    FOR SELECT TO authenticated
    USING ((SELECT auth.uid()) = user_id);

-- chat_sessions
DROP POLICY IF EXISTS "Users can view their own sessions." ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can insert their own sessions." ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can update their own sessions." ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can delete their own sessions." ON public.chat_sessions;
CREATE POLICY "Users can view their own sessions."
    ON public.chat_sessions
    FOR SELECT TO authenticated
    USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can insert their own sessions."
    ON public.chat_sessions
    FOR INSERT TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can update their own sessions."
    ON public.chat_sessions
    FOR UPDATE TO authenticated
    USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can delete their own sessions."
    ON public.chat_sessions
    FOR DELETE TO authenticated
    USING ((SELECT auth.uid()) = user_id);

-- chat_messages
DROP POLICY IF EXISTS "Users can view messages of their sessions." ON public.chat_messages;
DROP POLICY IF EXISTS "Users can insert messages to their sessions." ON public.chat_messages;
CREATE POLICY "Users can view messages of their sessions."
    ON public.chat_messages
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.chat_sessions
        WHERE chat_sessions.id = chat_messages.session_id
          AND chat_sessions.user_id = (SELECT auth.uid())
    ));
CREATE POLICY "Users can insert messages to their sessions."
    ON public.chat_messages
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.chat_sessions
        WHERE chat_sessions.id = chat_messages.session_id
          AND chat_sessions.user_id = (SELECT auth.uid())
    ));

-- coin_transactions
DROP POLICY IF EXISTS "Users can view their own transactions." ON public.coin_transactions;
DROP POLICY IF EXISTS "Users can insert their own transactions." ON public.coin_transactions;
CREATE POLICY "Users can view their own transactions."
    ON public.coin_transactions
    FOR SELECT TO authenticated
    USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can insert their own transactions."
    ON public.coin_transactions
    FOR INSERT TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);

-- posts (SELECT 공개 유지, CUD authenticated로 정리)
DROP POLICY IF EXISTS "Authenticated users can insert posts." ON public.posts;
DROP POLICY IF EXISTS "Admins can update posts" ON public.posts;
DROP POLICY IF EXISTS "Admins can delete posts" ON public.posts;
CREATE POLICY "Authenticated users can insert posts."
    ON public.posts
    FOR INSERT TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Admins can update posts"
    ON public.posts
    FOR UPDATE TO authenticated
    USING ((SELECT public.check_is_admin_v3()) OR (SELECT auth.uid()) = user_id);
CREATE POLICY "Admins can delete posts"
    ON public.posts
    FOR DELETE TO authenticated
    USING ((SELECT public.check_is_admin_v3()) OR (SELECT auth.uid()) = user_id);

-- comments (SELECT 공개 유지, CUD authenticated로 정리)
DROP POLICY IF EXISTS "Authenticated users can insert comments." ON public.comments;
DROP POLICY IF EXISTS "Admins can update comments" ON public.comments;
DROP POLICY IF EXISTS "Admins can delete comments" ON public.comments;
CREATE POLICY "Authenticated users can insert comments."
    ON public.comments
    FOR INSERT TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Admins can update comments"
    ON public.comments
    FOR UPDATE TO authenticated
    USING ((SELECT public.check_is_admin_v3()) OR (SELECT auth.uid()) = user_id);
CREATE POLICY "Admins can delete comments"
    ON public.comments
    FOR DELETE TO authenticated
    USING ((SELECT public.check_is_admin_v3()) OR (SELECT auth.uid()) = user_id);

-- community_reports
DROP POLICY IF EXISTS "Anyone can create reports" ON public.community_reports;
DROP POLICY IF EXISTS "Admins can view reports" ON public.community_reports;
DROP POLICY IF EXISTS "Admins can update reports" ON public.community_reports;
CREATE POLICY "Anyone can create reports"
    ON public.community_reports
    FOR INSERT TO authenticated
    WITH CHECK ((SELECT auth.uid()) = reporter_id);
CREATE POLICY "Admins can view reports"
    ON public.community_reports
    FOR SELECT TO authenticated
    USING ((SELECT public.check_is_admin_v3()));
CREATE POLICY "Admins can update reports"
    ON public.community_reports
    FOR UPDATE TO authenticated
    USING ((SELECT public.check_is_admin_v3()));

-- consultation_purchases (다중 SELECT 제거)
DROP POLICY IF EXISTS "consultation_purchases_admin_all" ON public.consultation_purchases;
DROP POLICY IF EXISTS "consultation_purchases_select_own" ON public.consultation_purchases;
CREATE POLICY "consultation_purchases_select_own_or_admin"
    ON public.consultation_purchases
    FOR SELECT TO authenticated
    USING ((SELECT auth.uid()) = user_id OR (SELECT public.check_is_admin_v3()));
CREATE POLICY "consultation_purchases_admin_insert"
    ON public.consultation_purchases
    FOR INSERT TO authenticated
    WITH CHECK ((SELECT public.check_is_admin_v3()));
CREATE POLICY "consultation_purchases_admin_update"
    ON public.consultation_purchases
    FOR UPDATE TO authenticated
    USING ((SELECT public.check_is_admin_v3()))
    WITH CHECK ((SELECT public.check_is_admin_v3()));
CREATE POLICY "consultation_purchases_admin_delete"
    ON public.consultation_purchases
    FOR DELETE TO authenticated
    USING ((SELECT public.check_is_admin_v3()));

-- consultation_questions (다중 SELECT 제거)
DROP POLICY IF EXISTS "consultation_questions_admin_all" ON public.consultation_questions;
DROP POLICY IF EXISTS "consultation_questions_select_own" ON public.consultation_questions;
CREATE POLICY "consultation_questions_select_own_or_admin"
    ON public.consultation_questions
    FOR SELECT TO authenticated
    USING ((SELECT auth.uid()) = user_id OR (SELECT public.check_is_admin_v3()));
CREATE POLICY "consultation_questions_admin_insert"
    ON public.consultation_questions
    FOR INSERT TO authenticated
    WITH CHECK ((SELECT public.check_is_admin_v3()));
CREATE POLICY "consultation_questions_admin_update"
    ON public.consultation_questions
    FOR UPDATE TO authenticated
    USING ((SELECT public.check_is_admin_v3()))
    WITH CHECK ((SELECT public.check_is_admin_v3()));
CREATE POLICY "consultation_questions_admin_delete"
    ON public.consultation_questions
    FOR DELETE TO authenticated
    USING ((SELECT public.check_is_admin_v3()));

-- credit_purchases (다중 SELECT 제거)
DROP POLICY IF EXISTS "Users can view their own purchases" ON public.credit_purchases;
DROP POLICY IF EXISTS "admin_all_access_credit_purchases" ON public.credit_purchases;
CREATE POLICY "credit_purchases_select_own_or_admin"
    ON public.credit_purchases
    FOR SELECT TO authenticated
    USING ((SELECT auth.uid()) = user_id OR (SELECT public.check_is_admin_v3()));
CREATE POLICY "credit_purchases_admin_insert"
    ON public.credit_purchases
    FOR INSERT TO authenticated
    WITH CHECK ((SELECT public.check_is_admin_v3()));
CREATE POLICY "credit_purchases_admin_update"
    ON public.credit_purchases
    FOR UPDATE TO authenticated
    USING ((SELECT public.check_is_admin_v3()))
    WITH CHECK ((SELECT public.check_is_admin_v3()));
CREATE POLICY "credit_purchases_admin_delete"
    ON public.credit_purchases
    FOR DELETE TO authenticated
    USING ((SELECT public.check_is_admin_v3()));

-- credit_usages (중복 SELECT 정책 제거)
DROP POLICY IF EXISTS "Users can view their own credit usage" ON public.credit_usages;
DROP POLICY IF EXISTS "Users can view their own usages." ON public.credit_usages;
DROP POLICY IF EXISTS "Users can insert their own usages." ON public.credit_usages;
CREATE POLICY "Users can view their own usages."
    ON public.credit_usages
    FOR SELECT TO authenticated
    USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can insert their own usages."
    ON public.credit_usages
    FOR INSERT TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);

-- deep_report_requests (다중 SELECT/INSERT 제거)
DROP POLICY IF EXISTS "deep_report_requests_admin_all" ON public.deep_report_requests;
DROP POLICY IF EXISTS "deep_report_requests_insert_own_or_guest" ON public.deep_report_requests;
DROP POLICY IF EXISTS "deep_report_requests_select_own" ON public.deep_report_requests;
CREATE POLICY "deep_report_requests_select_own_or_admin"
    ON public.deep_report_requests
    FOR SELECT TO authenticated
    USING ((SELECT auth.uid()) = user_id OR (SELECT public.check_is_admin_v3()));
CREATE POLICY "deep_report_requests_insert_own_or_guest"
    ON public.deep_report_requests
    FOR INSERT TO anon, authenticated
    WITH CHECK (
        (((SELECT auth.uid()) IS NOT NULL) AND ((SELECT auth.uid()) = user_id))
        OR (((SELECT auth.uid()) IS NULL) AND (user_id IS NULL))
        OR (SELECT public.check_is_admin_v3())
    );
CREATE POLICY "deep_report_requests_admin_update"
    ON public.deep_report_requests
    FOR UPDATE TO authenticated
    USING ((SELECT public.check_is_admin_v3()))
    WITH CHECK ((SELECT public.check_is_admin_v3()));
CREATE POLICY "deep_report_requests_admin_delete"
    ON public.deep_report_requests
    FOR DELETE TO authenticated
    USING ((SELECT public.check_is_admin_v3()));

-- event_claims
DROP POLICY IF EXISTS "Users can read own claims" ON public.event_claims;
DROP POLICY IF EXISTS "Users can insert own claims" ON public.event_claims;
CREATE POLICY "Users can read own claims"
    ON public.event_claims
    FOR SELECT TO authenticated
    USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can insert own claims"
    ON public.event_claims
    FOR INSERT TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);

-- funnel_events
DROP POLICY IF EXISTS "funnel_events_insert_any" ON public.funnel_events;
DROP POLICY IF EXISTS "funnel_events_select_admin" ON public.funnel_events;
CREATE POLICY "funnel_events_insert_any"
    ON public.funnel_events
    FOR INSERT TO anon, authenticated
    WITH CHECK ((user_id IS NULL) OR (user_id = (SELECT auth.uid())));
CREATE POLICY "funnel_events_select_admin"
    ON public.funnel_events
    FOR SELECT TO authenticated
    USING ((SELECT public.check_is_admin_v3()));

-- inquiries (다중 SELECT/INSERT 제거)
DROP POLICY IF EXISTS "inquiries_admin_all" ON public.inquiries;
DROP POLICY IF EXISTS "inquiries_insert_own" ON public.inquiries;
DROP POLICY IF EXISTS "inquiries_select_own" ON public.inquiries;
CREATE POLICY "inquiries_select_own_or_admin"
    ON public.inquiries
    FOR SELECT TO authenticated
    USING ((SELECT auth.uid()) = user_id OR (SELECT public.check_is_admin_v3()));
CREATE POLICY "inquiries_insert_own_or_admin"
    ON public.inquiries
    FOR INSERT TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id OR (SELECT public.check_is_admin_v3()));
CREATE POLICY "inquiries_admin_update"
    ON public.inquiries
    FOR UPDATE TO authenticated
    USING ((SELECT public.check_is_admin_v3()))
    WITH CHECK ((SELECT public.check_is_admin_v3()));
CREATE POLICY "inquiries_admin_delete"
    ON public.inquiries
    FOR DELETE TO authenticated
    USING ((SELECT public.check_is_admin_v3()));

-- kakao_consultations
DROP POLICY IF EXISTS "kakao_consultations_admin_all" ON public.kakao_consultations;
CREATE POLICY "kakao_consultations_admin_all"
    ON public.kakao_consultations
    FOR ALL TO authenticated
    USING ((SELECT public.check_is_admin_v3()))
    WITH CHECK ((SELECT public.check_is_admin_v3()));

-- orders
DROP POLICY IF EXISTS "Users can view their own orders." ON public.orders;
DROP POLICY IF EXISTS "Users can insert their own orders." ON public.orders;
CREATE POLICY "Users can view their own orders."
    ON public.orders
    FOR SELECT TO authenticated
    USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can insert their own orders."
    ON public.orders
    FOR INSERT TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);

-- pricing_plans (다중 SELECT 제거)
DROP POLICY IF EXISTS "pricing_plans_admin_all" ON public.pricing_plans;
DROP POLICY IF EXISTS "pricing_plans_select_public" ON public.pricing_plans;
CREATE POLICY "pricing_plans_select_public"
    ON public.pricing_plans
    FOR SELECT TO anon, authenticated
    USING (true);
CREATE POLICY "pricing_plans_admin_insert"
    ON public.pricing_plans
    FOR INSERT TO authenticated
    WITH CHECK ((SELECT public.check_is_admin_v3()));
CREATE POLICY "pricing_plans_admin_update"
    ON public.pricing_plans
    FOR UPDATE TO authenticated
    USING ((SELECT public.check_is_admin_v3()))
    WITH CHECK ((SELECT public.check_is_admin_v3()));
CREATE POLICY "pricing_plans_admin_delete"
    ON public.pricing_plans
    FOR DELETE TO authenticated
    USING ((SELECT public.check_is_admin_v3()));

-- profiles (8개 중복 정책 → 단일 4개 정책으로 통합)
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "super_admin_select_policy" ON public.profiles;

CREATE POLICY "profiles_select_own_or_admin"
    ON public.profiles
    FOR SELECT TO authenticated
    USING ((SELECT auth.uid()) = id OR (SELECT public.check_is_admin_v3()));
CREATE POLICY "profiles_insert_own"
    ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK ((SELECT auth.uid()) = id);
CREATE POLICY "profiles_update_own_or_admin"
    ON public.profiles
    FOR UPDATE TO authenticated
    USING (
        (SELECT auth.uid()) = id
        OR (SELECT public.check_is_admin_v3())
        OR ((((SELECT auth.jwt()) -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text)
    )
    WITH CHECK (
        (SELECT auth.uid()) = id
        OR (SELECT public.check_is_admin_v3())
        OR ((((SELECT auth.jwt()) -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text)
    );
CREATE POLICY "profiles_delete_own_or_admin"
    ON public.profiles
    FOR DELETE TO authenticated
    USING ((SELECT auth.uid()) = id OR (SELECT public.check_is_admin_v3()));

-- reviews (다중 SELECT/INSERT 제거)
DROP POLICY IF EXISTS "Allow admin manage reviews" ON public.reviews;
DROP POLICY IF EXISTS "Allow authenticated insert reviews" ON public.reviews;
DROP POLICY IF EXISTS "Allow public select reviews" ON public.reviews;
CREATE POLICY "reviews_select_public"
    ON public.reviews
    FOR SELECT TO anon, authenticated
    USING (true);
CREATE POLICY "reviews_insert_authenticated"
    ON public.reviews
    FOR INSERT TO authenticated
    WITH CHECK ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY "reviews_admin_update"
    ON public.reviews
    FOR UPDATE TO authenticated
    USING ((SELECT public.check_is_admin_v3()))
    WITH CHECK ((SELECT public.check_is_admin_v3()));
CREATE POLICY "reviews_admin_delete"
    ON public.reviews
    FOR DELETE TO authenticated
    USING ((SELECT public.check_is_admin_v3()));

-- shop_cart & shop_wishlist
DROP POLICY IF EXISTS "Allow user all shop_cart" ON public.shop_cart;
CREATE POLICY "Allow user all shop_cart"
    ON public.shop_cart
    FOR ALL TO authenticated
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Allow user all shop_wishlist" ON public.shop_wishlist;
CREATE POLICY "Allow user all shop_wishlist"
    ON public.shop_wishlist
    FOR ALL TO authenticated
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

-- shop_products (다중 SELECT 제거)
DROP POLICY IF EXISTS "Allow admin insert/update/delete shop_products" ON public.shop_products;
DROP POLICY IF EXISTS "Allow public select shop_products" ON public.shop_products;
CREATE POLICY "shop_products_select_public"
    ON public.shop_products
    FOR SELECT TO anon, authenticated
    USING (is_active = true OR (SELECT public.check_is_admin_v3()));
CREATE POLICY "shop_products_admin_insert"
    ON public.shop_products
    FOR INSERT TO authenticated
    WITH CHECK ((SELECT public.check_is_admin_v3()));
CREATE POLICY "shop_products_admin_update"
    ON public.shop_products
    FOR UPDATE TO authenticated
    USING ((SELECT public.check_is_admin_v3()))
    WITH CHECK ((SELECT public.check_is_admin_v3()));
CREATE POLICY "shop_products_admin_delete"
    ON public.shop_products
    FOR DELETE TO authenticated
    USING ((SELECT public.check_is_admin_v3()));

-- shop_orders (다중 UPDATE 제거)
DROP POLICY IF EXISTS "Allow admin update shop_orders" ON public.shop_orders;
DROP POLICY IF EXISTS "Allow user insert own shop_orders" ON public.shop_orders;
DROP POLICY IF EXISTS "Allow user select own shop_orders" ON public.shop_orders;
DROP POLICY IF EXISTS "Allow user update own shop_orders" ON public.shop_orders;
CREATE POLICY "shop_orders_select_own_or_admin"
    ON public.shop_orders
    FOR SELECT TO authenticated
    USING ((SELECT auth.uid()) = user_id OR (SELECT public.check_is_admin_v3()));
CREATE POLICY "shop_orders_insert_own"
    ON public.shop_orders
    FOR INSERT TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "shop_orders_update_own_or_admin"
    ON public.shop_orders
    FOR UPDATE TO authenticated
    USING ((SELECT auth.uid()) = user_id OR (SELECT public.check_is_admin_v3()));

-- shop_order_items
DROP POLICY IF EXISTS "Allow user select own shop_order_items" ON public.shop_order_items;
DROP POLICY IF EXISTS "Allow user/admin insert shop_order_items" ON public.shop_order_items;
CREATE POLICY "shop_order_items_select_own_or_admin"
    ON public.shop_order_items
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.shop_orders
            WHERE shop_orders.id = shop_order_items.order_id
              AND shop_orders.user_id = (SELECT auth.uid())
        )
        OR (SELECT public.check_is_admin_v3())
    );
CREATE POLICY "shop_order_items_insert_own_or_admin"
    ON public.shop_order_items
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.shop_orders
            WHERE shop_orders.id = shop_order_items.order_id
              AND shop_orders.user_id = (SELECT auth.uid())
        )
        OR (SELECT public.check_is_admin_v3())
    );

-- site_settings
DROP POLICY IF EXISTS "Allow admin update access" ON public.site_settings;
CREATE POLICY "Allow admin update access"
    ON public.site_settings
    FOR UPDATE TO authenticated
    USING ((SELECT public.check_is_admin_v3()))
    WITH CHECK ((SELECT public.check_is_admin_v3()));

-- support_inquiries & support_inquiry_messages
DROP POLICY IF EXISTS "admin_all_access_support_inquiries" ON public.support_inquiries;
CREATE POLICY "support_inquiries_own_or_admin"
    ON public.support_inquiries
    FOR ALL TO authenticated
    USING ((SELECT auth.uid()) = user_id OR (SELECT public.check_is_admin_v3()))
    WITH CHECK ((SELECT auth.uid()) = user_id OR (SELECT public.check_is_admin_v3()));

DROP POLICY IF EXISTS "Insert messages" ON public.support_inquiry_messages;
DROP POLICY IF EXISTS "View messages" ON public.support_inquiry_messages;
CREATE POLICY "View messages"
    ON public.support_inquiry_messages
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.support_inquiries
            WHERE support_inquiries.id = support_inquiry_messages.inquiry_id
              AND support_inquiries.user_id = (SELECT auth.uid())
        )
        OR (SELECT public.check_is_admin_v3())
    );
CREATE POLICY "Insert messages"
    ON public.support_inquiry_messages
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.support_inquiries
            WHERE support_inquiries.id = support_inquiry_messages.inquiry_id
              AND support_inquiries.user_id = (SELECT auth.uid())
        )
        OR (SELECT public.check_is_admin_v3())
    );

-- tarot_readings
DROP POLICY IF EXISTS "Users can view their own readings" ON public.tarot_readings;
DROP POLICY IF EXISTS "Users can insert their own readings" ON public.tarot_readings;
CREATE POLICY "Users can view their own readings"
    ON public.tarot_readings
    FOR SELECT TO authenticated
    USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can insert their own readings"
    ON public.tarot_readings
    FOR INSERT TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);

-- verification_requests
DROP POLICY IF EXISTS "Users can view own verification requests" ON public.verification_requests;
DROP POLICY IF EXISTS "Users can insert own verification requests" ON public.verification_requests;
DROP POLICY IF EXISTS "Admins can update verification requests" ON public.verification_requests;
CREATE POLICY "Users can view own verification requests"
    ON public.verification_requests
    FOR SELECT TO authenticated
    USING ((SELECT auth.uid()) = user_id OR (SELECT public.check_is_admin_v3()));
CREATE POLICY "Users can insert own verification requests"
    ON public.verification_requests
    FOR INSERT TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Admins can update verification requests"
    ON public.verification_requests
    FOR UPDATE TO authenticated
    USING ((SELECT public.check_is_admin_v3()))
    WITH CHECK ((SELECT public.check_is_admin_v3()));

-- waitlist
DROP POLICY IF EXISTS "Admins can view waitlist" ON public.waitlist;
CREATE POLICY "Admins can view waitlist"
    ON public.waitlist
    FOR SELECT TO authenticated
    USING ((SELECT public.check_is_admin_v3()));
