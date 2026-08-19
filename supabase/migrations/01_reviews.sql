-- 1. reviews (이용후기) 테이블 생성
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_name TEXT NOT NULL,
    mbti TEXT NOT NULL,
    rating NUMERIC NOT NULL CHECK (rating >= 1.0 AND rating <= 5.0),
    service_tag TEXT NOT NULL,
    content TEXT NOT NULL,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS 활성화
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- RLS 정책 설정
-- 모든 사람(비로그인 포함)이 이용후기 조회 가능
CREATE POLICY "Allow public select reviews" ON public.reviews
    FOR SELECT USING (true);

-- 로그인한 사용자(인증된 유저)는 이용후기 등록 가능
CREATE POLICY "Allow authenticated insert reviews" ON public.reviews
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 관리자(admin)는 전체 제어 가능 (수정, 삭제, 등록 등)
CREATE POLICY "Allow admin manage reviews" ON public.reviews
    FOR ALL USING (EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    ));

-- 초기 마이그레이션 예시 데이터 삽입 (선택 사항)
INSERT INTO public.reviews (author_name, mbti, rating, service_tag, content, is_verified, created_at)
VALUES 
('김*우', 'INTJ', 5.0, '심층 사주 리포트', '진짜 소름 돋을 정도로 정확합니다. 제 성격이랑 평소 가지고 있던 커리어 고민들을 귀신같이 짚어내서 소름 돋았어요. 가격도 9,900원으로 인하되어서 커피 두 잔 값 아끼고 평생 소장할 인생 비밀 지도를 얻은 느낌입니다!', true, now() - INTERVAL '7 days'),
('이*지', 'ENFP', 5.0, '심층 사주 리포트', 'MBTI랑 동양의 전통 사주가 결합되니까 설명이 훨씬 친근하고 와닿네요! 원래 사주는 한자가 많고 고리타분해서 어렵게만 생각했었는데, 이 리포트는 시각화도 예쁘고 현대적인 설명체로 되어 있어서 밤새는 줄 모르고 신나게 읽었습니다.', true, now() - INTERVAL '7 days'),
('박*준', 'INFJ', 5.0, '심층 사주 리포트', '이직과 인생의 큰 갈림길에 서서 마음고생이 심했는데, 리포트를 통해 마인드셋을 다잡고 미래의 큰 흐름을 이해하게 되었습니다. 구체적인 시기까지 명쾌하게 적혀있어 큰 용기와 확신을 얻었습니다.', true, now() - INTERVAL '6 days'),
('정*민', 'ISTJ', 4.0, '심층 사주 리포트', '설명 문구가 구체적이고 체계적이라 꼼꼼하게 다 읽어보았습니다. 다만 텍스트 양이 워낙 방대해서 정독하는 데 꽤 시간이 걸렸네요 ㅎㅎ 그래도 깊이 있게 자아를 복기하고 설계하기에 충분합니다.', true, now() - INTERVAL '6 days'),
('최*원', 'ESFJ', 3.5, '심층 사주 리포트', '사주 기초 개념 설명과 MBTI 16가지 성향 매칭이 세련되게 짜여 있습니다. 내 타고난 본질을 들여다보고 심리 검사를 보완하는 용도로 가볍게 보기에 훌륭합니다.', false, now() - INTERVAL '5 days'),
('윤*서', 'INFP', 5.0, 'AI 사주 상담', '새벽에 갑작스러운 걱정거리로 가슴이 답답하고 잠이 오지 않았는데, 실시간 AI 상담을 통해 정말 마음이 사르르 녹아내리는 위로를 받았습니다. 편안하게 대화하듯 물어볼 수 있어서 정말 좋았고 속이 뻥 뚫렸습니다.', true, now() - INTERVAL '5 days'),
('강*현', 'ENFJ', 5.0, '타로', '짝사랑 상대와의 관계가 정체기라 답답해서 타로를 봤는데, 뽑힌 카드들이 처한 상황을 너무 똑같이 투사하고 있어서 내내 신기해하며 봤습니다. 카드 조언대로 차분하게 기다리면서 다가가려 합니다.', true, now() - INTERVAL '4 days')
ON CONFLICT DO NOTHING;
