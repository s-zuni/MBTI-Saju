-- ==============================================================================
-- 07_consultation_view_fix.sql
-- consultation_remaining 뷰에 security_invoker = true 옵션 적용
-- 기본 Postgres 뷰는 생성자 권한(security_definer)으로 실행되어 기반 테이블 RLS를 우회하므로,
-- security_invoker = true 를 설정하여 호출자(authenticated 유저)의 RLS 정책이 적용되도록 수정합니다.
-- ==============================================================================

DROP VIEW IF EXISTS public.consultation_remaining;

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

-- 권한 부여: authenticated 사용자가 본인 잔여 횟수를 조회할 수 있도록 SELECT 권한 부여
GRANT SELECT ON public.consultation_remaining TO authenticated;

