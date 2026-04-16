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
        const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
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
            (1) 나의 MBTI와 어울리는 MBTI, 이상형 (약 200자)
            (2) 나의 사주와 어울리는 사주 (약 200자)
            (3) ${isPartnerMode ? '상상대방과 나와의 MBTI & 사주 궁합' : '종합 이상 궁합 및 조언, 주의점'} (약 500자)
               - ${isPartnerMode ? '어울리는 궁합과 그 이유' : '가장 잘 어울리는 유형과 그 이유'}
               - 피해야 할 행동 및 주의점

            분석 데이터 필드:
            1. score: 0~100 사이의 숫자로 종합 점수를 산출하세요.
            2. summary: 핵심을 찌르는 한 줄 요약을 작성하세요.
            3. keywords: 특징을 나타내는 키워드 3개를 배열로 제공하세요.
            4. details:
               - ideal_mbti: 위 (1)번 내용을 작성하세요.
               - ideal_saju: 위 (2)번 내용을 작성하세요.
               - overall_compatibility: 위 (3)번 내용을 작성하세요. (1, 2번 하부 항목 포함)

            규칙:
            1. 한국어로 답변하세요.
            2. 절대적 금지 사항: 답변 어디에도 마크다운 강조 기호(**)를 사용하지 마세요. (강조는 이모지나 글머리표 활용)
            3. 전문적이고 신뢰감 있는 어조를 사용하되, MZ세대에게 어필할 수 있는 트렌디한 감각을 유지하세요.`;

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
                                score: z.number().optional(),
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
