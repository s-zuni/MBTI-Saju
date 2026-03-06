import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { calculateSaju } from './_utils/saju';
import { cleanAndParseJSON } from './_utils/json';
import { generateContentWithRetry, getKoreanErrorMessage } from './_utils/retry';

type VercelRequest = any;
type VercelResponse = any;

export default async (req: VercelRequest, res: VercelResponse) => {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

        if (!supabaseUrl || !supabaseAnonKey || !GEMINI_API_KEY) {
            throw new Error(`Missing environment variables`);
        }

        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

        const token = authHeader.split(' ')[1]!;
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

        if (req.method === 'POST') {
            const { mbti, birthDate, birthTime, gender, name } = req.body;
            const sajuResult = calculateSaju(birthDate, birthTime);

            const systemPrompt = `
            You are a master of Saju and MBTI. Create the STRATEGY and SOLUTION part of "MBTIJU 소울 리포트".
            
            **CRITICAL**: Korean ONLY, Valid JSON, No Markdown bolding.
            
            **REQUIRED JSON STRUCTURE**:
            {
                "warnings": {
                    "title": "2026년 주의사항 및 금기사항",
                    "watchOut": [
                        {"title": "title", "description": "desc"},
                        {"title": "title", "description": "desc"},
                        {"title": "title", "description": "desc"}
                    ],
                    "avoid": [
                        {"title": "title", "description": "desc"},
                        {"title": "title", "description": "desc"},
                        {"title": "title", "description": "desc"}
                    ]
                },
                "fieldStrategies": {
                    "title": "분야별 전략: 직업운 & 연애운",
                    "career": { "subtitle": "직업운", "analysis": "analysis", "advice": "advice" },
                    "love": { "subtitle": "연애운", "analysis": "analysis", "advice": "advice" }
                },
                "finalSolution": {
                    "title": "최종 심리 솔루션",
                    "theme": "A poetic theme",
                    "tips": [
                        {"title": "title", "description": "desc"},
                        {"title": "title", "description": "desc"},
                        {"title": "title", "description": "desc"}
                    ],
                    "closingMessage": "Empowering message"
                }
            }
            `;

            const userQuery = `Analyze Strategy for: ${name}, ${gender}, ${mbti}, Birth: ${birthDate}. Saju: ${sajuResult.dayMaster.korean}`;

            const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({
                model: "gemini-3.1-flash-lite-preview",
                systemInstruction: systemPrompt
            });

            const result = await generateContentWithRetry(model, {
                contents: [{ role: 'user', parts: [{ text: userQuery }] }],
                generationConfig: { responseMimeType: "application/json" }
            });

            const content = cleanAndParseJSON(result.response.text());
            res.status(200).json(content);
        }
    } catch (error: any) {
        console.error('Strategy API Error:', error);
        res.status(500).json({ error: getKoreanErrorMessage(error) });
    }
};
