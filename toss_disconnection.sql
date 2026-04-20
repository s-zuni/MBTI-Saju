-- Toss 연결 해제를 기록하기 위한 컬럼 추가
-- 기존 웹앱 서비스에 영향을 주지 않도록 DEFAULT 값을 true로 설정합니다.

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS unlinked_at TIMESTAMPTZ;

-- 인덱스 추가 (조회 성능 최적화)
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active);
