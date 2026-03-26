-- 1. 기존의 제한적인 정책이 있다면 삭제 (정책 이름을 확인해야 하지만, 보통 아래와 같은 명령어로 새 정책을 추가하거나 덮어씁니다)
-- DROP POLICY IF EXISTS "Admins can manage pricing plans" ON public.pricing_plans;

-- 2. 관리자(profiles 테이블의 role이 'admin'인 사용자)에게 모든 권한을 부여하는 정책 생성
CREATE POLICY "Admins can manage pricing plans" 
ON public.pricing_plans 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
) 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ) ;

-- 3. 일반 사용자에게는 조회(SELECT) 권한만 부여 (이미 있다면 생략 가능)
-- DROP POLICY IF EXISTS "Anyone can view active pricing plans" ON public.pricing_plans;
CREATE POLICY "Anyone can view active pricing plans" 
ON public.pricing_plans 
FOR SELECT 
TO public 
USING (is_active = true);
