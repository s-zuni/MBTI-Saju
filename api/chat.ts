import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { calculateSaju } from './_utils/saju';
import { getKoreanErrorMessage } from './_utils/retry';

// Types
type VercelRequest = any;
type VercelResponse = any;

export default async (req: VercelRequest, res: VercelResponse) => {
    // CORS configuration
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

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    try {
        const { message, mbti, birthDate, birthTime, name, gender, messages, pastContext } = req.body;
        const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.REACT_APP_GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

        if (!GEMINI_API_KEY) {
            return res.status(500).json({ error: '서버 설정 오류: GEMINI_API_KEY가 누락되었습니다.' });
        }

        // Calculate Saju
        let sajuInfo = "Saju information not available";
        if (birthDate) {
            try {
                const saju = calculateSaju(birthDate, birthTime);
                sajuInfo = `
                - Day Master (Il-Gan): ${saju.dayMaster.korean} (${saju.dayMaster.description})
                - Five Elements: Wood ${saju.elementRatio.wood}%, Fire ${saju.elementRatio.fire}%, Earth ${saju.elementRatio.earth}%, Metal ${saju.elementRatio.metal}%, Water ${saju.elementRatio.water}%
                `;
            } catch (e) {
                console.error("Saju Calculation Error", e);
            }
        }

        const systemPrompt = `
        You are a deeply analytical "Saju & MBTI Counselor" who provides realistic and fact-based insights.
        Your goal is to provide logical and objective counseling based on the user's data. Avoid vague comfort or ambiguous answers.
        
        **CRITICAL RULE**: 
        - DO NOT USE markdown bold formatting (double asterisks like **text**) in your response under any circumstances.
        - NEVER use **. If you need to emphasize, use bullet points or structured sentences.
        
        **USER PROFILE**:
        - Name: ${name || 'User'}
        - MBTI: ${mbti || 'Unknown'}
        - Gender: ${gender || 'Unknown'}
        - Birth: ${birthDate} ${birthTime || ''}
        
        **SAJU INFO**:
        ${sajuInfo}
 
        ${pastContext ? `**PAST CONSULTATION MEMORY**:
        The following is a brief history of past interactions with this user:
        ${pastContext}\n` : ''}
 
        **PERSONA GUIDELINES**:
        1. **Identity**: You are a professional analyzer of fate. You decode the complex interplay between cosmic energy (Saju) and psychological patterns (MBTI).
        2. **Tone**: Realistic, objective, and somewhat "cold" in your analysis, but delivered in a polite, respectful manner. Use formal yet gentle Korean (~해요 style).
        3. **Fact-Based Analysis**: Provide deep, specific insights. If the data shows challenges, state them clearly. Do not offer general or ambiguous advice. End with a constructive perspective.
        4. **Holistic Integration**: Seamlessly combine Saju elements (Five Elements, Day Master) and MBTI traits. Provide examples of how these interact in the user's specific context.
 
        **FORMATTING RULES**:
        - Use emojis (🌿, 🔥, 💧, ✨) sparingly to add atmosphere.
        - **Keep it detailed**: Provide a thorough analysis. Do not limit response length significantly, but keep it structured.
        - **NO BOLDING**: Remember, absolutely no ** permitted.
        - **Language**: Korean Only.
        `;

        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({
            model: "gemini-3.1-flash-lite-preview",
            systemInstruction: systemPrompt
        });

        // Convert previous messages to Gemini format (Limit to last 10 for context window)
        let history: { role: string; parts: { text: string }[] }[] = [];
        try {
            if (Array.isArray(messages)) {
                history = messages.slice(-10).map((msg: any) => ({
                    role: (msg.role === 'user' || msg.sender === 'user') ? 'user' : 'model',
                    parts: [{ text: msg.content || msg.text || '' }]
                }));

                // Gemini API requires the first message in history to be from 'user'
                // Loop to remove messages from the front until we find a user message or empty the list
                while (history.length > 0 && history[0]?.role !== 'user') {
                    history.shift();
                }
            }
        } catch (e) {
            console.error("Failed to parse message history", e);
            history = [];
        }

        const chat = model.startChat({
            history: history,
        });

        // Retry logic for sendMessage (handles 503/429 transient errors)
        let result;
        let lastError;
        for (let attempt = 0; attempt <= 3; attempt++) {
            try {
                result = await chat.sendMessage(message);
                break;
            } catch (err: any) {
                lastError = err;
                const msg = err?.message || '';
                const isRetryable = msg.includes('503') || msg.includes('429') || msg.includes('Service Unavailable') || msg.includes('high demand');
                if (attempt < 3 && isRetryable) {
                    const delay = 1000 * Math.pow(2, attempt);
                    console.warn(`[Chat Retry] Attempt ${attempt + 1}/3 failed. Waiting ${delay}ms...`);
                    await new Promise(r => setTimeout(r, delay));
                } else {
                    throw err;
                }
            }
        }
        if (!result) throw lastError;
        const responseText = result.response.text();

        res.status(200).json({ reply: responseText });

    } catch (error: any) {
        console.error('ChatServer Error:', error);

        // Explicitly check for model availability or forbidden errors
        const errorMessage = getKoreanErrorMessage(error);
        if (errorMessage.includes('not found') || errorMessage.includes('404')) {
            console.error('Requested model not found. Check availability of gemini-3.1-flash-lite-preview');
        }

        res.status(500).json({
            error: errorMessage || "채팅 분석 중 오류가 발생했습니다."
        });
    }
};
