import { createClient } from '@supabase/supabase-js';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamObject } from 'ai';
import { z } from 'zod';
import { calculateSaju } from './_utils/saju';

type VercelRequest = any;
type VercelResponse = any;

export default async (req: VercelRequest, res: VercelResponse) => {
    // CORS configuration
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.REACT_APP_GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

        if (!supabaseUrl || !supabaseAnonKey || !GEMINI_API_KEY) {
            throw new Error('Missing environment variables');
        }

        const supabase = createClient(supabaseUrl, supabaseAnonKey);

        // Authenticate user
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: 'Authorization header is missing.' });
        }
        const token = authHeader.split(' ')[1]!;
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return res.status(401).json({ error: 'User not authenticated.' });
        }

        if (req.method === 'POST') {
            const { myProfile, partnerProfile, relationshipType = 'lover' } = req.body;

            if (!myProfile || !partnerProfile) {
                return res.status(400).json({ error: 'Missing profile information.' });
            }

            const mySaju = calculateSaju(myProfile.birthDate, myProfile.birthTime);
            const partnerSaju = calculateSaju(partnerProfile.birthDate, partnerProfile.birthTime);

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
                model: google('gemini-2.5-flash'),
                schema: z.object({
                    score: z.number().describe("상성 점수 (1-100)"),
                    desc: z.string().describe("상세 분석 내용 (800자 이상)"),
                    keywords: z.string().describe("해시태그 키워드 (쉼표 구분)")
                }),
                system: systemPrompt,
                prompt: userQuery,
            });

            return (result as any).pipeToResponse(res);
        } else {
            res.status(405).json({ error: 'Method Not Allowed' });
        }
    } catch (error: any) {
        console.error('Compatibility API Error:', error);
        res.status(500).json({ error: error.message });
    }
};
