import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { calculateSaju } from './_utils/saju';
import { cleanAndParseJSON } from './_utils/json';

export default async (req: any, res: any) => {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    try {
        const { birthDate, birthTime, mbti, gender, name, region } = req.body;
        const supabaseUrl = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
        const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

        if (!GEMINI_API_KEY) throw new Error('Missing Gemini API Key');

        // Calculate Saju
        const saju = calculateSaju(birthDate, birthTime);

        const systemPrompt = `
        You are a "Destiny Travel Curator" specializing in MBTI and Saju (Four Pillars of Destiny).
        Your goal is to recommend the top 3 travel destinations in the requested region (${region}) that harmonize with the user's specific energy.
        
        **CRITICAL INSTRUCTIONS**:
        1. **REGION**: Strictly limited to ${region}.
        2. **LANGUAGE**: Korean (Hangul) ONLY.
        3. **TONE**: Exciting, evocative, and personalized. storytelling style.
        4. **FORMAT**: Output MUST be a valid JSON object.
        
        **CONTENT REQUIREMENTS**:
        - For each place, explain WHY it fits their Saju element or MBTI trait (e.g., "Fire energy is weak, so this sunny beach will recharge you").
        - Use emojis (✈️, 🏞️, 🏖️) to make it visually popping.
        
        **REQUIRED JSON STRUCTURE**:
        {
            "places": [
                { "name": "Place Name", "reason": "Detailed reason (2-3 sentences) linking to their energy." },
                { "name": "Place Name", "reason": "Detailed reason (2-3 sentences) linking to their energy." },
                { "name": "Place Name", "reason": "Detailed reason (2-3 sentences) linking to their energy." }
            ],
            "summary": "A concluding paragraph (approx 200 chars) giving overall travel advice for their type."
        }
        `;

        const userQuery = `
        User: ${name} (${gender})
        MBTI: ${mbti}
        Saju Day Master: ${saju.dayMaster.korean} (${saju.dayMaster.description})
        Elements: Wood ${saju.elementRatio.wood}%, Fire ${saju.elementRatio.fire}%, Earth ${saju.elementRatio.earth}%, Metal ${saju.elementRatio.metal}%, Water ${saju.elementRatio.water}%
        
        Region: ${region}
        
        Recommend 3 places in ${region} that fit this person's energy.
        `;

        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({
            model: "gemini-3-pro-preview",
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
            console.error("Raw Text:", responseText);
            return res.status(500).json({ error: "Failed to parse travel recommendation." });
        }

        res.status(200).json(content);

    } catch (error: any) {
        console.error(error);
        res.status(500).json({ error: 'Failed to generate trip recommendation' });
    }
};
