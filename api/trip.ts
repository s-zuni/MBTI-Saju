import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { calculateSaju } from './_utils/saju';
import { cleanAndParseJSON } from './_utils/json';

export default async (req: any, res: any) => {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    try {
        const { birthDate, birthTime, mbti, gender, name, region, startDate, endDate } = req.body;
        const supabaseUrl = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
        const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

        if (!GEMINI_API_KEY) throw new Error('Missing Gemini API Key');

        // Calculate Saju
        const saju = calculateSaju(birthDate, birthTime);

        // Calculate Duration
        let durationText = "";
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            const diffTime = Math.abs(end.getTime() - start.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // inclusive
            durationText = `Schedule: ${startDate} ~ ${endDate} (${diffDays} days)`;
        }

        const systemPrompt = `
        You are a "Destiny Travel Curator" specializing in MBTI and Saju (Four Pillars of Destiny).
        Your goal is to recommend the top 3 travel destinations in the requested region (${region}) and, if dates are provided, create a detailed itinerary.
        
        **CRITICAL INSTRUCTIONS**:
        1. **REGION**: Recommend places broadly within ${region}. Use your best judgment to find the best spots.
        2. **LANGUAGE**: Korean (Hangul) ONLY.
        3. **TERMINOLOGY**: When referring to Saju elements, MUST use Hanja (e.g., 금(金), 목(木), 수(水), 화(火), 토(土)). NEVER use English terms like 'Metal' or 'Water'.
        4. **TONE**: Exciting, evocative, and personalized storytelling style.
        5. **FORMAT**: Output MUST be a valid JSON object.
        
        **CONTENT REQUIREMENTS**:
        - Explain WHY it fits their Saju element or MBTI trait.
        - Use emojis (✈️, 🏞️, 🏖️) to make it visually popping.
        - If "Schedule" is provided, generate a day-by-day itinerary in the 'itinerary' field.
        
        **REQUIRED JSON STRUCTURE**:
        {
            "places": [
                { "name": "Place Name", "reason": "Detailed reason linking to their energy." },
                ... (3 places)
            ],
            "itinerary": [
                { "day": 1, "schedule": "Detailed morning/afternoon/evening plan..." },
                { "day": 2, "schedule": "..." }
                ... (Cover all days if duration is known, otherwise 3 days default)
            ],
            "summary": "A concluding paragraph giving overall travel advice."
        }
        `;

        const userQuery = `
        User: ${name} (${gender})
        MBTI: ${mbti}
        Saju Day Master: ${saju.dayMaster.korean} (${saju.dayMaster.description})
        Elements: Wood ${saju.elementRatio.wood}%, Fire ${saju.elementRatio.fire}%, Earth ${saju.elementRatio.earth}%, Metal ${saju.elementRatio.metal}%, Water ${saju.elementRatio.water}%
        
        Region: ${region}
        ${durationText}
        
        Recommend 3 places in ${region} and create a detailed itinerary.
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
            console.error("Raw Text:", responseText);
            return res.status(500).json({ error: "Failed to parse travel recommendation." });
        }

        res.status(200).json(content);

    } catch (error: any) {
        console.error(error);
        res.status(500).json({ error: 'Failed to generate trip recommendation' });
    }
};
