import { streamObject } from 'ai';
import { z } from 'zod';
import { getPreciseSajuData, buildRichSajuContext } from './_utils/saju';
import { corsHeaders, handleCors, getCorsHeaders } from './_utils/cors';
import { getAIProvider, isRetryableAIError, BASE_SYSTEM_PROMPT } from './_utils/ai-provider';
import { authenticateUser } from './_utils/auth';

export const config = {
    runtime: 'edge',
};

const STATIC_DAILY_RELATIONSHIP_SYSTEM_PROMPT = `
${BASE_SYSTEM_PROMPT}

사용자(A)와 여러 명의 파트너(B, C, D...) 사이의 '오늘의 기운'을 냉철하고 객관적으로 분석합니다.
        
[분석 지침]
1. 각 파트너별로 오늘 하루의 궁합 점수(0~100)와 실용적인 한 줄 행동 솔루션을 제공하세요.
2. 뻔한 감성적 위로나 추상적 칭찬은 배제하고, 사주의 오늘 기운 팩트와 파트너/사용자의 MBTI 성향이 맞물린 매우 구체적인 대처법/행동 가이드를 제시하세요.
3. 절대적 금지 사항 (CRITICAL): 답변 어디에도 마크다운 강조 기호인 별표 두 개(**)를 절대로 사용하지 마세요. 강조가 필요하면 글머리표(-), 이모지 등을 활용하세요.`;

export default async (req: Request) => {
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    const responseHeaders = getCorsHeaders(req);

    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { 
            status: 405, 
            headers: responseHeaders 
        });
    }

    // 데일리 인연 궁합 인증 및 5 크레딧 차감
    const authResult = await authenticateUser(req, { serviceType: 'COMPATIBILITY', cost: 5 });
    if (authResult.errorResponse) {
        return authResult.errorResponse;
    }

    try {
        const body = await req.json();
        const { myProfile, partners } = body;

        if (!myProfile || !partners || !Array.isArray(partners)) {
            return new Response(JSON.stringify({ error: 'Invalid input. myProfile and partners array are required.' }), { 
                status: 400, 
                headers: responseHeaders 
            });
        }

        // AI Key checking is now handled centrally in ai-provider.ts

        const mySaju = getPreciseSajuData({ birthDate: myProfile.birthDate, birthTime: myProfile.birthTime, gender: myProfile.gender });
        const partnersData = partners.map((p: any) => {
            const pSaju = getPreciseSajuData({ birthDate: p.birthDate, birthTime: p.birthTime, gender: p.gender });
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

        const userQuery = `사용자(A) MBTI: ${myProfile.mbti}, 일간: ${mySaju.dayMaster.korean}
        일자: ${new Date().toLocaleDateString('ko-KR')}
        파트너 리스트: ${JSON.stringify(partnersData)}`;

        try {
            let lastError;
            for (let attempt = 0; attempt < 4; attempt++) {
                try {
                    const { model, name } = getAIProvider(attempt);
                    const result = await streamObject({
                        model,
                        schema: z.object({
                            results: z.array(z.object({
                                id: z.string(),
                                score: z.number(),
                                msg: z.string()
                            }))
                        }),
                        system: STATIC_DAILY_RELATIONSHIP_SYSTEM_PROMPT,
                        prompt: userQuery,
                        maxOutputTokens: 16384,
                        maxRetries: 0,
                    });
                    return result.toTextStreamResponse({ headers: responseHeaders });
                } catch (error) {
                    lastError = error;
                    console.warn(`Attempt ${attempt + 1} (${getAIProvider(attempt).name}) failed for daily relationship:`, error);
                    if (!isRetryableAIError(error)) break;
                }
            }
            throw lastError;
        } catch (error: any) {
            console.error('Daily Relationship API Error:', error);
            return new Response(JSON.stringify({ error: error.message }), { 
                status: 500, 
                headers: responseHeaders 
            });
        }
    } catch (error: any) {
        console.error('Daily Relationship API Error:', error);
        return new Response(JSON.stringify({ error: error.message }), { 
            status: 500, 
            headers: responseHeaders 
        });
    }
};
