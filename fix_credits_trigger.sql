-- [중요] 기존 가입자의 크레딧은 절대로 수정하지 않으며, 신규 가입자에게만 10 크레딧을 부여하도록 설정합니다.

-- 1. profiles 테이블의 credits 컬럼 기본값을 10으로 설정
ALTER TABLE public.profiles 
ALTER COLUMN credits SET DEFAULT 10;

-- 2. 회원가입 시 자동으로 프로필을 생성하는 트리거 함수(handle_new_user) 수정
-- 기존에 0이나 20으로 설정되어 있던 부분을 10으로 강제합니다.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, gender, mbti, birth_date, birth_time, credits)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'gender',
    new.raw_user_meta_data->>'mbti',
    new.raw_user_meta_data->>'birth_date',
    new.raw_user_meta_data->>'birth_time',
    10 -- 신규 가입자 초기 크레딧을 10으로 설정
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- [참고] 기존 유저들의 크레딧을 보존하기 위해 UPDATE 문은 포함하지 않았습니다.
