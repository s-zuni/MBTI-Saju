import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { calculateSaju } from './_utils/saju';
import { cleanAndParseJSON } from './_utils/json';
import { generateContentWithRetry, getKoreanErrorMessage } from './_utils/retry';

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const { part } = req.query;
    const body = req.body || {};
    const { mbti, birthDate, birthTime, gender, name } = body;

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!supabaseUrl || !supabaseAnonKey || !GEMINI_API_KEY) {
        console.error('Missing environment variables:', { 
            supabaseUrl: !!supabaseUrl, 
            supabaseAnonKey: !!supabaseAnonKey, 
            GEMINI_API_KEY: !!GEMINI_API_KEY 
        });
        return res.status(500).json({ 
            error: `Configuration missing: ${[!supabaseUrl && 'SUPABASE_URL', !supabaseAnonKey && 'SUPABASE_ANON_KEY', !GEMINI_API_KEY && 'GEMINI_API_KEY'].filter(Boolean).join(', ')}`
        });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
    const token = authHeader.split(' ')[1]!;
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

    const sajuResult = calculateSaju(birthDate, birthTime);
    let systemPrompt = '';
    let userQuery = '';

    if (part === 'core') {
        systemPrompt = `당신은 '소울 융합 분석가'입니다. 사용자의 MBTI 성향과 사주 명리학의 핵심 원리를 결합하여, 유일무이한 자아 정체성과 삶의 방향성을 제시해 줍니다. 
        **규칙**:
        1. 결과는 반드시 JSON 형식이어야 합니다.
        2. 'keywords', 'summary', 'details' (심층 분석), 'mbtiAnalysis', 'sajuAnalysis' 필드를 포함하세요.
        3. 정중하고 깊이 있는 한국어를 사용하세요.`;
        userQuery = `사용자 성함: ${name}, MBTI: ${mbti}, 생년월일시: ${birthDate} ${birthTime || ''}, 성별: ${gender}`;
    } else if (part === 'fortune') {
        systemPrompt = `당신은 '운명 전략가'입니다. 사용자의 사주 구성과 MBTI 행동 패턴을 기반으로 오늘의 운세와 전반적인 운의 흐름을 분석합니다.
        **규칙**:
        1. JSON 형식으로 답하세요.
        2. 'todayFortune', 'luckyItems', 'caution' 필드를 포함하세요.`;
        userQuery = `사용자 성함: ${name}, MBTI: ${mbti}, 생년월일시: ${birthDate} ${birthTime || ''}`;
    } else if (part === 'strategy') {
        systemPrompt = `당신은 '솔루션 가이드'입니다. 사용자의 타고난 기질과 현재 직면한 상황에 대한 맞춤형 전략을 제시합니다.
        **규칙**:
        1. JSON 형식으로 답하세요.
        2. 'actionPlan', 'tips', 'mindset' 필드를 포함하세요.`;
        userQuery = `사용자 성함: ${name}, MBTI: ${mbti}, 생년월일시: ${birthDate} ${birthTime || ''}`;
    } else {
        return res.status(400).json({ error: 'Invalid part' });
    }

    try {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash", 
            systemInstruction: systemPrompt 
        });
        
        const result = await generateContentWithRetry(model, {
            contents: [{ role: 'user', parts: [{ text: userQuery }] }],
            generationConfig: { 
                responseMimeType: "application/json",
                temperature: 0.7
            }
        });
        
        const responseText = result.response.text();
        if (!responseText) throw new Error("AI returned an empty response");
        
        const content = cleanAndParseJSON(responseText);
        res.status(200).json(part === 'core' ? { ...content, saju: sajuResult } : content);
    } catch (error: any) {
        console.error(`[Analysis Error - ${part}]:`, error);
        res.status(500).json({ 
            error: getKoreanErrorMessage(error) || "분석 중 예기치 못한 오류가 발생했습니다." 
        });
    }
}
