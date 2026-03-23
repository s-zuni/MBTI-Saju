-- 1. 인덱스 생성 (Performance Indexing)

-- posts 테이블: 태그 필터링, 좋아요 순 정렬, 최신순 정렬 최적화
CREATE INDEX IF NOT EXISTS idx_posts_tag ON public.posts (tag);
CREATE INDEX IF NOT EXISTS idx_posts_likes ON public.posts (likes DESC);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_announcement ON public.posts (is_announcement DESC);

-- credit_purchases 테이블: 상태 필터링, 유저별 조회, 구매일자 정렬 최적화
CREATE INDEX IF NOT EXISTS idx_credit_purchases_status ON public.credit_purchases (status);
CREATE INDEX IF NOT EXISTS idx_credit_purchases_user_id ON public.credit_purchases (user_id);
CREATE INDEX IF NOT EXISTS idx_credit_purchases_purchased_at ON public.credit_purchases (purchased_at DESC);

-- support_inquiries 테이블: 상태 필터링, 최신순 정렬 최적화
CREATE INDEX IF NOT EXISTS idx_support_inquiries_status ON public.support_inquiries (status);
CREATE INDEX IF NOT EXISTS idx_support_inquiries_created_at ON public.support_inquiries (created_at DESC);


-- 2. 관리자 통계 통합 RPC 생성 (Admin Stats RPC)

CREATE OR REPLACE FUNCTION get_admin_dashboard_stats()
RETURNS json AS $$
DECLARE
    user_cnt bigint;
    total_sales_amt bigint;
    refund_pending_cnt bigint;
    inquiry_pending_cnt bigint;
BEGIN
    -- 전체 회원 수 (exact count)
    SELECT count(*) INTO user_cnt FROM public.profiles;

    -- 총 매출액 (active 상태인 결제 건의 합계)
    SELECT coalesce(sum(price_paid), 0) INTO total_sales_amt 
    FROM public.credit_purchases 
    WHERE status = 'active';

    -- 환불 대기 건수
    SELECT count(*) INTO refund_pending_cnt 
    FROM public.credit_purchases 
    WHERE status = 'pending_refund';

    -- 미처리 문의 건수
    SELECT count(*) INTO inquiry_pending_cnt 
    FROM public.support_inquiries 
    WHERE status = 'pending';

    RETURN json_build_object(
        'user_count', user_cnt,
        'total_sales', total_sales_amt,
        'pending_refunds', refund_pending_cnt,
        'pending_inquiries', inquiry_pending_cnt
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC 실행 권한 부여 (필요 시)
-- GRANT EXECUTE ON FUNCTION get_admin_dashboard_stats() TO authenticated;
-- GRANT EXECUTE ON FUNCTION get_admin_dashboard_stats() TO service_role;
