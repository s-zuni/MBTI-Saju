-- =============================================================================
-- 18_service_orders.sql
--
-- 목적:
--   1. 비회원/회원 단건 결제(490원/990원 SVC_*) 영속 주문 및 1회용(또는 5회권)
--      서버 검증용 receipt_token 저장 테이블(service_orders) 생성
--   2. AI 엔드포인트 호출 시 서버에서 원자적으로 사용 횟수를 차감/복구하는
--      consume_service_receipt / release_service_receipt_use RPC 추가 (service_role 전용)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.service_orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id text NOT NULL UNIQUE,
    payment_key text NOT NULL UNIQUE,
    service_type text NOT NULL,
    service_name text NOT NULL,
    amount integer NOT NULL CHECK (amount >= 0),
    status text NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'consumed', 'refunded')),
    receipt_token text NOT NULL UNIQUE,
    total_uses integer NOT NULL DEFAULT 1 CHECK (total_uses >= 1),
    remaining_uses integer NOT NULL DEFAULT 1 CHECK (remaining_uses >= 0),
    user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    customer_name text,
    client_ip text,
    created_at timestamptz NOT NULL DEFAULT now(),
    consumed_at timestamptz,
    refunded_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_service_orders_created_at ON public.service_orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_orders_service_type ON public.service_orders (service_type);
CREATE INDEX IF NOT EXISTS idx_service_orders_user_id ON public.service_orders (user_id) WHERE user_id IS NOT NULL;

ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_orders_admin_select" ON public.service_orders;
CREATE POLICY "service_orders_admin_select" ON public.service_orders
    FOR SELECT USING (public.check_is_admin_v3());

DROP POLICY IF EXISTS "service_orders_own_select" ON public.service_orders;
CREATE POLICY "service_orders_own_select" ON public.service_orders
    FOR SELECT USING ((SELECT auth.uid()) IS NOT NULL AND (SELECT auth.uid()) = user_id);

CREATE OR REPLACE FUNCTION public.consume_service_receipt(
    p_receipt_token text,
    p_allowed_types text[] DEFAULT NULL
)
RETURNS TABLE (
    order_id text,
    service_type text,
    remaining_uses integer,
    status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
    IF p_receipt_token IS NULL OR length(trim(p_receipt_token)) = 0 THEN
        RETURN;
    END IF;

    RETURN QUERY
    UPDATE public.service_orders so
    SET
        remaining_uses = so.remaining_uses - 1,
        status = CASE WHEN so.remaining_uses - 1 <= 0 THEN 'consumed' ELSE so.status END,
        consumed_at = CASE WHEN so.remaining_uses - 1 <= 0 THEN now() ELSE so.consumed_at END
    WHERE so.receipt_token = trim(p_receipt_token)
      AND so.status = 'paid'
      AND so.remaining_uses > 0
      AND (p_allowed_types IS NULL OR so.service_type = ANY(p_allowed_types))
    RETURNING so.order_id, so.service_type, so.remaining_uses, so.status;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_service_receipt(text, text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_service_receipt(text, text[]) TO service_role;

CREATE OR REPLACE FUNCTION public.release_service_receipt_use(
    p_receipt_token text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
    v_updated integer;
BEGIN
    IF p_receipt_token IS NULL OR length(trim(p_receipt_token)) = 0 THEN
        RETURN false;
    END IF;

    UPDATE public.service_orders
    SET
        remaining_uses = LEAST(total_uses, remaining_uses + 1),
        status = 'paid',
        consumed_at = CASE WHEN status = 'consumed' THEN NULL ELSE consumed_at END
    WHERE receipt_token = trim(p_receipt_token)
      AND status IN ('paid', 'consumed')
      AND remaining_uses < total_uses;

    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RETURN v_updated > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.release_service_receipt_use(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_service_receipt_use(text) TO service_role;
