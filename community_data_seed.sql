-- Community Data Seed Script (April 1st - 20th)
-- Run this in the Supabase SQL Editor

DO $$
DECLARE
    admin_user_id UUID := '64cf0560-e32b-4ad9-bdd7-57f69e33477e';
    post_id UUID;
    i INT;
    j INT;
    nicknames TEXT[] := ARRAY['skywalker92', 'INFP불꽃', 'ISTJ철벽금', 'flame82', '실브', '사주도사', 'MBTI연구가', '행운의길', '별자리여행자', '운명마스터'];
    titles TEXT[] := ARRAY[
        'MBTI별 연애 궁합, 이거 진짜인가요?', 
        '사주로 보는 4월 재물운 공유합니다!', 
        'ENFP와 사주 궁합 보신 분?', 
        '오늘 운세가 너무 좋아서 기분 좋네요!', 
        '기질적으로 안 맞는 MBTI가 있을까요?', 
        '사주 상담 받고 왔는데 마음이 편해지네요.', 
        'INFJ의 사주 풀이 경험담', 
        '궁합이 나빠도 극복할 수 있을까요?', 
        '이름 감명 받아보신 분 계신가요?', 
        '4월 중순, 새로운 일을 시작해도 될까요?'
    ];
    contents TEXT[] := ARRAY[
        '요즘 핫한 MBTI 궁합표 보고 있는데, 제 성향이랑 너무 잘 맞는 것 같아서 놀랐어요. 여러분은 어떤 성격이랑 잘 맞으시나요?',
        '올해 4월은 목(木) 기운이 강해서 추진력이 필요한 시기라고 하네요. 다들 계획하신 일 잘 풀리길 바랍니다!',
        '제 MBTI는 ENFP인데 사주에서는 수(水) 기운이 강하다고 하네요. 성격이랑 사주가 비슷하게 나오는 게 너무 신기해요.',
        '아침에 운세 확인했는데 뜻밖의 행운이 있을 거라더니, 정말 기다리던 소식을 들었어요! 다들 기운 받아 가세요.',
        '저는 특정 성향이랑은 대화할 때마다 에너지가 뺏기는 기분인데... 이것도 궁합의 문제일까요?',
        '고민이 많아서 다녀왔는데, 지금 시기가 원래 그렇다니 오히려 안심이 돼요. 가끔은 이런 조언도 필요한 것 같아요.',
        'INFJ 분들 중에 사주 보러 가면 철학적인 성향이라는 말 자주 듣지 않나요? 제가 이번에 그랬거든요.',
        '좋아하는 사람이랑 사주 궁합이 별로라고 해서 걱정이에요. 노력을 하면 운명도 바뀔 수 있겠죠?',
        '이름이 운명에 끼치는 영향이 크다고 해서 개명을 고민 중입니다. 다들 어떻게 생각하시나요?',
        '계획은 다 세웠는데 시기적으로 괜찮을지 사주적으로 궁금하네요. 조언 부탁드려요!'
    ];
    tags TEXT[] := ARRAY['MBTI', '사주', '궁합', '사주', 'MBTI', '사주', 'MBTI', '궁합', '기타', '사주'];
    comment_samples TEXT[] := ARRAY[
        '공감합니다! 저도 비슷한 경험이 있어요.',
        '오, 신기하네요. 저도 한번 확인해봐야겠어요.',
        '운명은 스스로 개척하는 거라지만, 사주를 참고하면 확실히 마음이 편해지는 것 같아요.',
        '제 MBTI랑은 좀 다른 결과라 흥미롭네요.',
        '좋은 기운 받아갑니다! 감사합니다.',
        '저도 궁합 때문에 고민했었는데, 결국 소통이 제일 중요하더라고요.',
        '4월 운세 대박 나시길 응원합니다!',
        'MBTI랑 사주가 일치하는 게 생각보다 많더라고요. 과학인 걸까요? ㅋㅋ',
        '이름은 중요하긴 하죠. 신중하게 결정하세요!',
        '전 어제 운세가 안 좋았는데 오늘은 좋네요. 역시 인생은 새옹지마!'
    ];
BEGIN
    FOR i IN 1..20 LOOP
        -- Generate Post
        INSERT INTO posts (
            title, 
            content, 
            tag, 
            user_id, 
            author_name, 
            likes, 
            created_at, 
            is_announcement
        ) VALUES (
            titles[(i-1) % 10 + 1],
            contents[(i-1) % 10 + 1],
            tags[(i-1) % 10 + 1],
            admin_user_id,
            nicknames[(i-1) % 10 + 1],
            floor(random() * 50)::INT,
            (timestamp '2026-04-01 10:00:00' + (i-1) * interval '1 day' + random() * interval '6 hours'),
            false
        ) RETURNING id INTO post_id;

        -- Generate 1-3 Comments
        FOR j IN 1..(floor(random() * 3) + 1)::INT LOOP
            INSERT INTO comments (
                post_id,
                user_id,
                author_name,
                content,
                created_at
            ) VALUES (
                post_id,
                admin_user_id,
                nicknames[(i+j) % 10 + 1],
                comment_samples[floor(random() * 10 + 1)::INT],
                (timestamp '2026-04-01 10:00:00' + (i-1) * interval '1 day' + j * interval '2 hours')
            );
        END LOOP;
    END LOOP;
END $$;
