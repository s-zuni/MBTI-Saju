import { createClient } from '@supabase/supabase-js';
import { streamObject } from 'ai';
import { z } from 'zod';
import { calculateSaju, buildRichSajuContext } from './_utils/saju';
import { corsHeaders, handleCors } from './_utils/cors';
import { getAIProvider, isRetryableAIError } from './_utils/ai-provider';

export const config = {
    runtime: 'edge',
};

const loveSajuSchema = z.object({
    analysisType: z.string(),
    overallScore: z.number(),
    summary: z.string(),
    sajuCompatibility: z.object({
        dayMasterRelation: z.string(),
        fiveElementHarmony: z.string(),
        specialStars: z.string(),
        hiddenConflicts: z.string(),
    }),
    dimensions: z.array(z.object({
        label: z.string(),
        value: z.number(),
        description: z.string(),
    })),
    timingForecast: z.object({
        threeMonths: z.string(),
        oneYear: z.string(),
        threeYears: z.string(),
    }),
    mbtiStrategy: z.object({
        myApproach: z.string(),
        partnerApproach: z.string(),
        conflictResolution: z.string(),
    }),
    specialSection: z.string().describe('유형별 특화 섹션 (연인: 데이트 조언, 부부: 자녀운과 노후, 결혼: 결혼 시기와 조건, 재회: 재회 가능성 냉정 판단, 짝사랑: 호감도 예측) (300자 이상). 해당없을시 빈 문자열 반환'),
    verdict: z.string(),
    keywords: z.array(z.string()),
});

