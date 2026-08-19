-- 심층 리포트 구매 고객 이벤트 참여 기록 테이블
-- 1인 1회 제한을 위한 UNIQUE 제약 조건 포함

CREATE TABLE IF NOT EXISTS public.event_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  event_type text NOT NULL DEFAULT 'deep_report_credit_500',
  claimed_at timestamptz DEFAULT now(),
  order_id text,
  UNIQUE(user_id, event_type)
);

-- RLS 활성화
ALTER TABLE public.event_claims ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 본인의 이벤트 참여 기록만 조회 가능
CREATE POLICY "Users can read own claims" 
  ON public.event_claims 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- RLS 정책: 본인의 이벤트 참여 기록 삽입 가능
CREATE POLICY "Users can insert own claims" 
  ON public.event_claims 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Service role은 모든 작업 가능 (결제 API에서 사용)
CREATE POLICY "Service role full access" 
  ON public.event_claims 
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_event_claims_user_id ON public.event_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_event_claims_event_type ON public.event_claims(event_type);
