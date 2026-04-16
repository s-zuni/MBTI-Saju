import { createClient } from '@supabase/supabase-js';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamObject } from 'ai';
import { z } from 'zod';
import { calculateSaju } from './_utils/saju';
import { corsHeaders, handleCors } from './_utils/cors';
import { getAIProvider, isRetryableAIError } from './_utils/ai-provider';

export const config = {
    runtime: 'edge',
};

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
            const myProfile = body.myProfile || {
                name: body.userName,
                birthDate: body.userBirthDate,
                birthTime: body.userBirthTime,
                mbti: body.userMbti,
                gender: body.userGender
            };
            const isPartnerMode = body.isPartnerMode !== false;
            const relationshipType = body.relationshipType || 'lover';

            let partnerProfile: any = null;
            if (isPartnerMode) {
                partnerProfile = body.partnerProfile || {
                    name: body.targetName,
                    birthDate: body.targetBirthDate,
                    birthTime: body.targetBirthTime,
                    mbti: body.targetMbti
                };
            }

            if (!myProfile.birthDate || (isPartnerMode && !partnerProfile?.birthDate)) {
                return new Response(JSON.stringify({ error: 'Missing profile information.' }), { 
                    status: 400, 
                    headers: corsHeaders 
                });
            }

            let mySaju = body.mySajuData || body.sajuData;
            if (!mySaju && myProfile.birthDate) {
                mySaju = calculateSaju(myProfile.birthDate, myProfile.birthTime);
            }
            
            let partnerSaju: any = null;
            if (isPartnerMode) {
                partnerSaju = body.partnerSajuData || body.targetSajuData;
                if (!partnerSaju && partnerProfile?.birthDate) {
                    partnerSaju = calculateSaju(partnerProfile.birthDate, partnerProfile.birthTime);
                }
            }

            if (!mySaju || (isPartnerMode && !partnerSaju)) {
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
            
            분석 결과 구성 지침 (반드시 아래 순서와 분량을 지키세요):
            (1) 나의 MBTI와 어울리는 MBTI 및 이상형 스타일 (약 200자)
               - 결론을 먼저 제시하고, 그 이유를 간략하고 명확하게 설명하세요.
            (2) 나의 사주와 어울리는 사주적 기운 및 인연 (약 200자)
               - 사주 용어(오행 등)는 반드시 한글과 한자를 병기하세요. (예: 목(木), 화(火))
               - 영어 공용어(Wood, Fire 등) 사용은 절대 금지입니다.
            (3) ${isPartnerMode ? '상대방과 나의 MBTI & 사주 심층 궁합' : '종합 이상 궁합 분석 및 관계 조언'} (약 500자)
               - 무조건 아래 3가지 항목으로 나누어 개조식(Bullet points)으로 작성하세요:
                 (1) 전체적인 궁합: 두 사람의 에너지 결합 결과와 핵심 시너지
                 (2) 주의해야 할 점: 갈등의 불씨가 될 수 있는 요소 (솔직하고 날카롭게)
                 (3) 노력하는 법: 관계 개선을 위한 구체적이고 실천적인 액션 플랜

            규칙:
            1. 언어: MBTI 용어를 제외한 모든 내용은 한국어만 사용하세요. (영어 병기 절대 금지)
            2. 가독성: 줄 바꿈을 자주 사용하고(\n\n), 문단별로 명확히 구분하여 가독성을 극대화하세요.
            3. 서식: 마크다운 강조 기호(**)나 기울임(Italics)을 절대 사용하지 마세요. 강조는 이모지나 줄 바꿈으로 대신하세요.
            4. 톤앤매너: 전문적이고 솔직하며, 군더더기 없는 문체를 사용하세요.`;

            let userQuery = `[관계 목적]\n${relationshipStr}\n\n[대상 A (본인)]\n이름: ${myProfile.name}\nMBTI: ${myProfile.mbti}\n사주 일간: ${mySaju.dayMaster.korean} (${mySaju.dayMaster.description})\n오행 분포: 목(${mySaju.elementRatio.wood}%), 화(${mySaju.elementRatio.fire}%), 토(${mySaju.elementRatio.earth}%), 금(${mySaju.elementRatio.metal}%), 수(${mySaju.elementRatio.water}%)\n\n`;

            if (isPartnerMode && partnerProfile && partnerSaju) {
                userQuery += `[대상 B (상대방)]\n이름: ${partnerProfile.name}\nMBTI: ${partnerProfile.mbti}\n사주 일간: ${partnerSaju.dayMaster.korean} (${partnerSaju.dayMaster.description})\n오행 분포: 목(${partnerSaju.elementRatio.wood}%), 화(${partnerSaju.elementRatio.fire}%), 토(${partnerSaju.elementRatio.earth}%), 금(${partnerSaju.elementRatio.metal}%), 수(${partnerSaju.elementRatio.water}%)\n\n위 정보를 바탕으로 두 사람의 심층 궁합 분석을 수행해 주세요.`;
            } else {
                userQuery += `위 정보를 바탕으로 본인의 이상형(궁합)과 관계 조언을 수행해 주세요. (상대방은 없습니다)`;
            }

            try {
                let lastError;
                for (let attempt = 0; attempt < 4; attempt++) {
                    try {
                        const { model, name } = getAIProvider(attempt);
                        const result = await streamObject({
                            model,
                            schema: z.object({
                                score: z.number(),
                                summary: z.string(),
                                keywords: z.array(z.string()),
                                details: z.object({
                                    ideal_mbti: z.string(),
                                    ideal_saju: z.string(),
                                    overall_compatibility: z.string()
                                })
                            }),
                            system: systemPrompt,
                            prompt: userQuery,
                            maxRetries: 0, // Faster switching
                        });
                        return result.toTextStreamResponse({ headers: corsHeaders });
                    } catch (error) {
                        lastError = error;
                        console.warn(`Attempt ${attempt + 1} (${getAIProvider(attempt).name}) failed for compatibility:`, error);
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
        console.error('Compatibility API Error:', error);
        return new Response(JSON.stringify({ error: error.message }), { 
            status: 500, 
            headers: corsHeaders 
        });
    }
};
