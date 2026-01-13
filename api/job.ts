import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { calculateSaju } from './_utils/saju';
import { cleanAndParseJSON } from './_utils/json';

export default async (req: any, res: any) => {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    try {
        const { birthDate, birthTime, mbti } = req.body;
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
        if (!GEMINI_API_KEY) throw new Error('Missing Gemini API Key');

        const saju = calculateSaju(birthDate, birthTime);

        const systemPrompt = `
        You are an expert "Career Strategy Consultant" specializing in MBTI and Saju.
        Your goal is to recommend the best career paths that align with the user's personality and elemental strengths.
        
        **CRITICAL INSTRUCTIONS**:
        1. **Element Names**: Format as "Korean (Hanja)". e.g. 금 (金).
        2. **Tone**: Professional, encouraging, and logical.
        3. **Language**: Korean only.
        4. **Format**: Valid JSON.

        **CONTENT REQUIREMENTS**:
        - **Jobs**: Recommend 3 distinct job titles or fields.
        - **Reason**: A 300-500 character explanation linking their MBTI cognitive functions (Fe, Ti, etc.) and Saju element balance to these careers. Why will they succeed here?

        **REQUIRED JSON STRUCTURE**:
        {
            "jobs": ["Job Title 1", "Job Title 2", "Job Title 3"],
            "reason": "Detailed consulting advice explaining the fit. Use helpful emojis (💼, 📈)."
        }
        `;

        const userQuery = `
        User MBTI: ${mbti}
        Saju Day Master: ${saju.dayMaster.korean}
        Elements: Wood ${saju.elementRatio.wood}%, Fire ${saju.elementRatio.fire}%, Earth ${saju.elementRatio.earth}%, Metal ${saju.elementRatio.metal}%, Water ${saju.elementRatio.water}%
        
        Recommend 3 best career paths.
        `;

        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash-001",
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
            return res.status(500).json({ error: "Failed to generate job recommendation" });
        }

        res.status(200).json(content);

    } catch (error: any) {
        console.error(error);
        res.status(500).json({ error: 'Failed to generate job recommendation' });
    }
};
