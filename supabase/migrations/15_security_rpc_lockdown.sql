-- 15_security_rpc_lockdown.sql
-- SECURITY DEFINER RPC 권한 잠금, 내부 호출자 검증(admin/owner/service_role) 추가,
-- 및 function_search_path_mutable 보완 마이그레이션.

-- ============================================================================
-- 1. Admin RPC: check_is_admin_v3() + search_path 고정 + anon 실행 차단
-- ============================================================================

CREATE OR REPLACE FUNCTION public.admin_approve_verification_request(p_request_id uuid, p_target_role text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_hospital text;
  v_dept text;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' AND NOT check_is_admin_v3() THEN
    RAISE EXCEPTION 'Access denied. Only administrators can perform this action.';
  END IF;

  SELECT user_id, COALESCE(organization_name, hospital_or_school), department_or_major
  INTO v_user_id, v_hospital, v_dept
  FROM public.verification_requests
  WHERE id = p_request_id;

  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.verification_requests
  SET status = 'verified',
      reviewed_at = now(),
      reject_reason = NULL,
      updated_at = now()
  WHERE id = p_request_id;

  UPDATE public.profiles
  SET role = p_target_role,
      hospital_name = COALESCE(v_hospital, hospital_name),
      ward_name = COALESCE(v_dept, ward_name),
      updated_at = now()
  WHERE id = v_user_id;

  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_reject_verification_request(p_request_id uuid, p_reason text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' AND NOT check_is_admin_v3() THEN
    RAISE EXCEPTION 'Access denied. Only administrators can perform this action.';
  END IF;

  UPDATE public.verification_requests
  SET status = 'rejected',
      reject_reason = p_reason,
      reviewed_at = now(),
      updated_at = now()
  WHERE id = p_request_id;

  RETURN FOUND;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_get_dashboard_stats()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_total_users bigint;
    v_today_users bigint;
    v_total_posts bigint;
    v_pending_reports bigint;
    v_pending_verifications bigint;
    v_pending_inquiries bigint;
    v_total_revenue bigint;
    v_recent_users json;
BEGIN
    IF COALESCE(auth.role(), '') <> 'service_role' AND NOT check_is_admin_v3() THEN
        RAISE EXCEPTION 'Access denied. Only administrators can perform this action.';
    END IF;

    SELECT count(*) INTO v_total_users FROM public.profiles;
    SELECT count(*) INTO v_today_users FROM public.profiles WHERE created_at >= CURRENT_DATE;
    SELECT count(*) INTO v_total_posts FROM public.posts WHERE is_deleted = false;
    SELECT count(*) INTO v_pending_reports FROM public.community_reports WHERE status = 'pending';
    SELECT count(*) INTO v_pending_verifications FROM public.verification_requests WHERE status = 'pending';
    SELECT count(*) INTO v_pending_inquiries FROM public.support_inquiries WHERE status = 'pending';
    SELECT coalesce(sum(price_paid), 0) INTO v_total_revenue FROM public.credit_purchases WHERE status = 'active';

    SELECT json_agg(u) INTO v_recent_users FROM (
        SELECT id, name, email, role, created_at, hospital_name, ward_name, is_active
        FROM public.profiles
        ORDER BY created_at DESC
        LIMIT 10
    ) u;

    RETURN json_build_object(
        'total_users', v_total_users,
        'today_users', v_today_users,
        'today_visitors', GREATEST(v_today_users, 1),
        'total_posts', v_total_posts,
        'pending_reports', v_pending_reports,
        'pending_verifications', v_pending_verifications,
        'pending_inquiries', v_pending_inquiries,
        'total_revenue', v_total_revenue,
        'recent_users', coalesce(v_recent_users, '[]'::json)
    );
END;
$function$;

-- Frontend AdminDashboard.tsx:79 에서 authenticated(admin)로 호출함
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    user_cnt bigint;
    total_sales_amt bigint;
    refund_pending_cnt bigint;
    inquiry_pending_cnt bigint;
BEGIN
    IF COALESCE(auth.role(), '') <> 'service_role' AND NOT check_is_admin_v3() THEN
        RAISE EXCEPTION 'Access denied. Only administrators can perform this action.';
    END IF;

    SELECT count(*) INTO user_cnt FROM public.profiles;

    SELECT coalesce(sum(price_paid), 0) INTO total_sales_amt
    FROM public.credit_purchases
    WHERE status = 'active';

    SELECT count(*) INTO refund_pending_cnt
    FROM public.credit_purchases
    WHERE status = 'pending_refund';

    SELECT count(*) INTO inquiry_pending_cnt
    FROM public.support_inquiries
    WHERE status = 'pending';

    RETURN json_build_object(
        'user_count', user_cnt,
        'total_sales', total_sales_amt,
        'pending_refunds', refund_pending_cnt,
        'pending_inquiries', inquiry_pending_cnt
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_admin_analytics(
    p_start_date timestamp with time zone DEFAULT (now() - '7 days'::interval),
    p_end_date timestamp with time zone DEFAULT now()
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_total_duration BIGINT;
    v_avg_duration NUMERIC;
    v_total_sessions BIGINT;
    v_unique_users BIGINT;
    v_active_now BIGINT;
    v_service_stats JSONB;
    v_daily_trends JSONB;
    v_hourly_distribution JSONB;
    v_device_stats JSONB;
BEGIN
    IF COALESCE(auth.role(), '') <> 'service_role' AND NOT check_is_admin_v3() THEN
        RAISE EXCEPTION 'Access denied. Only administrators can perform this action.';
    END IF;

    SELECT
        COALESCE(SUM(total_duration_seconds), 0),
        COALESCE(ROUND(AVG(total_duration_seconds), 1), 0),
        COUNT(*),
        COUNT(DISTINCT COALESCE(user_id::text, anonymous_id))
    INTO
        v_total_duration,
        v_avg_duration,
        v_total_sessions,
        v_unique_users
    FROM public.app_sessions
    WHERE started_at >= p_start_date AND started_at <= p_end_date;

    SELECT COUNT(DISTINCT COALESCE(user_id::text, anonymous_id))
    INTO v_active_now
    FROM public.app_sessions
    WHERE last_active_at >= (NOW() - INTERVAL '5 minutes');

    SELECT COALESCE(jsonb_agg(sub), '[]'::jsonb)
    INTO v_service_stats
    FROM (
        SELECT
            service_key,
            service_name,
            COALESCE(SUM(duration_seconds), 0) AS total_duration,
            COALESCE(ROUND(AVG(duration_seconds), 1), 0) AS avg_duration,
            COUNT(DISTINCT COALESCE(user_id::text, session_id)) AS unique_users,
            COUNT(*) AS visit_count,
            CASE
                WHEN v_total_duration > 0 THEN
                    ROUND((COALESCE(SUM(duration_seconds), 0)::numeric / v_total_duration::numeric) * 100, 1)
                ELSE 0
            END AS duration_share
        FROM public.service_usage_logs
        WHERE started_at >= p_start_date AND started_at <= p_end_date
        GROUP BY service_key, service_name
        ORDER BY total_duration DESC
    ) sub;

    SELECT COALESCE(jsonb_agg(sub), '[]'::jsonb)
    INTO v_daily_trends
    FROM (
        SELECT
            TO_CHAR(d.day, 'YYYY-MM-DD') AS date,
            COALESCE(SUM(s.total_duration_seconds), 0) AS total_duration,
            COALESCE(ROUND(AVG(s.total_duration_seconds), 1), 0) AS avg_duration,
            COUNT(s.id) AS session_count,
            COUNT(DISTINCT COALESCE(s.user_id::text, s.anonymous_id)) AS unique_users
        FROM generate_series(DATE_TRUNC('day', p_start_date), DATE_TRUNC('day', p_end_date), '1 day'::interval) d(day)
        LEFT JOIN public.app_sessions s
            ON DATE_TRUNC('day', s.started_at) = d.day
        GROUP BY d.day
        ORDER BY d.day ASC
    ) sub;

    SELECT COALESCE(jsonb_agg(sub), '[]'::jsonb)
    INTO v_hourly_distribution
    FROM (
        SELECT
            h.hour,
            COUNT(s.id) AS session_count,
            COALESCE(SUM(s.total_duration_seconds), 0) AS total_duration
        FROM generate_series(0, 23) h(hour)
        LEFT JOIN public.app_sessions s
            ON EXTRACT(HOUR FROM s.started_at) = h.hour
            AND s.started_at >= p_start_date AND s.started_at <= p_end_date
        GROUP BY h.hour
        ORDER BY h.hour ASC
    ) sub;

    SELECT COALESCE(jsonb_agg(sub), '[]'::jsonb)
    INTO v_device_stats
    FROM (
        SELECT
            COALESCE(device_type, 'desktop_web') AS device_type,
            COUNT(*) AS session_count,
            COUNT(DISTINCT COALESCE(user_id::text, anonymous_id)) AS unique_users,
            COALESCE(SUM(total_duration_seconds), 0) AS total_duration
        FROM public.app_sessions
        WHERE started_at >= p_start_date AND started_at <= p_end_date
        GROUP BY device_type
        ORDER BY session_count DESC
    ) sub;

    RETURN jsonb_build_object(
        'overview', jsonb_build_object(
            'total_duration_seconds', v_total_duration,
            'avg_duration_seconds', v_avg_duration,
            'total_sessions', v_total_sessions,
            'unique_users', v_unique_users,
            'active_now', v_active_now
        ),
        'service_stats', v_service_stats,
        'daily_trends', v_daily_trends,
        'hourly_distribution', v_hourly_distribution,
        'device_stats', v_device_stats
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_get_waitlist_entries()
 RETURNS SETOF public.waitlist
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' AND NOT check_is_admin_v3() THEN
    RAISE EXCEPTION 'Access denied. Only administrators can perform this action.';
  END IF;

  RETURN QUERY SELECT * FROM public.waitlist ORDER BY created_at DESC;
END;
$function$;

-- ============================================================================
-- 2. User-scoped RPC (useCredits.ts:71): 본인/관리자/service_role만 조회 허용
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_available_credits_v2(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_profile_credits INTEGER;
    v_role TEXT;
    v_purchases JSONB;
BEGIN
    IF COALESCE(auth.role(), '') <> 'service_role'
       AND auth.uid() IS DISTINCT FROM p_user_id
       AND NOT check_is_admin_v3() THEN
        RAISE EXCEPTION 'Access denied.';
    END IF;

    SELECT credits, role INTO v_profile_credits, v_role FROM public.profiles WHERE id = p_user_id;

    IF v_role = 'admin' THEN
        RETURN jsonb_build_object(
            'profile_credits', 999999,
            'is_admin', true,
            'purchases', '[]'::jsonb
        );
    END IF;

    SELECT COALESCE(jsonb_agg(sub), '[]'::jsonb) INTO v_purchases
    FROM (
        SELECT * FROM public.credit_purchases
        WHERE user_id = p_user_id
          AND status = 'active'
          AND remaining_credits > 0
        ORDER BY purchased_at ASC
    ) sub;

    RETURN jsonb_build_object(
        'profile_credits', COALESCE(v_profile_credits, 0),
        'is_admin', false,
        'purchases', v_purchases
    );
END;
$function$;

-- ============================================================================
-- 3. Service-role-only RPC: 내부 service_role 검사 + search_path 고정
-- ============================================================================

CREATE OR REPLACE FUNCTION public.add_credits_after_payment(
    p_user_id uuid,
    p_credits integer,
    p_amount integer,
    p_payment_id text,
    p_plan_id text
)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_current_credits int;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Access denied. Service role required.';
  END IF;

  INSERT INTO public.profiles (id, credits, updated_at)
  VALUES (p_user_id, p_credits, now())
  ON CONFLICT (id) DO UPDATE
  SET credits = COALESCE(profiles.credits, 0) + p_credits,
      updated_at = now()
  RETURNING credits INTO v_current_credits;

  IF NOT EXISTS (SELECT 1 FROM public.credit_purchases WHERE payment_id = p_payment_id) THEN
    INSERT INTO public.credit_purchases (
      user_id, plan_id, purchased_credits, remaining_credits,
      price_paid, payment_id, status, purchased_at, created_at
    ) VALUES (
      p_user_id, p_plan_id, p_credits, p_credits,
      p_amount, p_payment_id, 'active', now(), now()
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'new_balance', v_current_credits
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_deep_report_status_to_paid(p_order_id text, p_payment_id text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Access denied. Service role required.';
  END IF;

  UPDATE public.deep_report_requests
  SET status = 'paid', payment_id = p_payment_id
  WHERE order_id = p_order_id AND status = 'pending_payment';
END;
$function$;

CREATE OR REPLACE FUNCTION public.deduct_credits(p_user_id uuid, p_service_type text, p_cost integer)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_remaining_cost INT := p_cost;
  v_deduct INT;
  v_rec RECORD;
  v_profile_credits INT;
  v_is_admin BOOLEAN := false;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Access denied. Service role required.';
  END IF;

  IF p_cost IS NULL OR p_cost <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Invalid credit cost');
  END IF;

  SELECT (role = 'admin') INTO v_is_admin
  FROM public.profiles
  WHERE id = p_user_id;

  IF v_is_admin IS TRUE THEN
    RETURN json_build_object('success', true, 'is_admin', true);
  END IF;

  SELECT COALESCE(SUM(remaining_credits), 0) INTO v_deduct FROM public.credit_purchases WHERE user_id = p_user_id AND status = 'active';
  SELECT COALESCE(credits, 0) INTO v_profile_credits FROM public.profiles WHERE id = p_user_id;
  IF (v_deduct + v_profile_credits) < p_cost THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient credits', 'current_credits', (v_deduct + v_profile_credits));
  END IF;

  IF v_profile_credits > 0 AND v_remaining_cost > 0 THEN
    v_deduct := LEAST(v_profile_credits, v_remaining_cost);
    UPDATE public.profiles SET credits = credits - v_deduct WHERE id = p_user_id;

    INSERT INTO public.credit_usages (user_id, purchase_id, credits_used, service_type, used_at)
    VALUES (p_user_id, NULL, v_deduct, LOWER(p_service_type), NOW());

    v_remaining_cost := v_remaining_cost - v_deduct;
  END IF;

  IF v_remaining_cost > 0 THEN
    FOR v_rec IN
      SELECT id, remaining_credits
      FROM public.credit_purchases
      WHERE user_id = p_user_id AND status = 'active' AND remaining_credits > 0
      ORDER BY purchased_at ASC
    LOOP
      EXIT WHEN v_remaining_cost <= 0;
      v_deduct := LEAST(v_rec.remaining_credits, v_remaining_cost);
      UPDATE public.credit_purchases SET remaining_credits = remaining_credits - v_deduct WHERE id = v_rec.id;

      INSERT INTO public.credit_usages (user_id, purchase_id, credits_used, service_type, used_at)
      VALUES (p_user_id, v_rec.id, v_deduct, LOWER(p_service_type), NOW());

      v_remaining_cost := v_remaining_cost - v_deduct;
    END LOOP;
  END IF;

  RETURN json_build_object('success', true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.deduct_credits_for_refund(p_user_id uuid, p_amount integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Access denied. Service role required.';
  END IF;

  UPDATE public.profiles
  SET coins = greatest(0, coins - p_amount)
  WHERE id = p_user_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.claim_mbti_saju_free_slot(p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_claimed boolean;
BEGIN
    IF COALESCE(auth.role(), '') <> 'service_role' THEN
        RAISE EXCEPTION 'Access denied. Service role required.';
    END IF;

    UPDATE public.profiles
    SET mbti_saju_free_used = true
    WHERE id = p_user_id
      AND mbti_saju_free_used = false
    RETURNING true INTO v_claimed;

    RETURN COALESCE(v_claimed, false);
END;
$function$;

CREATE OR REPLACE FUNCTION public.release_mbti_saju_free_slot(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF COALESCE(auth.role(), '') <> 'service_role' THEN
        RAISE EXCEPTION 'Access denied. Service role required.';
    END IF;

    UPDATE public.profiles
    SET mbti_saju_free_used = false
    WHERE id = p_user_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.consume_consultation_question(p_user_id uuid, p_question_text text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_purchase      public.consultation_purchases%ROWTYPE;
    v_question_id   uuid;
    v_total_count   integer;
    v_is_admin      boolean := false;
BEGIN
    IF COALESCE(auth.role(), '') <> 'service_role' THEN
        RAISE EXCEPTION 'Access denied. Service role required.';
    END IF;

    SELECT (role = 'admin') INTO v_is_admin
    FROM public.profiles
    WHERE id = p_user_id;

    IF v_is_admin IS TRUE THEN
        SELECT * INTO v_purchase
        FROM public.consultation_purchases
        WHERE user_id = p_user_id
        ORDER BY purchased_at DESC
        LIMIT 1;

        IF NOT FOUND THEN
            INSERT INTO public.consultation_purchases (
                user_id, order_id, payment_id, price_paid, questions_granted, questions_used, status
            ) VALUES (
                p_user_id, 'ADMIN_TEST_' || p_user_id || '_' || floor(extract(epoch from now())), 'ADMIN_FREE', 0, 999999, 0, 'active'
            ) RETURNING * INTO v_purchase;
        END IF;

        SELECT COUNT(*) INTO v_total_count
        FROM public.consultation_questions
        WHERE user_id = p_user_id;

        INSERT INTO public.consultation_questions (
            purchase_id, user_id, question_text, status
        ) VALUES (
            v_purchase.id, p_user_id, p_question_text, 'pending'
        ) RETURNING id INTO v_question_id;

        RETURN jsonb_build_object(
            'success',          true,
            'question_id',      v_question_id,
            'is_first_question', (v_total_count = 0),
            'questions_remaining', 999999,
            'is_admin',         true
        );
    END IF;

    SELECT * INTO v_purchase
    FROM public.consultation_purchases
    WHERE user_id = p_user_id
      AND status = 'active'
      AND questions_used < questions_granted
    ORDER BY purchased_at ASC
    LIMIT 1
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'INSUFFICIENT_QUESTIONS',
            'message', '잔여 상담 횟수가 없습니다.'
        );
    END IF;

    SELECT COUNT(*) INTO v_total_count
    FROM public.consultation_questions
    WHERE user_id = p_user_id;

    UPDATE public.consultation_purchases
    SET
        questions_used = questions_used + 1,
        status = CASE
                    WHEN questions_used + 1 >= questions_granted THEN 'exhausted'
                    ELSE 'active'
                 END
    WHERE id = v_purchase.id;

    INSERT INTO public.consultation_questions (
        purchase_id,
        user_id,
        question_text,
        status
    )
    VALUES (
        v_purchase.id,
        p_user_id,
        p_question_text,
        'pending'
    )
    RETURNING id INTO v_question_id;

    RETURN jsonb_build_object(
        'success',          true,
        'question_id',      v_question_id,
        'is_first_question', (v_total_count = 0),
        'questions_remaining', (v_purchase.questions_granted - v_purchase.questions_used - 1)
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.process_shop_order(
    p_user_id uuid,
    p_order_number text,
    p_total_amount integer,
    p_payment_key text,
    p_shipping_name text,
    p_shipping_phone text,
    p_shipping_address text,
    p_shipping_memo text,
    p_items jsonb
)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_order_id UUID;
    v_item JSONB;
    v_product_id UUID;
    v_quantity INTEGER;
BEGIN
    IF COALESCE(auth.role(), '') <> 'service_role' THEN
        RAISE EXCEPTION 'Access denied. Service role required.';
    END IF;

    INSERT INTO public.shop_orders (
        user_id, order_number, total_amount, status, payment_key,
        shipping_name, shipping_phone, shipping_address, shipping_memo
    ) VALUES (
        p_user_id, p_order_number, p_total_amount, 'paid', p_payment_key,
        p_shipping_name, p_shipping_phone, p_shipping_address, p_shipping_memo
    ) RETURNING id INTO v_order_id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_quantity := (v_item->>'quantity')::INTEGER;

        INSERT INTO public.shop_order_items (
            order_id, product_id, product_name, product_price, quantity, subtotal, selected_option
        ) VALUES (
            v_order_id,
            v_product_id,
            v_item->>'product_name',
            (v_item->>'product_price')::INTEGER,
            v_quantity,
            (v_item->>'subtotal')::INTEGER,
            v_item->>'selected_option'
        );

        UPDATE public.shop_products
        SET stock = stock - v_quantity,
            updated_at = now()
        WHERE id = v_product_id AND stock >= v_quantity;

        IF NOT FOUND THEN
            RAISE EXCEPTION '재고가 부족합니다. (상품 ID: %)', v_product_id;
        END IF;
    END LOOP;

    RETURN v_order_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.process_shop_order(
    p_user_id uuid,
    p_order_number text,
    p_total_amount integer,
    p_payment_key text,
    p_shipping_name text,
    p_shipping_phone text,
    p_shipping_address text,
    p_shipping_memo text,
    p_items jsonb,
    p_shipping_fee integer DEFAULT 0
)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_order_id UUID;
    v_item JSONB;
    v_product_id UUID;
    v_quantity INTEGER;
BEGIN
    IF COALESCE(auth.role(), '') <> 'service_role' THEN
        RAISE EXCEPTION 'Access denied. Service role required.';
    END IF;

    INSERT INTO public.shop_orders (
        user_id, order_number, total_amount, status, payment_key,
        shipping_name, shipping_phone, shipping_address, shipping_memo, shipping_fee
    ) VALUES (
        p_user_id, p_order_number, p_total_amount, 'paid', p_payment_key,
        p_shipping_name, p_shipping_phone, p_shipping_address, p_shipping_memo, p_shipping_fee
    ) RETURNING id INTO v_order_id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_quantity := (v_item->>'quantity')::INTEGER;

        INSERT INTO public.shop_order_items (
            order_id, product_id, product_name, product_price, quantity, subtotal, selected_option
        ) VALUES (
            v_order_id,
            v_product_id,
            v_item->>'product_name',
            (v_item->>'product_price')::INTEGER,
            v_quantity,
            (v_item->>'subtotal')::INTEGER,
            v_item->>'selected_option'
        );

        UPDATE public.shop_products
        SET stock = stock - v_quantity,
            updated_at = now()
        WHERE id = v_product_id AND stock >= v_quantity;

        IF NOT FOUND THEN
            RAISE EXCEPTION '재고가 부족합니다. (상품 ID: %)', v_product_id;
        END IF;
    END LOOP;

    RETURN v_order_id;
END;
$function$;

-- ============================================================================
-- 4. 나머지 트리거/레거시 함수 search_path 고정
-- ============================================================================

ALTER FUNCTION public.check_profile_update_columns() SET search_path TO 'public';
ALTER FUNCTION public.protect_profile_sensitive_fields() SET search_path TO 'public';
ALTER FUNCTION public.handle_new_user() SET search_path TO 'public';
ALTER FUNCTION public.handle_new_user_credits() SET search_path TO 'public';
ALTER FUNCTION public.handle_new_user_sync() SET search_path TO 'public';
ALTER FUNCTION public.search_clinical_knowledge(text, public.vector, double precision, integer) SET search_path TO 'public';
ALTER FUNCTION public.search_clinical_knowledge(public.vector, double precision, integer) SET search_path TO 'public';

-- ============================================================================
-- 5. EXECUTE 권한 최소화 (REVOKE / GRANT)
-- ============================================================================

-- 5-a. 서버(service_role) 전용 RPC 및 직접 RPC 호출이 불필요한 트리거/레거시 함수
REVOKE ALL ON FUNCTION public.add_credits_after_payment(uuid, integer, integer, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.add_credits_after_payment(uuid, integer, integer, text, text) TO service_role;

REVOKE ALL ON FUNCTION public.update_deep_report_status_to_paid(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_deep_report_status_to_paid(text, text) TO service_role;

REVOKE ALL ON FUNCTION public.deduct_credits(uuid, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_credits(uuid, text, integer) TO service_role;

REVOKE ALL ON FUNCTION public.deduct_credits_for_refund(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_credits_for_refund(uuid, integer) TO service_role;

REVOKE ALL ON FUNCTION public.claim_mbti_saju_free_slot(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_mbti_saju_free_slot(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.release_mbti_saju_free_slot(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_mbti_saju_free_slot(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.consume_consultation_question(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_consultation_question(uuid, text) TO service_role;

REVOKE ALL ON FUNCTION public.process_shop_order(uuid, text, integer, text, text, text, text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_shop_order(uuid, text, integer, text, text, text, text, text, jsonb) TO service_role;

REVOKE ALL ON FUNCTION public.process_shop_order(uuid, text, integer, text, text, text, text, text, jsonb, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_shop_order(uuid, text, integer, text, text, text, text, text, jsonb, integer) TO service_role;

REVOKE ALL ON FUNCTION public.search_clinical_knowledge(text, public.vector, double precision, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_clinical_knowledge(text, public.vector, double precision, integer) TO service_role;

REVOKE ALL ON FUNCTION public.search_clinical_knowledge(public.vector, double precision, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_clinical_knowledge(public.vector, double precision, integer) TO service_role;

-- 트리거 / 이벤트 트리거 함수는 PostgREST RPC 노출 제거 (트리거 실행 자체에는 영향 없음)
REVOKE ALL ON FUNCTION public.check_profile_update_columns() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_profile_sensitive_fields() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user_credits() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user_sync() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_deleted_profile() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_user_role_to_metadata() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;

-- 5-b. 프론트엔드에서 미사용인 레거시 Admin RPC (authenticated 포함 차단, service_role만 허용)
REVOKE ALL ON FUNCTION public.admin_approve_verification_request(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_approve_verification_request(uuid, text) TO service_role;

REVOKE ALL ON FUNCTION public.admin_reject_verification_request(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reject_verification_request(uuid, text) TO service_role;

REVOKE ALL ON FUNCTION public.admin_get_dashboard_stats() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_dashboard_stats() TO service_role;

REVOKE ALL ON FUNCTION public.get_admin_analytics(timestamp with time zone, timestamp with time zone) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_analytics(timestamp with time zone, timestamp with time zone) TO service_role;

REVOKE ALL ON FUNCTION public.admin_get_waitlist_entries() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_waitlist_entries() TO service_role;

-- 5-c. 프론트엔드 authenticated 호출이 필요한 RPC (anon만 차단, 내부 auth.uid()/check_is_admin_v3()로 방어)
REVOKE ALL ON FUNCTION public.get_user_available_credits_v2(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_available_credits_v2(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_admin_dashboard_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_stats() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_handle_report(uuid, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_handle_report(uuid, text, boolean) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_update_user_role(uuid, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_user_role(uuid, text, boolean) TO authenticated, service_role;

-- check_is_admin_v3()는 RLS 정책 내에서 anon/authenticated 쿼리 시 호출되므로 EXECUTE 유지
-- submit_waitlist_email(text)은 랜딩 사전예약용으로 유지
