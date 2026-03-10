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
            You are a master of Saju and MBTI. Create the STRATEGY and SOLUTION part of "MBTIJU 소울 리포트".
            
            **CRITICAL**: Korean ONLY, Valid JSON.
            Keep the total length of your analysis within 800~1000 characters to ensure it fits on a unified PDF page. Make the content highly actionable, deeply insightful and engaging. Use Markdown bolding (**text**) for emphasis.
            
            **REQUIRED JSON STRUCTURE**:
            {
                "warnings": {
                    "title": "2026년 주의사항 및 금기사항",
                    "watchOut": [
                        {"title": "Specific Warning 1", "description": "**블렛포인트**를 활용한 구체적 행동 지침 (150+ chars)"},
                        {"title": "Specific Warning 2", "description": "**블렛포인트**를 활용한 구체적 행동 지침 (150+ chars)"}
                    ],
                    "avoid": [
                        {"title": "Specific Avoidance 1", "description": "**블렛포인트**를 활용한 상세 조언 (150+ chars)"},
                        {"title": "Specific Avoidance 2", "description": "**블렛포인트**를 활용한 상세 조언 (150+ chars)"}
                    ]
                },
                "fieldStrategies": {
                    "title": "분야별 전략: 연애 & 직업 & 재물",
                    "love": { 
                        "subtitle": "연애운", 
                        "analysis": "연애/관계 전략을 **개괄식**으로 기술 (300+ characters)", 
                        "advice": "Actionable advice",
                        "keywords": ["love keywords"]
                    },
                    "career": { 
                        "subtitle": "직업운", 
                        "analysis": "성향과 에너지를 융합한 직업 전략을 **개괄식**으로 기술 (300+ characters)", 
                        "advice": "Actionable advice",
                        "keywords": ["career keywords"]
                    },
                    "wealth": { 
                        "subtitle": "재물운", 
                        "analysis": "재무/투자 전략을 **개괄식**으로 기술 (300+ characters)", 
                        "advice": "Wealth management advice",
                        "keywords": ["wealth keywords"]
                    }
                },
                "finalSolution": {
                    "title": "최종 심리 솔루션",
                    "theme": "A powerful closing theme",
                    "tips": [
                        {"title": "Mindset Tip", "description": "Psychological tip combining MBTI and Saju."}
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
