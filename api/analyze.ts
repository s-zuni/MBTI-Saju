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
            4. **LENGTH**: Each analysis section should be at least 300-500 characters long to provide substantial value.
            
            **ELEMENT NAMING**:
            Always display elements as "Korean(Hanja)" e.g., 목(木), 화(火), 토(土), 금(金), 수(水).

            **REQUIRED JSON STRUCTURE**:
            {
                "keywords": "3-4 Keywords representing their core essence (e.g., '열정적인 불꽃', '논리적인 바위')",
                "commonalities": "A paragraph explaining the surprising connection between their MBTI and Saju Day Master.",
                "typeDescription": "A poetic yet accurate title for their type (e.g., '넓은 들판을 달리는 백마')",
                "elementAnalysis": "Detailed analysis of their Five Elements balance. Mention what is lacking/excessive and how it affects personality. (Min 400 chars)",
                "mbtiAnalysis": "Deep dive into their MBTI traits, moving beyond stereotypes. (Min 400 chars)",
                "sajuAnalysis": "Detailed interpretation of their Day Master (Il-Gan) and overall Saju structure. Explain terms like 'Sin-Gang/Sin-Yak' simply if relevant. (Min 400 chars)",
                "fusedAnalysis": "The core of this report. How does their MBTI filter their Saju energy? What is their unique potential? (Min 500 chars)",
                "advice": "3 concrete, actionable life advice items based on their energy flow. (Formatted as a single string with bullets/newlines)"
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
