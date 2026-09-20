-- ==============================================================================
-- 05_admin_rls_coverage.sql
-- 관리자 테이블 및 주요 사용자 테이블의 RLS 정책 마무리
-- 대상: pricing_plans, deep_report_requests, inquiries, deep_reports(존재 시)
-- ==============================================================================

-- 1. pricing_plans (요금제 정보)
-- - 일반 사용자/익명: 공개 조회 (SELECT)
-- - 관리자(admin): 등록/수정/삭제 등 전체 권한 (ALL)
ALTER TABLE IF EXISTS pricing_plans ENABLE ROW LEVEL SECURITY;

-- 기존 중복 및 레거시 정책 정리
DROP POLICY IF EXISTS "Pricing plans are viewable by everyone." ON pricing_plans;
DROP POLICY IF EXISTS "Public_View_Plans_New" ON pricing_plans;
DROP POLICY IF EXISTS "Anyone can view pricing plans" ON pricing_plans;
DROP POLICY IF EXISTS "Public access to pricing_plans" ON pricing_plans;
DROP POLICY IF EXISTS "Admin_Manage_Plans_New" ON pricing_plans;
DROP POLICY IF EXISTS "Admins can manage pricing plans" ON pricing_plans;
DROP POLICY IF EXISTS "pricing_plans_select_public" ON pricing_plans;
DROP POLICY IF EXISTS "pricing_plans_admin_all" ON pricing_plans;

-- 공개 조회 허용
CREATE POLICY "pricing_plans_select_public" ON pricing_plans
    FOR SELECT
    TO public
    USING (true);

-- 관리자 전체 권한 허용
CREATE POLICY "pricing_plans_admin_all" ON pricing_plans
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );


-- 2. deep_report_requests (심층 리포트 신청 내역)
-- - 일반 사용자: 본인 신청 내역만 조회 (SELECT) 및 본인 신청서 등록 (INSERT)
-- - 비회원(게스트): user_id IS NULL 상태로 신청서 등록 (INSERT)
-- - 관리자(admin): 전체 내역 조회, 상태 업데이트, 삭제 등 전체 권한 (ALL)
ALTER TABLE IF EXISTS deep_report_requests ENABLE ROW LEVEL SECURITY;

-- 기존 정책 정리 (누수 정책 포함 제거)
DROP POLICY IF EXISTS "Anyone can read reservation date counts for availability" ON deep_report_requests;
DROP POLICY IF EXISTS "Users can view their own requests or admin views all" ON deep_report_requests;
DROP POLICY IF EXISTS "Admins can view all deep report requests" ON deep_report_requests;
DROP POLICY IF EXISTS "Admins can update deep report requests" ON deep_report_requests;
DROP POLICY IF EXISTS "Allow insert for authenticated and guest users" ON deep_report_requests;
DROP POLICY IF EXISTS "deep_report_requests_select_own" ON deep_report_requests;
DROP POLICY IF EXISTS "deep_report_requests_insert_own_or_guest" ON deep_report_requests;
DROP POLICY IF EXISTS "deep_report_requests_admin_all" ON deep_report_requests;

-- 사용자 본인 조회
CREATE POLICY "deep_report_requests_select_own" ON deep_report_requests
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- 회원 본인 및 비회원 게스트 INSERT 허용
CREATE POLICY "deep_report_requests_insert_own_or_guest" ON deep_report_requests
    FOR INSERT
    TO public
    WITH CHECK (
        ((auth.uid() IS NOT NULL) AND (auth.uid() = user_id))
        OR ((auth.uid() IS NULL) AND (user_id IS NULL))
    );

-- 관리자 전체 관리 권한
CREATE POLICY "deep_report_requests_admin_all" ON deep_report_requests
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );


-- 3. inquiries (고객 1:1 문의)
-- - 일반 사용자: 본인 문의만 조회 (SELECT) 및 등록 (INSERT)
-- - 관리자(admin): 전체 문의 조회, 답변 작성(UPDATE), 삭제 등 전체 권한 (ALL)
ALTER TABLE IF EXISTS inquiries ENABLE ROW LEVEL SECURITY;

-- 기존 정책 정리
DROP POLICY IF EXISTS "Users can view their own inquiries" ON inquiries;
DROP POLICY IF EXISTS "Users can create their own inquiries" ON inquiries;
DROP POLICY IF EXISTS "inquiries_select_own" ON inquiries;
DROP POLICY IF EXISTS "inquiries_insert_own" ON inquiries;
DROP POLICY IF EXISTS "inquiries_admin_all" ON inquiries;

-- 사용자 본인 문의 조회
CREATE POLICY "inquiries_select_own" ON inquiries
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- 사용자 본인 문의 등록
CREATE POLICY "inquiries_insert_own" ON inquiries
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- 관리자 전체 관리 권한
CREATE POLICY "inquiries_admin_all" ON inquiries
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );


-- 4. deep_reports (별도 심층 리포트 테이블이 존재하는 경우 보호)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'deep_reports') THEN
        EXECUTE 'ALTER TABLE deep_reports ENABLE ROW LEVEL SECURITY';
        EXECUTE 'DROP POLICY IF EXISTS "deep_reports_select_own" ON deep_reports';
        EXECUTE 'DROP POLICY IF EXISTS "deep_reports_admin_all" ON deep_reports';
        
        EXECUTE 'CREATE POLICY "deep_reports_select_own" ON deep_reports
            FOR SELECT TO authenticated USING (auth.uid() = user_id)';
            
        EXECUTE 'CREATE POLICY "deep_reports_admin_all" ON deep_reports
            FOR ALL TO authenticated
            USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ''admin''))
            WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ''admin''))';
    END IF;
END $$;

