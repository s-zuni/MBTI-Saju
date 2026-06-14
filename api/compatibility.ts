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
                boss: '직장 상사 (Boss)',
                colleague: '직장 동료 (Colleague)',
                other: '그 외 (Other)'
            };
            const relationshipStr = relationshipKoreanMap[relationshipType] || '연인';

            const systemPrompt = `당신은 상대방과의 소름 돋을 정도로 정확한 궁합 분석과 관계 조언을 제공하는 최고의 '관계 명리학 & MBTI 심리 컨설턴트'입니다.
            
            분석 결과 구성 지침 (반드시 아래 순서와 분량을 지키세요):
            (1) 나의 MBTI와 어울리는 MBTI 및 이상형 스타일 (약 200자)
               - 결론을 먼저 제시하고, 그 이유를 간략하고 명확하게 설명하세요.
            (2) 나의 사주와 어울리는 사주적 기운 및 인연 (약 200자)
               - 사주 용어(오행 등)는 반드시 한글과 한자를 병기하세요. (예: 목(木), 화(火))
            (3) ${isPartnerMode ? `${relationshipStr} 관계 심층 분석 및 조언` : '종합 이상 궁합 분석 및 관계 조언'} (★반드시 공백 제외 한글 기준 1000자 이상 작성할 것★)
               - 사용자가 소름 돋고 소름끼칠 정도로 두 사람의 역학 관계, 연애 스타일, 속마음, 마찰의 원인을 예리하게 파고들어 작성하세요. 두리뭉실한 칭찬이나 뻔한 궁합은 배제하고, 날카로운 통찰과 구체적인 성격 묘사를 제공하세요.
               - 반드시 아래 3가지 항목으로 세분화하고, 각 항목마다 구체적인 단락과 줄바꿈을 활용하여 엄청나게 상세한 내용으로 분량을 풍부하게 채우세요:
                 (1) 전체적인 궁합/특징: ${isPartnerMode ? '두 사람의 에너지와 성향이 결합되어 나타나는 현실적인 연애/관계 역학과 소름 돋는 케미 특징' : '당신에게 가장 필요한 운명적 에너지와 인연의 심도 있는 특징'}
                 (2) 주의해야 할 점: ${isPartnerMode ? '서로의 성향 차이에서 발생하는 갈등의 정확한 불씨, 조심해야 하는 심리적 충돌 지점 (뼈 때릴 정도로 솔직하고 예리하게 지적)' : '인연을 맺을 때 반드시 경계해야 할 본인의 태도와 주의점'}
                 (3) 개선/활용 방안: ${isPartnerMode ? '이 관계를 100% 살릴 수 있는 구체적인 행동 대처법 및 조언' : '진정한 연인을 만나기 위한 현실적인 실천 방안'}

            규칙:
            1. 언어: MBTI 용어를 제외한 모든 내용은 한국어만 사용하세요. 영어나 영어의 한글 음차 병기는 절대 금지합니다.
            2. 가독성: 줄 바꿈을 매우 자주 사용하세요. 가독성을 위해 문단과 문장을 적절히 나누고 줄 바꿈(\n\n)을 적극 사용하세요.
            3. 서식: 마크다운 강조 기호(**)나 기울임(Italics)을 절대 사용하지 마세요. 대신 개조식 기호(-)와 적절한 이모지를 사용하세요.
            4. 톤앤매너: 상대방의 심리와 성향을 꿰뚫어 보는 듯한 '전문적이고, 솔직하며, 정곡을 찌르는 뼈 때리는' 문체를 사용하세요.`;

            let userQuery = `[관계 목적]\n${relationshipStr}\n\n[대상 A (본인)]\n이름: ${myProfile.name}\nMBTI: ${myProfile.mbti}\n사주 일간: ${mySaju.dayMaster.korean} (${mySaju.dayMaster.description})\n오행 분포: 목(${mySaju.elementRatio.wood}%), 화(${mySaju.elementRatio.fire}%), 토(${mySaju.elementRatio.earth}%), 금(${mySaju.elementRatio.metal}%), 수(${mySaju.elementRatio.water}%)\n\n`;

            if (isPartnerMode && partnerProfile && partnerSaju) {
                userQuery += `[대상 B (상대방)]\n이름: ${partnerProfile.name}\nMBTI: ${partnerProfile.mbti}\n사주 일간: ${partnerSaju.dayMaster.korean} (${partnerSaju.dayMaster.description})\n오행 분포: 목(${partnerSaju.elementRatio.wood}%), 화(${partnerSaju.elementRatio.fire}%), 토(${partnerSaju.elementRatio.earth}%), 금(${partnerSaju.elementRatio.metal}%), 수(${partnerSaju.elementRatio.water}%)\n\n위 정보를 바탕으로 두 사람의 '${relationshipStr}' 관점에서의 심층 궁합 분석을 수행해 주세요.`;
            } else {
                userQuery += `위 정보를 바탕으로 본인의 '이상형(궁합)'과 관계 조언을 수행해 주세요. 특히 ${relationshipStr} 관점에서 어떤 스타일의 사람을 만나야 성공적인지 분석해 주세요.`;
            }

            try {
                let lastError;
                for (let attempt = 0; attempt < 4; attempt++) {
                    try {
                        const { model } = getAIProvider(attempt);
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
        console.error('Compatibility API Error:', error);
        return new Response(JSON.stringify({ error: error.message }), { 
            status: 500, 
            headers: corsHeaders 
        });
    }
};
