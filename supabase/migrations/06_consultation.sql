-- ==============================================================================
-- 06_consultation.sql
-- 유료 비동기 전문가 상담 시스템 테이블, RLS, RPC
-- 패턴: 04_security_patches.sql / 05_admin_rls_coverage.sql 동일 패턴 준수
-- ==============================================================================

-- ============================================================
-- 1. consultation_purchases 테이블 (결제 건별 질문 횟수 관리)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.consultation_purchases (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    order_id        text UNIQUE NOT NULL,
    payment_id      text,
    price_paid      integer NOT NULL,
    questions_granted integer NOT NULL DEFAULT 3,
    questions_used  integer NOT NULL DEFAULT 0,
    status          text NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'exhausted', 'refunded')),
    purchased_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consultation_purchases_user_id
    ON public.consultation_purchases(user_id);

-- ============================================================
-- 2. consultation_questions 테이블 (질문/답변 티켓)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.consultation_questions (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id     uuid NOT NULL REFERENCES public.consultation_purchases(id) ON DELETE CASCADE,
    user_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    question_text   text NOT NULL,
    ai_draft_answer text,
    admin_answer    text,
    status          text NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'answered')),
    created_at      timestamptz NOT NULL DEFAULT now(),
    answered_at     timestamptz,
    answered_by     uuid REFERENCES public.profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_consultation_questions_user_id
    ON public.consultation_questions(user_id);
CREATE INDEX IF NOT EXISTS idx_consultation_questions_purchase_id
    ON public.consultation_questions(purchase_id);
CREATE INDEX IF NOT EXISTS idx_consultation_questions_status
    ON public.consultation_questions(status);

-- ============================================================
-- 3. RLS: consultation_purchases
-- 사용자: 본인 것만 SELECT
-- 클라이언트 INSERT/UPDATE: 전면 차단
-- 관리자: ALL
-- 서버(service_role)는 RLS bypass로 자동 허용
-- ============================================================
ALTER TABLE public.consultation_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "consultation_purchases_select_own" ON public.consultation_purchases;
DROP POLICY IF EXISTS "consultation_purchases_admin_all" ON public.consultation_purchases;

-- 사용자 본인 조회만 허용
CREATE POLICY "consultation_purchases_select_own" ON public.consultation_purchases
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- 관리자 전체 권한
CREATE POLICY "consultation_purchases_admin_all" ON public.consultation_purchases
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- ============================================================
-- 4. RLS: consultation_questions
-- 사용자: 본인 것만 SELECT
-- 클라이언트 INSERT/UPDATE: 전면 차단
-- 관리자: ALL
-- ============================================================
ALTER TABLE public.consultation_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "consultation_questions_select_own" ON public.consultation_questions;
DROP POLICY IF EXISTS "consultation_questions_admin_all" ON public.consultation_questions;

-- 사용자 본인 조회만 허용
CREATE POLICY "consultation_questions_select_own" ON public.consultation_questions
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- 관리자 전체 권한
CREATE POLICY "consultation_questions_admin_all" ON public.consultation_questions
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- ============================================================
-- 5. RPC: consume_consultation_question
-- 원자적으로 질문 횟수 1 차감 + consultation_questions에 질문 저장
-- SECURITY DEFINER: service_role 권한 없이도 이 함수만 실행 가능
-- 단, 이 함수는 서버 측 API에서만 호출되어야 함 (클라이언트 직접 호출 금지)
-- ============================================================
CREATE OR REPLACE FUNCTION public.consume_consultation_question(
    p_user_id       uuid,
    p_question_text text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_purchase      public.consultation_purchases%ROWTYPE;
    v_question_id   uuid;
    v_total_count   integer;
BEGIN
    -- 1. 해당 사용자의 active 상태 구매 건 중 잔여 횟수가 있는 첫 번째 구매 건 조회 (FIFO)
    SELECT * INTO v_purchase
    FROM public.consultation_purchases
    WHERE user_id = p_user_id
      AND status = 'active'
      AND questions_used < questions_granted
    ORDER BY purchased_at ASC
    LIMIT 1
    FOR UPDATE;  -- 동시성 방지용 row lock

    IF NOT FOUND THEN
        -- 잔여 횟수 없음
        RETURN jsonb_build_object(
            'success', false,
            'code', 'INSUFFICIENT_QUESTIONS',
            'message', '잔여 상담 횟수가 없습니다.'
        );
    END IF;

    -- 2. 이 유저의 전체 consultation_questions 건수 확인 (첫 질문 여부 판단용)
    SELECT COUNT(*) INTO v_total_count
    FROM public.consultation_questions
    WHERE user_id = p_user_id;

    -- 3. 원자적 차감
    UPDATE public.consultation_purchases
    SET
        questions_used = questions_used + 1,
        status = CASE
                    WHEN questions_used + 1 >= questions_granted THEN 'exhausted'
                    ELSE 'active'
                 END
    WHERE id = v_purchase.id;

    -- 4. 질문 저장
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
$$;

-- 함수 실행 권한: authenticated 사용자는 직접 호출 불가 (서버에서만)
-- 서버 측은 service_role을 사용하므로 별도 GRANT 불필요.
-- 아래는 함수 직접 호출을 클라이언트에서 막기 위한 revoke (SECURITY DEFINER이므로 실행 컨텍스트가 owner)
REVOKE ALL ON FUNCTION public.consume_consultation_question(uuid, text) FROM public;
REVOKE ALL ON FUNCTION public.consume_consultation_question(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.consume_consultation_question(uuid, text) FROM authenticated;
-- service_role은 모든 권한 보유
GRANT EXECUTE ON FUNCTION public.consume_consultation_question(uuid, text) TO service_role;

CREATE OR REPLACE VIEW public.consultation_remaining
WITH (security_invoker = true)
AS
SELECT
    user_id,
    SUM(questions_granted - questions_used) AS remaining_questions,
    COUNT(*) FILTER (WHERE status = 'active') AS active_purchases
FROM public.consultation_purchases
WHERE status = 'active'
  AND questions_used < questions_granted
GROUP BY user_id;

-- 뷰 RLS: security_invoker = true 를 통해 기반 테이블(consultation_purchases)의 RLS가 호출자 기준으로 자동 적용됨
GRANT SELECT ON public.consultation_remaining TO authenticated;

