import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamObject } from 'ai';
import { z } from 'zod';
import { calculateSaju } from './_utils/saju';

export const config = {
    runtime: 'edge',
};

export default async (req: Request) => {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405 });
    }

    try {
        const body = await req.json();
        const { myProfile, partners } = body;

        if (!myProfile || !partners || !Array.isArray(partners)) {
            return new Response(JSON.stringify({ error: 'Invalid input. myProfile and partners array are required.' }), { status: 400 });
        }

        const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.REACT_APP_GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
        if (!GEMINI_API_KEY) {
            return new Response(JSON.stringify({ error: 'Missing API Key' }), { status: 500 });
        }

        const mySaju = calculateSaju(myProfile.birthDate, myProfile.birthTime);
        const partnersData = partners.map((p: any) => {
            const pSaju = calculateSaju(p.birthDate, p.birthTime);
            return {
                id: p.id,
                name: p.name,
                relation: p.relation,
                mbti: p.mbti,
                saju: {
                    dayMaster: pSaju.dayMaster.korean,
                    elements: pSaju.elementRatio
                }
            };
        });

        const systemPrompt = `당신은 세계 최고의 인연 궁합 마스터입니다.
        사용자(A)와 여러 명의 파트너(B, C, D...) 사이의 '오늘의 기운'을 분석합니다.
        
        [분석 지침]
        1. 각 파트너별로 오늘 하루의 궁합 점수(0~100)와 한 줄 조언을 제공하세요.
        2. 조언은 친근하고 다정한 한국어로 작성하며, 이모지를 적절히 섞어주세요.
        3. 절대적 금지 사항 (CRITICAL): 답변 어디에도 마크다운 강조 기호인 별표 두 개(**)를 절대로 사용하지 마세요. 강조가 필요하면 글머리표(-), 이모지 등을 활용하세요.`;

        const userQuery = `사용자(A) MBTI: ${myProfile.mbti}, 일간: ${mySaju.dayMaster.korean}
        일자: ${new Date().toLocaleDateString('ko-KR')}
        파트너 리스트: ${JSON.stringify(partnersData)}`;

        const google = createGoogleGenerativeAI({ apiKey: GEMINI_API_KEY });
        
        const result = await streamObject({
            model: google('gemini-2.5-flash'),
            schema: z.object({
                results: z.array(z.object({
                    id: z.string(),
                    score: z.number(),
                    msg: z.string()
                }))
            }),
            system: systemPrompt,
            prompt: userQuery,
        });

        return result.toTextStreamResponse();
    } catch (error: any) {
        console.error('Daily Relationship API Error:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
};
