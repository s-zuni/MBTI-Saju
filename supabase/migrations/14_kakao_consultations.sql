-- ==============================================================================
-- 14_kakao_consultations.sql
-- 카카오톡 채널 1:1 상담(계좌이체) 수동 접수 장부.
-- 고객은 비회원일 수 있으므로 profiles와 연결하지 않고, 관리자만 읽고 쓴다.
-- 패턴: 06_consultation.sql 의 admin 정책과 동일.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.kakao_consultations (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_code    text UNIQUE NOT NULL,                 -- 접수번호 (예: K1112-01)

    -- 상품/결제
    product         text NOT NULL CHECK (product IN ('single', 'triple')),
    price_paid      integer NOT NULL CHECK (price_paid >= 0),
    payment_method  text NOT NULL DEFAULT 'bank_transfer'
                        CHECK (payment_method IN ('bank_transfer', 'toss_link')),
    payment_status  text NOT NULL DEFAULT 'awaiting'
                        CHECK (payment_status IN ('awaiting', 'paid', 'refunded', 'cancelled')),
    depositor_name  text,
    paid_at         timestamptz,

    -- 내담자 정보
    customer_name   text NOT NULL,
    kakao_nickname  text,
    birth_date      date,
    birth_time      text,                                 -- 'HH:MM', 모르면 NULL
    is_lunar        boolean NOT NULL DEFAULT false,
    gender          text CHECK (gender IN ('male', 'female')),
    mbti            text,

    -- 상담
    question_text   text NOT NULL CHECK (char_length(question_text) <= 6000),
    ai_draft_answer text,
    admin_answer    text,
    status          text NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'answered')),
    answered_at     timestamptz,                          -- 카톡으로 답변을 전달한 시각
    answered_by     uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    memo            text,

    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kakao_consultations_status
    ON public.kakao_consultations(status, created_at DESC);

ALTER TABLE public.kakao_consultations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kakao_consultations_admin_all" ON public.kakao_consultations;

-- 관리자만 전체 권한. 일반 사용자/비로그인 정책은 만들지 않는다(= 접근 불가).
CREATE POLICY "kakao_consultations_admin_all" ON public.kakao_consultations
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

REVOKE ALL ON public.kakao_consultations FROM anon;
