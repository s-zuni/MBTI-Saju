import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { calculateSaju } from './_utils/saju';
import { cleanAndParseJSON } from './_utils/json';

// Fallback types if @vercel/node is not available
type VercelRequest = any;
type VercelResponse = any;

// It's crucial to use environment variables for Supabase credentials
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

    try {
        // It's crucial to use environment variables for Supabase credentials inside the handler
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

        if (!supabaseUrl || !supabaseAnonKey || !GEMINI_API_KEY) {
            const missing = [];
            if (!supabaseUrl) missing.push('SUPABASE_URL');
            if (!supabaseAnonKey) missing.push('SUPABASE_ANON_KEY');
            if (!GEMINI_API_KEY) missing.push('GEMINI_API_KEY');
            console.error('Missing Environment Variables:', missing.join(', '));
            throw new Error(`Missing environment variables: ${missing.join(', ')}`);
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
            const { mbti, birthDate, birthTime, gender, name } = req.body;

            if (!name || !gender || !birthDate || !mbti) {
                return res.status(400).json({ error: 'Required fields (name, gender, birthDate, mbti) are missing.' });
            }

            // Calculate Saju
            const sajuResult = calculateSaju(birthDate, birthTime);

            const systemPrompt = `
            You are a renowned master of both Eastern Saju (Five Elements) and Western MBTI psychology taking on the role of a 'Life Consultant'.
            Your task is to provide a "Premium Life Analysis Report" that is deeply insightful, mystical yet logical, and warm.
            
            **CRITICAL INSTRUCTIONS**: 
            1. **LANGUAGE**: Korean (Hangul) ONLY.
            2. **TONE**: Professional, empathetic, insightful, and slightly mystical ("~합니다", "~입니다" polite style).
            3. **FORMAT**: Output MUST be a valid JSON object.
            4. **NO MARKDOWN BOLDING**: Do NOT use '**' characters. Use plain text only. The frontend does not support markdown bolding.
            5. **ELEMENT NAMES**: You MUST use the format "Korean(Hanja)" for elements. 
               - CORRECT: 목(木), 화(火), 토(土), 금(金), 수(水)
               - WRONG: 목(Wood), 화(Fire), 금(Metal) -> NEVER use English translations for elements.
            
            **REQUIRED JSON STRUCTURE (5 Core Sections)**:
            {
                "keywords": "3-4 Keywords representing their core essence (e.g., '열정적인 불꽃', '논리적인 바위')",
                "sajuReading": "1. 사주 풀이\n- Describe their Day Master and Five Elements balance.\n- Explain their core temperament and destiny.\n- Use 'Element(Hanja)' format strictly.",
                "mbtiCompatibility": "2. MBTI와 궁합\n- Explain how their MBTI interacts with their Saju.\n- Mention compatible types/energies.",
                "fortune2026": "3. 2026 대운세\n- A detailed forecast for the year 2026 based on their Saju cycle.",
                "otherLuck": "4. 기타 운수 (재물, 사랑)\n- Specifically cover Wealth (재물운) and Love (연애운) in detail using bullet points.",
                "advice": "5. 같이해야 할 것 & 피해야 할 것\n- [같이 해야 할 것]: List 2-3 specific actions or items.\n- [피해야 할 것]: List 2-3 specific actions or items."
            }
            `;

            const userQuery = `
            Analyze this person:
            - Name: ${name}
            - Gender: ${gender}
            - MBTI: ${mbti}
            - Birth: ${birthDate} ${birthTime || '(Time Unknown)'}
            
            [Saju Data]
            - Day Master: ${sajuResult.dayMaster.korean} (Element: ${sajuResult.dayMaster.element})
            - Elements Count: Wood ${sajuResult.elements.wood}, Fire ${sajuResult.elements.fire}, Earth ${sajuResult.elements.earth}, Metal ${sajuResult.elements.metal}, Water ${sajuResult.elements.water}
            
            Provide the Premium Analysis JSON.
            `;

            const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({
                model: "gemini-3-flash-preview",
                systemInstruction: systemPrompt
            });

            const result = await model.generateContent({
                contents: [
                    { role: 'user', parts: [{ text: userQuery }] }
                ],
                generationConfig: {
                    responseMimeType: "application/json"
                }
            });

            const responseText = result.response.text();

            let content;
            try {
                content = cleanAndParseJSON(responseText);
            } catch (e) {
                console.error("JSON Parse Error:", e);
                console.error("Raw Text:", responseText); // Log raw text for debugging
                return res.status(500).json({ error: "Failed to parse AI response. Please try again." });
            }

            // Merge calculated Saju data with AI response
            const finalResponse = {
                ...content,
                saju: sajuResult
            };

            res.status(200).json(finalResponse);
        } else {
            res.status(405).json({ error: 'Method Not Allowed' });
        }
    } catch (error: any) {
        console.error('Server Error:', error);
        // Identify specific errors to return friendly messages
        if (error.message?.includes('Missing environment variables')) {
            return res.status(500).json({ error: 'Server Configuration Error: Missing API Keys' });
        }
        res.status(500).json({ error: error.message || 'An internal server error occurred.', details: error.toString() });
    }
};
