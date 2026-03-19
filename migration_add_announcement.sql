-- 커뮤니티 공지사항 기능을 위한 컬럼 추가
ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_announcement BOOLEAN DEFAULT false;

-- 기존 데이터에 대한 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_posts_is_announcement ON posts(is_announcement DESC);
