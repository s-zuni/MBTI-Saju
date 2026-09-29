-- ==============================================================================
-- 09_mbti_saju_free_gate.sql
-- MBTI+사주 "첫 분석 무료" 자격을 서버(DB)가 단일 진실 소스로 판정하도록 변경.
--
-- 기존 문제: api/analysis-main.ts가 클라이언트가 보낸 isRegenerate 플래그를 그대로
-- 신뢰해 무료(0크레딧)/유료(재분석, 10크레딧) 여부를 결정했다. 이 플래그는 요청 body에
-- 실려오는 임의의 boolean이라, 로그인만 되어 있으면 isRegenerate:false를 반복 전송해
-- 무제한으로 무료 AI 생성을 받을 수 있었다.
--
-- 변경: profiles에 서버 전용 플래그 컬럼을 추가하고, 원자적 claim/release 함수로만
-- 상태를 바꿀 수 있게 한다. 일반 사용자는 이 컬럼을 직접 수정할 수 없다(트리거 보호).
-- ==============================================================================

-- 1. 무료 슬롯 사용 여부 컬럼 추가
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS mbti_saju_free_used boolean NOT NULL DEFAULT false;

-- 2. 04_security_patches.sql에서 만든 민감 필드 보호 트리거를 확장해
--    mbti_saju_free_used도 일반 사용자가 직접 수정하지 못하게 막는다.
CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_fields()
RETURNS TRIGGER AS $protect$
DECLARE
    caller_is_admin boolean := false;
    v_jwt_role text;
BEGIN
    -- Service Role(서버 백엔드) 호출인 경우 모든 변경 허용
    v_jwt_role := current_setting('request.jwt.claim.role', true);
    IF v_jwt_role = 'service_role' OR auth.role() = 'service_role' THEN
        RETURN NEW;
    END IF;

    SELECT (role = 'admin') INTO caller_is_admin
    FROM public.profiles
    WHERE id = auth.uid();

    IF caller_is_admin IS NOT TRUE THEN
        IF (NEW.role IS DISTINCT FROM OLD.role) THEN
            RAISE EXCEPTION '권한(role)을 직접 변경할 수 없습니다.';
        END IF;

        IF (NEW.credits IS DISTINCT FROM OLD.credits) THEN
            RAISE EXCEPTION '크레딧을 직접 수정할 수 없습니다.';
        END IF;

        IF (NEW.tier IS DISTINCT FROM OLD.tier) THEN
            RAISE EXCEPTION '등급(tier)을 직접 수정할 수 없습니다.';
        END IF;

        IF (NEW.mbti_saju_free_used IS DISTINCT FROM OLD.mbti_saju_free_used) THEN
            RAISE EXCEPTION '무료 분석 사용 여부를 직접 수정할 수 없습니다.';
        END IF;
    END IF;

    RETURN NEW;
END;
$protect$ LANGUAGE plpgsql SECURITY DEFINER;

-- (트리거 자체는 04_security_patches.sql에서 이미 생성됨 — 함수 본문만 갱신)

-- 3. 무료 슬롯을 원자적으로 "선점"하는 함수
--    - 아직 사용 전이면 즉시 true로 갱신하고 true를 반환 (동시 요청이 와도 단 1건만 성공)
--    - 이미 사용했다면 갱신 없이 false 반환 → 호출부는 유료(재분석) 경로로 처리
CREATE OR REPLACE FUNCTION public.claim_mbti_saju_free_slot(p_user_id uuid)
RETURNS boolean AS $claim$
DECLARE
    v_claimed boolean;
BEGIN
    UPDATE public.profiles
    SET mbti_saju_free_used = true
    WHERE id = p_user_id
      AND mbti_saju_free_used = false
    RETURNING true INTO v_claimed;

    RETURN COALESCE(v_claimed, false);
END;
$claim$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. AI 생성이 완전히 실패했을 때 무료 슬롯을 되돌려주는 함수
--    (모델 호출이 전부 실패해 결과를 못 받은 사용자가 무료 기회를 손해보지 않도록)
CREATE OR REPLACE FUNCTION public.release_mbti_saju_free_slot(p_user_id uuid)
RETURNS void AS $release$
BEGIN
    UPDATE public.profiles
    SET mbti_saju_free_used = false
    WHERE id = p_user_id;
END;
$release$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. 실행 권한은 서버(service_role)로 제한한다. 일반 클라이언트가 anon/authenticated
--    키로 이 RPC를 직접 호출할 이유가 없다.
REVOKE ALL ON FUNCTION public.claim_mbti_saju_free_slot(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.release_mbti_saju_free_slot(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_mbti_saju_free_slot(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_mbti_saju_free_slot(uuid) TO service_role;

-- 6. 소급 처리: 이미 분석을 완료한 기존 사용자는 무료 슬롯을 미리 소진 처리한다.
--    (auth.users.raw_user_meta_data에 analysis 키가 있다는 것은 이미 최소 1회
--    분석을 완료했다는 뜻 — 배포 시점에 "공짜 한 번 더"가 생기는 것을 방지)
--    SQL Editor는 service_role JWT 컨텍스트 없이 postgres로 실행되므로, 방금 만든
--    보호 트리거가 이 마이그레이션 자체의 UPDATE까지 막아버린다. 이 문장 동안만 끈다.
ALTER TABLE public.profiles DISABLE TRIGGER tr_protect_profile_sensitive_fields;

UPDATE public.profiles p
SET mbti_saju_free_used = true
FROM auth.users u
WHERE p.id = u.id
  AND p.mbti_saju_free_used = false
  AND u.raw_user_meta_data ? 'analysis';

ALTER TABLE public.profiles ENABLE TRIGGER tr_protect_profile_sensitive_fields;
