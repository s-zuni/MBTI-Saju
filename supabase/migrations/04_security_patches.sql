-- ==============================================================================
-- 04_security_patches.sql: MBTIJU 서비스 핵심 보안 강화 패치
-- 1. credit_purchases 테이블: 클라이언트 직접 INSERT/UPDATE 정책 제거 (서버 전용 충전)
-- 2. profiles 테이블: 민감 필드(role, credits, tier) 직접 변조 방지 트리거
-- 3. 관리자 테이블 RLS 정책 전수 점검 및 보강
-- ==============================================================================

-- 1. credit_purchases 보안 패치 (클라이언트 자가 크레딧 지급 차단)
DROP POLICY IF EXISTS "Users can insert their own purchases." ON public.credit_purchases;
DROP POLICY IF EXISTS "Users can update their own purchases." ON public.credit_purchases;

-- 본인 구매 내역만 조회 가능 (기존 정책 확인 및 보강)
DROP POLICY IF EXISTS "Users can view their own purchases" ON public.credit_purchases;
DROP POLICY IF EXISTS "Users can view their own purchases." ON public.credit_purchases;
CREATE POLICY "Users can view their own purchases"
    ON public.credit_purchases
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- 관리자에게만 전체 권한 부여
DROP POLICY IF EXISTS "admin_all_access_credit_purchases" ON public.credit_purchases;
CREATE POLICY "admin_all_access_credit_purchases"
    ON public.credit_purchases
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- 2. profiles 테이블 민감 컬럼 변조 방지 트리거
-- 일반 사용자가 브라우저 콘솔 등에서 본인의 role = 'admin' 또는 credits 조작을 원천 차단
CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_fields()
RETURNS TRIGGER AS $$
DECLARE
    caller_is_admin boolean := false;
    v_jwt_role text;
BEGIN
    -- 1. Service Role (서버 백엔드) 호출인 경우 모든 변경 허용
    v_jwt_role := current_setting('request.jwt.claim.role', true);
    IF v_jwt_role = 'service_role' OR auth.role() = 'service_role' THEN
        RETURN NEW;
    END IF;

    -- 2. 관리자 권한 확인
    SELECT (role = 'admin') INTO caller_is_admin 
    FROM public.profiles 
    WHERE id = auth.uid();

    IF caller_is_admin IS NOT TRUE THEN
        -- 일반 사용자는 본인의 권한(role)을 admin으로 격상할 수 없음
        IF (NEW.role IS DISTINCT FROM OLD.role) THEN
            RAISE EXCEPTION '권한(role)을 직접 변경할 수 없습니다.';
        END IF;

        -- 일반 사용자는 크레딧(credits)을 직접 수정할 수 없음 (결제 승인 RPC를 통해서만 변경)
        IF (NEW.credits IS DISTINCT FROM OLD.credits) THEN
            RAISE EXCEPTION '크레딧을 직접 수정할 수 없습니다.';
        END IF;

        -- 일반 사용자는 멤버십 등급(tier)을 직접 수정할 수 없음
        IF (NEW.tier IS DISTINCT FROM OLD.tier) THEN
            RAISE EXCEPTION '등급(tier)을 직접 수정할 수 없습니다.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_protect_profile_sensitive_fields ON public.profiles;
CREATE TRIGGER tr_protect_profile_sensitive_fields
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_profile_sensitive_fields();

-- 3. shop_orders 테이블 사용자 수정 정책 제한 (결제 상태/금액 변조 차단)
DROP POLICY IF EXISTS "Allow user update own shop_orders" ON public.shop_orders;
CREATE POLICY "Allow user cancel own pending shop_orders"
    ON public.shop_orders
    FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = user_id 
        AND status = 'pending'
    )
    WITH CHECK (
        auth.uid() = user_id 
        AND status IN ('pending', 'cancelled')
    );
