-- 1. profiles 테이블의 credits 기본값을 10으로 설정합니다.
-- 이 설정은 트리거 등이 프로필을 생성할 때 별도 명시가 없어도 10 크레딧을 부여하게 합니다.
ALTER TABLE public.profiles 
ALTER COLUMN credits SET DEFAULT 10;

-- 2. 신규 유저 생성 시 프로필을 자동으로 만드는 함수가 있다면, 여기서도 10을 부여하도록 수정합니다.
-- (기존에 20이나 0으로 되어있을 가능성이 있으므로 동기화가 필요합니다.)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, credits)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'User'), 
    10
  )
  ON CONFLICT (id) DO UPDATE SET
    credits = 10 -- 이미 생성되었으나 정보가 없는 경우 10으로 보정
  WHERE public.profiles.credits = 0 AND public.profiles.birth_date IS NULL;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. (선택 사항) 최근 1시간 내 가입했으나 0크레딧인 유저가 있다면 10으로 보정합니다.
-- UPDATE public.profiles 
-- SET credits = 10 
-- WHERE credits = 0 AND created_at > now() - interval '1 hour';
