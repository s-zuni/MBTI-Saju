import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("SUPABASE URL or KEY missing in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const tags = ['사주', 'MBTI', '궁합', '기타'];
const dummyUserIds = [
    '3f33a510-7b13-4840-8aa0-88bb1df52435',
    '6985e004-2f37-4e73-b7b5-a23910444d9e',
    '64cf0560-e32b-4ad9-bdd7-57f69e33477e',
    '34a76d0a-3f32-4368-9a2b-cfcd02589572',
];

const authors = ['사주초보', 'INFJ_마스터', '운세쟁이', '궁합이궁금해', '타로러버', '익명', 'ENFP에너자이저', '사주명리광'];

const contents = [
    "오늘 타로 결과 다들 어떠셨어요? 저는 완전 잘 맞아서 소름...",
    "신살 중에 도화살이 있다는데 이거 좋은 건가요 나쁜 건가요?",
    "MBTI랑 사주랑 같이 보니까 저를 좀 더 객관적으로 알게 된 것 같습니다. 추천해요!",
    "연인 도감 해봤는데 진짜 우리 커플 성향이랑 똑같이 나옴ㅋㅋㅋ",
    "힐링 여행지 추천받아서 이번 주말에 떠납니다~ 다녀와서 후기 남길게요.",
    "새로운 직업 고민 중인데 AI 심층상담 직업 추천 꽤 디테일하네요.",
    "올해 운세 보니까 하반기에 좋은 일이 있다고 해서 기대 중입니다.",
    "켈트 십자 배열로 타로 처음 봤는데 해석이 너무 찰떡이라 놀랐어요.",
    "친구랑 같이 가입했는데 포인트 금방 쓰네요 ㅠㅠ 더 충전해야 할 듯",
    "사주 원국에 불이 많다는데 무슨 의미인지 아시는 분?",
];

const titles = [
    "타로 후기 남겨봐요",
    "궁합 이거 진짜 맞나요?",
    "사주 초보 질문 있습니다",
    "오늘 운세 대박",
    "MBTI-Saju 조합 신기하네요",
    "힐링 여행지 공유합니다",
    "직업 고민 해결!",
    "도화살 질문이요",
    "코인 충전 완료",
    "다들 MBTI 뭔가요?",
];

async function seed() {
    console.log("Starting seed process...");

    const postsToInsert = [];

    for (let i = 0; i < 60; i++) {
        const randomTag = tags[Math.floor(Math.random() * tags.length)];
        const randomAuthor = authors[Math.floor(Math.random() * authors.length)];
        const randomUserId = dummyUserIds[Math.floor(Math.random() * dummyUserIds.length)];
        const randomTitle = titles[i % titles.length] + ` (${i})`;
        const randomContent = contents[i % contents.length];
        const likes = Math.floor(Math.random() * 50);

        const pastDays = Math.floor(Math.random() * 30);
        const date = new Date();
        date.setDate(date.getDate() - pastDays);

        postsToInsert.push({
            title: randomTitle,
            content: randomContent,
            author_name: randomAuthor,
            user_id: randomUserId,
            tag: randomTag,
            likes,
            is_announcement: i < 3, // 첫 3개는 공지사항으로
            created_at: date.toISOString(),
        });
    }

    const { data: insertedPosts, error: postError } = await supabase
        .from('posts')
        .insert(postsToInsert)
        .select();

    if (postError) {
        console.error("Error inserting posts:", postError.message);
        return;
    }

    console.log(`Successfully inserted ${insertedPosts.length} posts.`);

    const commentsToInsert = [];
    for (const post of insertedPosts) {
        if (Math.random() > 0.5) {
            const numComments = Math.floor(Math.random() * 3) + 1;
            for (let j = 0; j < numComments; j++) {
                const randomAuthor = authors[Math.floor(Math.random() * authors.length)];
                const randomUserId = dummyUserIds[Math.floor(Math.random() * dummyUserIds.length)];
                const commentContent = "동감합니다! " + contents[Math.floor(Math.random() * contents.length)];

                const date = new Date(post.created_at);
                date.setHours(date.getHours() + j + 1);

                commentsToInsert.push({
                    post_id: post.id,
                    content: commentContent,
                    author_name: randomAuthor,
                    user_id: randomUserId,
                    created_at: date.toISOString(),
                });
            }
        }
    }

    if (commentsToInsert.length > 0) {
        const { data: insertedComments, error: commentError } = await supabase
            .from('comments')
            .insert(commentsToInsert)
            .select();

        if (commentError) {
            console.error("Error inserting comments:", commentError.message);
        } else {
            console.log(`Successfully inserted ${insertedComments.length} comments.`);
        }
    }

    console.log("Seeding complete.");
}

seed();
