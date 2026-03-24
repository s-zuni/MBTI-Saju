-- 커뮤니티 신고 기능 마이그레이션 SQL
-- 이 스크립트를 Supabase SQL Editor에서 실행해주세요.

-- 1. community_reports 테이블 생성
CREATE TABLE IF NOT EXISTS public.community_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID REFERENCES auth.users(id),
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- 게시물 신고 또는 댓글 신고 중 하나는 반드시 포함되어야 함
    CONSTRAINT report_target_check CHECK (
        (post_id IS NOT NULL AND comment_id IS NULL) OR 
        (post_id IS NULL AND comment_id IS NOT NULL)
    )
);

-- 2. RLS(Row Level Security) 설정
ALTER TABLE public.community_reports ENABLE ROW LEVEL SECURITY;

-- 2-1. 누구나(인증된 사용자) 신고를 작성할 수 있음
CREATE POLICY "Anyone can create reports" ON public.community_reports
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = reporter_id);

-- 2-2. 관리자만 신고 내역을 볼 수 있음
-- 프로필 테이블의 role 컬럼이 'admin'인 경우만 허용
CREATE POLICY "Admins can view reports" ON public.community_reports
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 2-3. 관리자만 신고 상태를 업데이트할 수 있음
CREATE POLICY "Admins can update reports" ON public.community_reports
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 3. 인덱스 추가 (조회 성능 최적화)
CREATE INDEX IF NOT EXISTS idx_community_reports_status ON public.community_reports(status);
CREATE INDEX IF NOT EXISTS idx_community_reports_created_at ON public.community_reports(created_at);

COMMENT ON TABLE public.community_reports IS '커뮤니티 게시물 및 댓글 신고 내역';
