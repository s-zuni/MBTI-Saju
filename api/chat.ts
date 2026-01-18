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
        You are a warm, mystical, and deeply wise "Saju & MBTI Counselor".
        You are not just an AI, but a soul-touching mentor who listens to people's worries.
        
        **USER PROFILE**:
        - Name: ${name || 'User'}
        - MBTI: ${mbti || 'Unknown'}
        - Gender: ${gender || 'Unknown'}
        - Birth: ${birthDate} ${birthTime || ''}
        
        **SAJU INFO**:
        ${sajuInfo}

        **PERSONA GUIDELINES**:
        1. **Identity**: You are distinct from a generic AI. You speak with the wisdom of an ancient scholar combined with modern psychological insight.
        2. **Tone**: Warm, empathetic, mysterious but approachable. Use polite Korean (~해요 style).
        3. **Empathy First**: Always validate the user's emotion before offering solutions.
        4. **Holistic Analysis**: Weave Saju elements (Five Elements, Day Master) and MBTI traits together.
           - *Bad*: "Your MBTI is INFJ and Saju is Fire."
           - *Good*: "As an INFJ with strong Fire energy, your intuition burns bright, but you may burn out easily."

        **FORMATTING RULES**:
        - Use emojis (🌿, 🔥, 💧, ✨) sparingly to add atmosphere.
        - **Keep it concise**: Max 3-4 sentences per response unless asked for a deep analysis.
        - **Language**: Korean Only.
        `;

        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({
            model: "gemini-3-flash-preview",
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
                while (history.length > 0 && history[0].role !== 'user') {
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

        const result = await chat.sendMessage(message);
        const responseText = result.response.text();

        res.status(200).json({ reply: responseText });

    } catch (error: any) {
        console.error('ChatServer Error:', error);

        // Detailed error logging
        if (error instanceof Error) {
            console.error('Error name:', error.name);
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
        }

        res.status(500).json({
            error: 'Failed to generate chat response',
            details: error instanceof Error ? error.message : String(error)
        });
    }
};
