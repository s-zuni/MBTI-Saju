import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { calculateSaju } from './_utils/saju';
import { cleanAndParseJSON } from './_utils/json';

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
            You are a master of Saju and MBTI. Create the FORTUNE part of "MBTIJU 소울 리포트".
            
            **CRITICAL**: Korean ONLY, Valid JSON, No Markdown bolding.
            
            **REQUIRED JSON STRUCTURE**:
            {
                "yearlyFortune": {
                    "title": "2026년(丙午年) 운세 흐름",
                    "theme": "A poetic theme",
                    "yearlyElementAnalysis": "Analysis of 2026's energy",
                    "overview": "Fortune overview",
                    "keywords": ["3-4 key themes"]
                },
                "monthlyFortune": {
                    "title": "2026년 월별 상세 흐름 및 가이드",
                    "months": [
                        {"period": "1~2월", "energy": "energy", "guide": "guide"},
                        {"period": "3~4월", "energy": "energy", "guide": "guide"},
                        {"period": "5~6월", "energy": "energy", "guide": "guide"},
                        {"period": "7~8월", "energy": "energy", "guide": "guide"},
                        {"period": "9~10월", "energy": "energy", "guide": "guide"},
                        {"period": "11~12월", "energy": "energy", "guide": "guide"}
                    ]
                }
            }
            `;

            const userQuery = `Analyze Fortune for: ${name}, ${gender}, ${mbti}, Birth: ${birthDate}. Saju: ${sajuResult.dayMaster.korean}`;

            const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({
                model: "gemini-3-flash-preview",
                systemInstruction: systemPrompt
            });

            const result = await model.generateContent({
                contents: [{ role: 'user', parts: [{ text: userQuery }] }],
                generationConfig: { responseMimeType: "application/json" }
            });

            const content = cleanAndParseJSON(result.response.text());
            res.status(200).json(content);
        }
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
