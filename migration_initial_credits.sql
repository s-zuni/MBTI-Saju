-- 신규 가입자 25크레딧 자동 지급 마이그레이션 SQL
-- 이 스크립트를 Supabase SQL Editor에서 실행해주세요.

-- 1. profiles 테이블의 credits 컬럼 기본값을 25로 설정
ALTER TABLE public.profiles ALTER COLUMN credits SET DEFAULT 25;

-- 2. 기존 가입자 중 크레딧이 0이거나 NULL인 경우 25크레딧 지급 (선택 사항)
-- UPDATE public.profiles SET credits = 25 WHERE credits = 0 OR credits IS NULL;

-- 3. 트리거 함수 생성 (더 확실한 지급을 위해)
CREATE OR REPLACE FUNCTION public.handle_new_user_credits()
RETURNS TRIGGER AS $$
BEGIN
  -- 신규 생성 시 credits이 명시되지 않았거나 0인 경우 25로 설정
  IF (NEW.credits IS NULL OR NEW.credits = 0) THEN
    NEW.credits := 25;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 트리거 설정 (INSERT 발생 시 실행)
DROP TRIGGER IF EXISTS on_profile_created_credits ON public.profiles;
CREATE TRIGGER on_profile_created_credits
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_credits();

-- 확인용 코멘트
COMMENT ON COLUMN public.profiles.credits IS '사용자의 현재 보유 크레딧 (가입 시 기본 25 지급)';
