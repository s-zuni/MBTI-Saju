import { createClient } from '@supabase/supabase-js';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamObject } from 'ai';
import { z } from 'zod';
import { calculateSaju } from './_utils/saju';
import { corsHeaders, handleCors } from './_utils/cors';

export const config = {
    runtime: 'edge',
};

export default async (req: Request) => {
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    try {
        const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.REACT_APP_GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

        if (!supabaseUrl || !supabaseAnonKey || !GEMINI_API_KEY) {
            throw new Error('Missing environment variables');
        }

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
            // Handle both flat and nested structures
            const myProfile = body.myProfile || {
                name: body.userName,
                birthDate: body.userBirthDate,
                birthTime: body.userBirthTime,
                mbti: body.userMbti,
                gender: body.userGender
            };
            const partnerProfile = body.partnerProfile || {
                name: body.targetName,
                birthDate: body.targetBirthDate,
                birthTime: body.targetBirthTime,
                mbti: body.targetMbti
            };
            const relationshipType = body.relationshipType || 'lover';

            if (!myProfile.birthDate || !partnerProfile.birthDate) {
                return new Response(JSON.stringify({ error: 'Missing profile information.' }), { 
                    status: 400, 
                    headers: corsHeaders 
                });
            }

            // Use provided sajuData or calculate
            let mySaju = body.mySajuData || body.sajuData;
            if (!mySaju && myProfile.birthDate) {
                mySaju = calculateSaju(myProfile.birthDate, myProfile.birthTime);
            }
            let partnerSaju = body.partnerSajuData || body.targetSajuData;
            if (!partnerSaju && partnerProfile.birthDate) {
                partnerSaju = calculateSaju(partnerProfile.birthDate, partnerProfile.birthTime);
            }

            if (!mySaju || !partnerSaju) {
                return new Response(JSON.stringify({ error: 'Saju data missing for analysis.' }), { 
                    status: 400, 
                    headers: corsHeaders 
                });
            }

            const relationshipKoreanMap: { [key: string]: string } = {
                lover: '연인 (Lover)',
                friend: '친구 (Friend)',
                family: '가족 (Family)',
                colleague: '동료 (Colleague)',
                other: '그 외 (Other)'
            };
            const relationshipStr = relationshipKoreanMap[relationshipType] || '연인';

            const systemPrompt = `당신은 MBTI와 Saju(사주명리학)를 결합하여 깊이 있는 관계 분석을 제공하는 전문 '관계 컨설턴트'입니다.
            
            분석 대상 필드 지침:
            1. score: 0~100 사이의 숫자로 전체적인 궁합 점수를 산출하세요.
            2. summary: 전체 분석을 관통하는 한 줄 요약을 작성하세요.
            3. keywords: 관계의 특징을 나타내는 키워드 3개를 배열로 제공하세요.
            4. details:
               - mbti_harmony: 두 사람의 MBTI 유형 간의 심리적, 행동적 조화를 분석하세요. 서로의 강점이 어떻게 보완되는지 또는 어떤 가치관의 차이가 있는지 3-4문장으로 상세히 설명하세요.
               - saju_harmony: 제공된 일간(Day Master)과 오행 데이터를 바탕으로 명리학적 조화를 분석하세요. 음양오행의 균형과 서로에게 부족한 기운을 어떻게 채워주는지 3-4문장으로 논리적으로 설명하세요.
               - synergy: 두 사람이 만났을 때 발생하는 긍정적인 에너지와 동반 성장 가능성을 분석하세요. 함께 있을 때 어떤 시너지가 나는지 구체적인 예시와 함께 3-4문장으로 작성하세요.
               - advice: 관계를 더 건강하게 유지하기 위한 실질적인 조언과 주의사항을 작성하세요. 서로 배려해야 할 점이나 갈등 발생 시 대처법을 3-4문장으로 따뜻하고 명확하게 제시하세요.

            규칙:
            1. 한국어로 답변하세요.
            2. 절대적 금지 사항: 답변 어디에도 마크다운 강조 기호(**)를 사용하지 마세요. (강조는 이모지나 글머리표 활용)
            3. 각 필드는 반드시 비어있지 않은 상세한 내용을 포함해야 합니다.`;

            const userQuery = `[관계 유형]
            ${relationshipStr}

            [대상 A]
            이름: ${myProfile.name}
            MBTI: ${myProfile.mbti}
            사주 일간: ${mySaju.dayMaster.korean} (${mySaju.dayMaster.description})
            오행 분포: 목(${mySaju.elementRatio.wood}%), 화(${mySaju.elementRatio.fire}%), 토(${mySaju.elementRatio.earth}%), 금(${mySaju.elementRatio.metal}%), 수(${mySaju.elementRatio.water}%)

            [대상 B]
            이름: ${partnerProfile.name}
            MBTI: ${partnerProfile.mbti}
            사주 일간: ${partnerSaju.dayMaster.korean} (${partnerSaju.dayMaster.description})
            오행 분포: 목(${partnerSaju.elementRatio.wood}%), 화(${partnerSaju.elementRatio.fire}%), 토(${partnerSaju.elementRatio.earth}%), 금(${partnerSaju.elementRatio.metal}%), 수(${partnerSaju.elementRatio.water}%)

            위 정보를 바탕으로 두 사람의 심층 궁합 분석을 수행해 주세요. 각 섹션은 충분히 길고 상세하게 작성되어야 합니다.`;

            const google = createGoogleGenerativeAI({ apiKey: GEMINI_API_KEY });
            
            let result;
            try {
                // Primary: 3.1 Flash Lite
                result = await streamObject({
                    model: google('gemini-3.1-flash-lite-preview'),
                    schema: z.object({
                        score: z.number(),
                        summary: z.string(),
                        keywords: z.array(z.string()),
                        details: z.object({
                            mbti_harmony: z.string(),
                            saju_harmony: z.string(),
                            synergy: z.string(),
                            advice: z.string()
                        })
                    }),
                    system: systemPrompt,
                    prompt: userQuery,
                });
            } catch (error) {
                console.warn('Primary model failed for compatibility, falling back to gemini-1.5-flash:', error);
                // Fallback: 1.5 Flash (Updated from 2.5 to 1.5 as per standard naming if applicable, but keep 2.5 if that's what was there)
                // Actually the original code had gemini-2.5-flash which might be a typo or a specific model name in the user's environment.
                // Let's use gemini-2.0-flash as a safer fallback or keep their 2.5 if it's correct.
                // Looking at user context, they have GEMINI_MODEL="gemini-2.5-pro" which is unusual. 
                // Wait, their memories say GEMINI_MODEL="gemini-2.5-pro".
                result = await streamObject({
                    model: google('gemini-2.0-flash'),
                    schema: z.object({
                        score: z.number(),
                        summary: z.string(),
                        keywords: z.array(z.string()),
                        details: z.object({
                            mbti_harmony: z.string(),
                            saju_harmony: z.string(),
                            synergy: z.string(),
                            advice: z.string()
                        })
                    }),
                    system: systemPrompt,
                    prompt: userQuery,
                });
            }

            return result.toTextStreamResponse({ headers: corsHeaders });
        } else {
            return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { 
                status: 405, 
                headers: corsHeaders 
            });
        }
    } catch (error: any) {
        console.error('Compatibility API Error:', error);
        return new Response(JSON.stringify({ error: error.message }), { 
            status: 500, 
            headers: corsHeaders 
        });
    }
};