export default async (req: Request) => {
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    try {
        const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) as string;
        const supabaseAnonKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) as string;
        const supabase = createClient(supabaseUrl, supabaseAnonKey);

        // Authenticate user
        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Authorization header is missing.' }), { 
                status: 401, 
                headers: corsHeaders 
            });
        }
        const token = authHeader.split(' ')[1]!;
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return new Response(JSON.stringify({ error: 'User not authenticated.' }), { 
                status: 401, 
                headers: corsHeaders 
            });
        }

        if (req.method === 'POST') {
            const body = await req.json();
            const url = new URL(req.url);
            const type = url.searchParams.get('type') || body.type || 'couple'; // couple, married, marriage, reunion, crush

            const {
                birthDate, birthTime, mbti, name, gender,
                targetName, targetBirthDate, targetBirthTime, targetMbti, targetGender,
                separationDate,    // for reunion
                separationReason,  // for reunion
            } = body;

            if (!birthDate) {
                return new Response(JSON.stringify({ error: '본인 생년월일 정보가 필요합니다.' }), { 
                    status: 400, 
                    headers: corsHeaders 
                });
            }

            let mySaju = body.sajuData;
            if (!mySaju) {
                mySaju = calculateSaju(birthDate, birthTime);
            }

            let targetSaju = body.targetSajuData;
            if (!targetSaju && targetBirthDate) {
                targetSaju = calculateSaju(targetBirthDate, targetBirthTime);
            }

            if (!mySaju || (!targetSaju && type !== 'crush' && targetBirthDate)) {
                // If partner data is needed but missing
                if (type !== 'crush' && !targetBirthDate) {
                    return new Response(JSON.stringify({ error: '상대방 생년월일 정보가 필요합니다.' }), { 
                        status: 400, 
                        headers: corsHeaders 
                    });
                }
            }

            // Calculate target saju if missing but birth date provided (e.g. crush)
            if (!targetSaju && targetBirthDate) {
                targetSaju = calculateSaju(targetBirthDate, targetBirthTime);
            }

            const myRichSaju = buildRichSajuContext(mySaju);
            const targetRichSaju = targetSaju ? buildRichSajuContext(targetSaju) : '상대방 정보 없음';

            const systemPrompt = `당신은 50년 경력의 냉철한 연애 명리학 전문가입니다. 합(合)·충(沖)·형(刑)·해(害)·원진(怨嗔)을 정밀 분석하여 두 사람의 인연을 낱낱이 해부합니다.

[핵심 원칙]
1. 일간 합(갑기합토, 을경합금, 병신합수, 정임합목, 무계합화) 해당 여부를 반드시 먼저 확인하세요.
2. 지지 합충(삼합, 방합, 육합, 충, 형, 파, 해)을 면밀히 분석하세요.
3. 특수 신살(도화살, 홍염살, 원진살, 귀문관살 등)이 있으면 반드시 언급하고 그 영향을 솔직하게 풀이하세요.
4. 배우자궁(일지)의 글자가 상대의 일간/일지와 어떤 관계인지 분석하세요.
5. 대운(大運) 흐름에서 인연의 시기를 구체적으로 제시하세요. (예: '2026년 하반기 도화운이 들어 새로운 인연의 가능성이 높다')
6. 재회 사주: 냉정하고 현실적으로 분석하세요. 일시적 재회와 진정한 재결합을 구분하세요.
7. 짝사랑 사주: 상대방의 사주에서 나와의 인연 가능성을 분석하고, MBTI 기반 구체적 공략법을 제시하세요.
8. 쓸데없는 비유 없이 알기 쉽게 풀이하되, 핵심 명리학 용어는 한자 병기하세요.
9. 마크다운 강조 기호(**) 절대 사용 금지. 글머리표(-)와 줄바꿈(\\n\\n)으로 가독성을 확보하세요.
10. MBTI 용어를 제외한 모든 언어는 한국어만 사용하세요.
11. 부부 궁합: 자녀궁(시주)과 장기적 인생 흐름에 더 집중하세요.
12. 결혼 궁합: 솔직하게 분석하되, 노력으로 개선할 수 있는 방향을 반드시 제시하세요.`;

            let userQuery = `[본인 정보]
이름: ${name || '본인'}
성별: ${gender === 'male' ? '남성' : '여성'}
MBTI: ${mbti}
[본인 사주]
${myRichSaju}

[상대방 정보]
이름: ${targetName || '상대방'}
성별: ${targetGender === 'male' ? '남성' : '여성'}
MBTI: ${targetMbti || '알수없음'}
[상대방 사주]
${targetRichSaju}

[요청 서비스 유형]: `;

            if (type === 'couple') {
                userQuery += `연인 궁합
- 두 사람의 현재 연애 궁합과 잘 맞는 점, 부딪히는 점을 명리학적으로 상세히 분석하세요.
- 지지 합충과 원진살 등의 신살을 상세히 풀이해 주세요.
- 5개 시각화 지표(정서적 교감, 성적 궁합, 재물 시너지, 소통력, 성장 가능성)의 점수를 사주에 근거하여 상세히 산정해 주세요.`;
            } else if (type === 'married') {
                userQuery += `부부 궁합
- 연인을 넘어 평생을 약속한 부부의 관점에서 분석하세요.
- 두 사람의 자녀운(시주 관점)과 노후 및 장기적인 대운 흐름을 면밀히 분석하세요.
- 서로의 단점을 보완할 수 있는 동반자적 기운 밸런스를 풀이해 주세요.`;
            } else if (type === 'marriage') {
                userQuery += `결혼 궁합
- 두 사람이 결혼을 고민할 때 고려해야 할 핵심 사주적 조건들을 제시해 주세요.
- 결혼하기 가장 길(吉)한 시기와 결혼 생활 중 조심해야 할 위기의 시기를 짚어 주세요.
- 갈등이 오더라도 서로 노력해서 극복할 수 있는 명리학적 솔루션을 함께 제시하세요.`;
            } else if (type === 'reunion') {
                userQuery += `재회 사주
- 이별 시기: "${separationDate || '미상'}", 이별 사유: "${separationReason || '미상'}"
- 이별하게 된 근본적인 사주적 요인(예: 세운에서의 일지 충 등)을 짚어 주세요.
- 향후 1년, 3년 간의 두 사람의 인연의 흐름을 분석해 주세요.
- 재회했을 때 다시 예전과 같이 헤어질지(일시적 재회), 아니면 극복하고 잘 살 수 있을지 냉정하고 냉철하게 결론을 내려 주세요.`;
            } else if (type === 'crush') {
                userQuery += `짝사랑 사주
- 내가 좋아하는 그 사람이 나에 대해 가지고 있을 호감도와 사주적 짝사랑 가능성을 분석하세요.
- 상대방의 마음을 공략할 수 있는 비법을 상대방의 MBTI와 사주 일간 특징에 맞추어 맞춤 설계해 주세요.
- 향후 3개월 이내에 관계의 진전이 일어날 확률과 시점을 예측해 주세요.`;
            }

            try {
                let lastError;
                for (let attempt = 0; attempt < 4; attempt++) {
                    try {
                        const { model } = getAIProvider(attempt);
                        const result = await streamObject({
                            model,
                            schema: loveSajuSchema,
                            system: systemPrompt,
                            prompt: userQuery,
                            maxRetries: 0,
                        });
                        return result.toTextStreamResponse({ headers: corsHeaders });
                    } catch (error) {
                        lastError = error;
                        if (!isRetryableAIError(error)) break;
                    }
                }
                throw lastError;
            } catch (err) {
                throw err;
            }
        } else {
            return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { 
                status: 405, 
                headers: corsHeaders 
            });
        }
    } catch (error: any) {
        console.error('Love Saju API Error:', error);
        return new Response(JSON.stringify({ error: error.message }), { 
            status: 500, 
            headers: corsHeaders 
        });
    }
};
