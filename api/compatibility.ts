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

            const systemPrompt = `당신은 MBTI와 Saju(사주명리학)를 결합하여 분석하는 '관계 컨설턴트'입니다.
            규칙:
            1. 한국어로 답변하세요.
            2. 절대적 금지 사항 (CRITICAL): 답변 어디에도 마크다운 강조 기호인 별표 두 개(**)를 절대로 사용하지 마세요. 강조가 필요하면 글머리표(-), 숫자, 이모지 등을 활용하세요.
            3. 분석 내용은 매우 상세하게 작성하세요.`;

            const userQuery = `관계: ${relationshipStr}
            A: ${myProfile.name}, ${myProfile.mbti}, 사주 일간 ${mySaju.dayMaster.korean}
            B: ${partnerProfile.name}, ${partnerProfile.mbti}, 사주 일간 ${partnerSaju.dayMaster.korean}`;

            const google = createGoogleGenerativeAI({ apiKey: GEMINI_API_KEY });
            
            const result = await streamObject({
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
