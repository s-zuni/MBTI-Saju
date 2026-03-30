-- ==============================================================================
-- 1. 신규가입 20크레딧 기본 지급 중단
-- ==============================================================================
-- profiles 테이블의 credits 컬럼 기본값을 0으로 변경합니다.
ALTER TABLE public.profiles 
ALTER COLUMN credits SET DEFAULT 0;

-- [주의!] 만약 Supabase Dashboard > Database > Triggers 및 Functions 에 
-- 회원가입 시 자동으로 프로필을 생성하는 트리거(예: handle_new_user)가 있다면, 
-- 해당 함수 내부의 INSERT 구문에서도 20을 0으로 변경해주셔야 합니다. 
-- 예시: ... VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', 0);


-- ==============================================================================
-- 2. 요금제 정보(pricing_plans) 테이블에 새로운 3가지 요금제 강제 삽입/업데이트
-- ==============================================================================
-- 관리자 페이지 및 사용자 결제창에 정상적으로 최신 요금제가 노출되도록 반영합니다.
INSERT INTO public.pricing_plans (id, name, credits, price, original_price, description, is_popular, is_active, sort_order)
VALUES 
  ('credit_100', '프리미엄 100', 100, 4900, 15000, '100 크레딧을 즉시 충전합니다.', false, true, 1),
  ('credit_50', '스탠다드 50', 50, 2900, 10000, '50 크레딧을 즉시 충전합니다.', true, true, 2),
  ('credit_10', '스타터 10', 10, 900, 3000, '10 크레딧을 즉시 충전합니다.', false, true, 3)
ON CONFLICT (id) DO UPDATE 
SET 
  name = EXCLUDED.name,
  credits = EXCLUDED.credits,
  price = EXCLUDED.price,
  original_price = EXCLUDED.original_price,
  description = EXCLUDED.description,
  is_popular = EXCLUDED.is_popular,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order;
