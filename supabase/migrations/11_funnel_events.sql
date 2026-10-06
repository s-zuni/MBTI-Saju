-- 11_funnel_events.sql
-- 가입 → 구매 퍼널 측정 이벤트. 클라이언트(anon/authenticated)는 INSERT만 가능, 조회는 admin만.

CREATE TABLE IF NOT EXISTS public.funnel_events (
    id          bigserial PRIMARY KEY,
    event       text NOT NULL CHECK (char_length(event) <= 64),
    anon_id     text NOT NULL CHECK (char_length(anon_id) <= 64),
    user_id     uuid DEFAULT auth.uid(),
    path        text CHECK (char_length(path) <= 200),
    props       jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (pg_column_size(props) <= 2048),
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS funnel_events_event_created_idx
    ON public.funnel_events (event, created_at);

ALTER TABLE public.funnel_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "funnel_events_insert_any" ON public.funnel_events;
CREATE POLICY "funnel_events_insert_any"
    ON public.funnel_events
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (user_id IS NULL OR user_id = auth.uid());

DROP POLICY IF EXISTS "funnel_events_select_admin" ON public.funnel_events;
CREATE POLICY "funnel_events_select_admin"
    ON public.funnel_events
    FOR SELECT
    TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

REVOKE UPDATE, DELETE ON public.funnel_events FROM anon, authenticated;
GRANT INSERT ON public.funnel_events TO anon, authenticated;
GRANT USAGE ON SEQUENCE public.funnel_events_id_seq TO anon, authenticated;
