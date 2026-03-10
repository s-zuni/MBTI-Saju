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
        const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.REACT_APP_GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

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
            
            **CRITICAL**: Korean ONLY, Valid JSON. 
            Keep the total length of your analysis within 800~1000 characters to ensure it fits on a unified PDF page when combined with other sections. Do not use overly verbose structures, but make the content deeply insightful and engaging. Use Markdown bolding (**text**) for emphasis. 
            
            **REQUIRED JSON STRUCTURE**:
            {
                "yearlyFortune": {
                    "title": "2026년(丙午年) 종합운세 흐름",
                    "theme": "A poetic and artistic theme for 2026",
                    "yearlyElementAnalysis": "2026년의 기운과 사주의 상호작용을 **개괄식**으로 분석 (300+ chars)",
                    "overview": "이해하기 쉬운 **블렛포인트(개괄식)** 구조의 종합 운세 (800+ chars). 구체적인 변곡점과 기회 요소를 서술.",
                    "keywords": ["4-5 key trendy themes"]
                },
                "monthlyFortune": {
                    "title": "2026년 월별 상세 흐름 및 가이드",
                    "months": [
                        {"period": "1~2월", "energy": "energy name", "guide": "핵심 요약 형식의 상세 가이드 (250+ characters)"},
                        {"period": "3~4월", "energy": "energy name", "guide": "핵심 요약 형식의 상세 가이드 (250+ characters)"},
                        {"period": "5~6월", "energy": "energy name", "guide": "핵심 요약 형식의 상세 가이드 (250+ characters)"},
                        {"period": "7~8월", "energy": "energy name", "guide": "핵심 요약 형식의 상세 가이드 (250+ characters)"},
                        {"period": "9~10월", "energy": "energy name", "guide": "핵심 요약 형식의 상세 가이드 (250+ characters)"},
                        {"period": "11~12월", "energy": "energy name", "guide": "핵심 요약 형식의 상세 가이드 (250+ characters)"}
                    ]
                }
            }
            `;

            const userQuery = `Analyze Fortune for: ${name}, ${gender}, ${mbti}, Birth: ${birthDate}. Saju: ${sajuResult.dayMaster.korean}`;

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
        console.error('Fortune API Error:', error);
        res.status(500).json({ error: getKoreanErrorMessage(error) });
    }
};
