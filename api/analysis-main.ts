import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { calculateSaju } from './_utils/saju';
import { cleanAndParseJSON } from './_utils/json';
import { generateContentWithRetry, getKoreanErrorMessage } from './_utils/retry';

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const { part } = req.query;
    const { mbti, birthDate, birthTime, gender, name } = req.body;

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!supabaseUrl || !supabaseAnonKey || !GEMINI_API_KEY) {
        console.error('Missing environment variables:', { supabaseUrl: !!supabaseUrl, supabaseAnonKey: !!supabaseAnonKey, GEMINI_API_KEY: !!GEMINI_API_KEY });
        return res.status(500).json({ error: 'Core configuration missing (Env vars)' });
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
        systemPrompt = `당신은 '소울 융합 분석가'입니다...`;
        userQuery = `Analyze Core: ${name}, ${mbti}, ${birthDate}`;
    } else if (part === 'fortune') {
        systemPrompt = `You are a master of Saju and MBTI. Create FORTUNE part...`;
        userQuery = `Analyze Fortune: ${name}, ${mbti}, ${birthDate}`;
    } else if (part === 'strategy') {
        systemPrompt = `You are a master of Saju and MBTI. Create STRATEGY part...`;
        userQuery = `Analyze Strategy: ${name}, ${mbti}, ${birthDate}`;
    } else {
        return res.status(400).json({ error: 'Invalid part' });
    }

    try {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", systemInstruction: systemPrompt });
        const result = await generateContentWithRetry(model, {
            contents: [{ role: 'user', parts: [{ text: userQuery }] }],
            generationConfig: { responseMimeType: "application/json" }
        });
        const content = cleanAndParseJSON(result.response.text());
        res.status(200).json(part === 'core' ? { ...content, saju: sajuResult } : content);
    } catch (error: any) {
        res.status(500).json({ error: getKoreanErrorMessage(error) });
    }
}
