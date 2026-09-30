-- 10_ai_result_cache.sql
-- AI 생성 결과 고정 저장소.
--  * 오늘/내일의 운세: 같은 날짜(KST)에는 항상 같은 결과를 보여주기 위함
--  * 자미두수: 같은 생년월일시/성별이면 항상 같은 결과(재과금 없이 재열람)
-- 쓰기는 서버(service role)만 수행한다. 사용자는 본인 행 조회만 가능.

CREATE TABLE IF NOT EXISTS public.ai_result_cache (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    cache_key   text NOT NULL,
    result      jsonb NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ai_result_cache_user_key_uniq UNIQUE (user_id, cache_key)
);

CREATE INDEX IF NOT EXISTS ai_result_cache_created_at_idx
    ON public.ai_result_cache (created_at);

ALTER TABLE public.ai_result_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_result_cache_select_own" ON public.ai_result_cache;
CREATE POLICY "ai_result_cache_select_own"
    ON public.ai_result_cache
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- INSERT/UPDATE/DELETE 정책을 의도적으로 만들지 않는다 (service role은 RLS를 우회한다).
REVOKE INSERT, UPDATE, DELETE ON public.ai_result_cache FROM anon, authenticated;
REVOKE ALL ON public.ai_result_cache FROM anon;
