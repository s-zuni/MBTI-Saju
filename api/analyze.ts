import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { calculateSaju } from './_utils/saju';
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
            throw new Error('Missing environment variables');
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
            You are an expert consultant specializing in the fusion of MBTI and traditional Korean Saju (Four Pillars of Destiny).
            Your role is to analyze a user's information and provide a COMPREHENSIVE and DETAILED analysis.
            
            **CRITICAL INSTRUCTION**: 
            1. **LANGUAGE**: Output MUST be in **Korean (Hangul)** only. Do not use English headers or terms unless absolutely necessary for specific terminology (e.g. MBTI).
            2. **ELEMENT NAMES**: Always translate element names to Korean with Chinese character in brackets on first mention, then just Korean.
               - Wood -> 목(Wood) or 목
               - Fire -> 화(Fire) or 화
               - Earth -> 토(Earth) or 토
               - Metal -> 금(Metal) or 금  <-- **NEVER leave this as 'Metal'**
               - Water -> 수(Water) or 수
            3. **STYLE**: Use relevant Emojis (✨, 🔮, 🌊, etc.) to make it engaging. Tone should be warm, professional, and insightful.

            The response MUST be a JSON object with the following keys:
            - "keywords": 3-4 key personality keywords (string).
            - "commonalities": Explanation of common points between Saju and MBTI (string).
            - "typeDescription": A description of their Saju Day Master type (e.g., "섬세한 보석 신금", "우직한 바위 경금") (string).
            - "elementAnalysis": A brief analysis of their element distribution (string).
            - "mbtiAnalysis": Deep analysis focusing on their MBTI traits (string, approx 300 chars).
            - "sajuAnalysis": Deep analysis focusing on their Saju characteristics (string, approx 300 chars).
            - "fusedAnalysis": A unique insight combining BOTH systems (string, approx 400 chars).
            `;

            const userQuery = `
            Please analyze the following user:
            - Name: ${name}
            - Gender: ${gender}
            - MBTI: ${mbti}
            - Birth: ${birthDate} ${birthTime || '(Time Unknown)'}
            
            [Saju Data]
            - Day Master (Il-Gan): ${sajuResult.dayMaster.korean} (${sajuResult.dayMaster.description})
            - Five Elements Count:
              Wood: ${sajuResult.elements.wood}
              Fire: ${sajuResult.elements.fire}
              Earth: ${sajuResult.elements.earth}
              Metal: ${sajuResult.elements.metal}
              Water: ${sajuResult.elements.water}

            Provide the JSON response based on this. Ensure "Metal" is displayed as "금" or "금(Metal)" and never just "Metal".
            `;

            const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({
                model: "gemini-3.0-flash",
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
                content = JSON.parse(responseText);
            } catch (e) {
                console.error("JSON Parse Error:", e);
                console.error("Raw Text:", responseText);
                return res.status(500).json({ error: "Failed to parse AI response" });
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
        res.status(500).json({ error: error.message || 'An internal server error occurred.' });
    }
};
