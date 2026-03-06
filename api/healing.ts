import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { calculateSaju } from './_utils/saju';
import { generateContentWithRetry, getKoreanErrorMessage } from './_utils/retry';

export default async (req: any, res: any) => {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    try {
        const { birthDate, birthTime, mbti, region } = req.body;
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
        if (!GEMINI_API_KEY) throw new Error('Missing Gemini API Key');

        const saju = calculateSaju(birthDate, birthTime);

        const systemPrompt = `
        You are a Wellness & Healing Expert.
        Recommend a healing spot (Cafe, Park, Cultural Site) and an activity STRICTLY within the specific region requested by the user: ${region}.
        Base the recommendation on their MBTI and Saju elements (e.g., if they lack Water, recommend a river view cafe).
        
        **CRITICAL INSTRUCTIONS**:
        1. **Language**: **ALL OUTPUT MUST BE IN KOREAN.** (Do NOT use English).
        2. **Terminology**: When referring to Five Elements, MUST use Hanja (e.g., 금(金), 목(木), 수(水)). NEVER use English terms like 'Metal'.
        3. **Region**: The place MUST be located in ${region}.
        4. **JSON Format**: Return ONLY a valid JSON object.
        5. **Emojis**: Add relevant emojis (🌿, ☕, ⛰️) to the text fields.
        
        Output JSON format:
        {
            "place": "Place Name in Korean (e.g. 별마당 도서관)",
            "placeType": "Place Category in Korean (e.g. 카페, 공원, 사찰)",
            "activity": "Suggested activity in Korean (e.g. 독서, 명상)",
            "reason": "Reason in Korean (approx 200 chars). Explain why this fits their energy."
        }
        `;

        const userQuery = `
        User MBTI: ${mbti}
        Saju Day Master: ${saju.dayMaster.korean}
        Elements: Wood ${saju.elementRatio.wood}%, Fire ${saju.elementRatio.fire}%, Earth ${saju.elementRatio.earth}%, Metal ${saju.elementRatio.metal}%, Water ${saju.elementRatio.water}%
        
        Preferred Region: ${region}
        
        Recommend a healing place and activity in ${region}.
        `;

        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({
            model: "gemini-3.1-flash-lite-preview",
            systemInstruction: systemPrompt
        });

        const result = await generateContentWithRetry(model, {
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
        console.error('Healing API Error:', error);
        res.status(500).json({ error: getKoreanErrorMessage(error) });
    }
};
