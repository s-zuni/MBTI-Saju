import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { calculateSaju } from './_utils/saju';

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
        const { message, mbti, birthDate, birthTime, name, gender, messages } = req.body;
        const supabaseUrl = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
        const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

        if (!GEMINI_API_KEY) throw new Error('Missing Gemini API Key');

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
        You are an AI Fortune Teller & Counselor strictly following the persona of a wise, empathetic, and mystical expert.
        Your goal is to answer the user's question based on their MBTI and Traditional Korean Saju (Five Elements & Four Pillars).
        
        **USER PROFILE**:
        - Name: ${name || 'User'}
        - MBTI: ${mbti || 'Unknown'}
        - Gender: ${gender || 'Unknown'}
        - Birth: ${birthDate} ${birthTime || ''}
        
        **SAJU INFO**:
        ${sajuInfo}

        **INSTRUCTIONS**:
        1. **Combine** MBTI logic and Saju elemental theory to answer.
           - Example: "As an INTP with strong Fire energy, you..."
        2. **Tone**: Mysterious but warm, professional yet approachable. Use honorifics (Polite Korean).
        3. **Structure**:
           - Acknowledge the question.
           - Analyze based on their specific traits (Saju + MBTI).
           - Provide specific advice.
        4. **Emojis**: Use relevant emojis (✨, 🔮, 🌙, 🌸) to make it engaging.
        5. **Language**: Korean Only.
        6. **Context**: Use the provided previous messages context if needed to maintain flow.
        `;

        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({
            model: "gemini-3-flash-preview",
            systemInstruction: systemPrompt
        });

        // Convert previous messages to Gemini format (Limit to last 10 for context window)
        // Note: history structure for Gemini is { role: "user" | "model", parts: [{ text: string }] }
        const history = (messages || []).slice(-10).map((msg: any) => ({
            role: msg.sender === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }]
        }));

        const chat = model.startChat({
            history: history,
        });

        const result = await chat.sendMessage(message);
        const responseText = result.response.text();

        res.status(200).json({ reply: responseText });

    } catch (error: any) {
        console.error('Server Error:', error);
        res.status(500).json({ error: error.message || 'An internal server error occurred.' });
    }
};
