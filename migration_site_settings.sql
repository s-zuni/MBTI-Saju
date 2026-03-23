-- 사이트 설정 테이블 생성 (팝업 등 글로벌 설정용)
CREATE TABLE IF NOT EXISTS site_settings (
    id BIGINT PRIMARY KEY DEFAULT 1,
    popup_enabled BOOLEAN DEFAULT false,
    popup_title TEXT DEFAULT '브라우저 권장 안내',
    popup_content TEXT DEFAULT '현재 Safari 브라우저에서 일부 기능 오류가 발생하고 있습니다. 안정적인 서비스 이용을 위해 Google Chrome 브라우저 사용을 권장드립니다.',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- 오직 하나의 가로(row)만 존재하도록 제약 조건 추가
    CONSTRAINT single_row CHECK (id = 1)
);

-- 초기 데이터 삽입 (이미 있으면 무시)
INSERT INTO site_settings (id, popup_enabled, popup_title, popup_content)
VALUES (1, true, '브라우저 권장 안내', '현재 Safari 브라우저에서 일부 기능 오류가 발생하고 있습니다. 안정적인 서비스 이용을 위해 Google Chrome 브라우저 사용을 권장드립니다.')
ON CONFLICT (id) DO NOTHING;

-- RLS 설정
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- 읽기는 누구나 가능
CREATE POLICY "Allow public read access" ON site_settings
    FOR SELECT USING (true);

-- 수정은 인증된 관리자만 가능 (여기서는 단순하게 authenticated로 설정하거나 프로필 역할 체크 필요)
-- 관리자 역할 체크 로직이 있다면 USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')) 등으로 보강 가능
CREATE POLICY "Allow admin update access" ON site_settings
    FOR UPDATE TO authenticated USING (true);
