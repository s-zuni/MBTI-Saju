import { createClient } from '@supabase/supabase-js';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamObject } from 'ai';
import { z } from 'zod';
import { getPreciseSajuData, buildRichSajuContext } from './_utils/saju';
import { corsHeaders, handleCors } from './_utils/cors';
import { getAIProvider, isRetryableAIError, BASE_SYSTEM_PROMPT } from './_utils/ai-provider';


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
                    mbti: body.targetMbti,
                    gender: body.targetGender
                };
            }

            if (!myProfile.birthDate || (isPartnerMode && !partnerProfile?.birthDate)) {
                return new Response(JSON.stringify({ error: 'Missing profile information.' }), { 
                    status: 400, 
                    headers: corsHeaders 
                });
            }

            const mySaju = getPreciseSajuData({
                birthDate: myProfile.birthDate,
                birthTime: myProfile.birthTime,
                gender: myProfile.gender
            });
            const mySajuContext = buildRichSajuContext(mySaju);
            
            let partnerSaju: any = null;
            let partnerSajuContext = '';
            if (isPartnerMode && partnerProfile?.birthDate) {
                partnerSaju = getPreciseSajuData({
                    birthDate: partnerProfile.birthDate,
                    birthTime: partnerProfile.birthTime,
                    gender: partnerProfile.gender
                });
                partnerSajuContext = buildRichSajuContext(partnerSaju);
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

            const systemPrompt = `
${BASE_SYSTEM_PROMPT}

당신은 두 사람의 사주 기운과 MBTI 심리를 정밀 분석하여 현실적 관계 전략을 제공하는 전문 명리학 & MBTI 심리 컨설턴트입니다.
            
[AI 사주 직접 계산 엄금 및 사실 수용 규칙]
★ 중요: 너는 생년월일시를 바탕으로 사주 원국, 오행, 십신을 절대로 직접 계산하려고 시도하지 마라!
★ 제공된 [System Context: Deterministic Saju Data]의 사주 데이터는 코드 엔진(manseryeok)이 계산한 100% 사실 데이터이다. 이 데이터를 절대 변형하지 말고 그대로 수용하여 심리/궁합 해석만 진행하라.

[대상 A (본인) 사주 데이터]
${mySajuContext}

${isPartnerMode && partnerSajuContext ? `[대상 B (상대방) 사주 데이터]\n${partnerSajuContext}` : ''}

분석 결과 구성 지침 (반드시 아래 순서와 분량을 지키세요):
(1) 나의 MBTI와 어울리는 MBTI 및 이상형 스타일 (약 200자)
   - 결론을 먼저 제시하고, 그 이유를 간략하고 명확하게 설명하세요.
(2) 나의 사주와 어울리는 사주적 기운 및 인연 (약 200자)
   - 사주 용어(오행 등)는 반드시 한글과 한자를 병기하세요. (예: 목(木), 화(火))
(3) ${isPartnerMode ? `${relationshipStr} 관계 심층 분석 및 조언` : '종합 이상 궁합 분석 및 관계 조언'} (★반드시 공백 제외 한글 기준 2000자 이상 작성할 것★)
   - 뻔하거나 추상적인 표현은 철저히 배제하고, 사주명리학적으로 어떤 부분이 잘 맞고 어떤 부분에서 안 맞는지 정확하고 냉철하게 정밀 진단하세요.
   - 반드시 아래 4가지 항목으로 세분화하고, 각 항목마다 구체적인 단락과 줄바꿈을 활용하여 엄청나게 상세한 내용으로 분량을 풍부하게 채우세요:
     (1) 사주(운명) 정밀 진단: 일간 합충, 오행 균형, 신살을 바탕으로 잘 맞는 기운과 부딪히는 사주적 마찰 요인을 명확히 진단 (500자 이상)
     (2) 인연의 시간적 변화 흐름 (6개월 / 1년 / 3년): 6개월 후, 1년 후, 3년 후의 운 흐름과 시기별 구체적 행동강령 제시 (500자 이상)
     (3) 승부/마음 포착 솔루션: "향후 N개월 안에 승부를 봐야 합니다" 등 사주 기운을 구체적 타임라인으로 선제시 후 종합 제언 (500자 이상)
     (4) MBTI 관계소통 매뉴얼: 나의 MBTI 실수 방지(상대 MBTI 연계) + 상대 MBTI 끌어당기는 공략법 + 갈등 임계점 해소법 (500자 이상)

규칙:
1. 언어: MBTI 용어를 제외한 모든 내용은 한국어만 사용하세요. 영어나 영어의 한글 음차 병기는 절대 금지합니다.
2. 가독성: 줄 바꿈을 매우 자주 사용하세요. 가독성을 위해 문단과 문장을 적절히 나누고 줄 바꿈(\n\n)을 적극 사용하세요.
3. 서식: 마크다운 강조 기호(**)나 기울임(Italics)을 절대 사용하지 마세요. 대신 개조식 기호(-)와 적절한 이모지를 사용하세요.
4. 톤앤매너: 사주의 흐름은 담담한 팩트로, 솔루션은 MBTI 성향에 맞춘 날카롭고 실용적인 행동 지침으로 제시하세요.`;

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
                            maxTokens: 16384,
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
