import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { calculateSaju } from './_utils/saju';

export default async (req: any, res: any) => {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    try {
        const { birthDate, birthTime, mbti, gender, name } = req.body;
        const supabaseUrl = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
        const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

        if (!GEMINI_API_KEY) throw new Error('Missing Gemini API Key');

        // Calculate Saju
        const saju = calculateSaju(birthDate, birthTime);

        const systemPrompt = `
        You are a Travel Consultant specializing in MBTI and Saju (Four Pillars of Destiny).
        Recommend travel destinations that balance the user's energy.
        
        Requirements:
        1. Recommend 2 Domestic destinations in South Korea.
        2. Recommend 1 Overseas destination.
        3. Total length around 500 Korean characters.
        4. Response MUST be in Korean.
        5. Output JSON format:
        {
            "domestic": [
                { "name": "Place Name", "reason": "Reason why..." },
                { "name": "Place Name", "reason": "Reason why..." }
            ],
            "overseas": { "name": "Place Name", "reason": "Reason why..." },
            "summary": "Overall travel advice..."
        }
        `;

        const userQuery = `
        User: ${name} (${gender})
        MBTI: ${mbti}
        Saju Day Master: ${saju.dayMaster.korean} (${saju.dayMaster.description})
        Elements: Wood ${saju.elementRatio.wood}%, Fire ${saju.elementRatio.fire}%, Earth ${saju.elementRatio.earth}%, Metal ${saju.elementRatio.metal}%, Water ${saju.elementRatio.water}%
        
        Recommend 2 Korean places and 1 Overseas place that fit this person's energy.
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
        const content = JSON.parse(responseText);
        res.status(200).json(content);

    } catch (error: any) {
        console.error(error);
        res.status(500).json({ error: 'Failed to generate trip recommendation' });
    }
};
