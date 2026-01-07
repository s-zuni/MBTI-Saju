import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import { calculateSaju } from './_utils/saju';

export default async (req: any, res: any) => {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    try {
        const { birthDate, birthTime, mbti, region } = req.body;
        const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
        if (!OPENAI_API_KEY) throw new Error('Missing OpenAI API Key');

        const saju = calculateSaju(birthDate, birthTime);

        const systemPrompt = `
        You are a Wellness & Healing Expert.
        Recommend a healing spot (Cafe, Park, Cultural Site) and an activity in a specific region requested by the user.
        Base the recommendation on their MBTI and Saju elements (e.g., if they lack Water, recommend a river view cafe).
        
        **STYLE**: Use Emojis (🌿, ☕, ⛰️) to decorate the text.
        Response MUST be in Korean.
        
        Output JSON format:
        {
            "place": "Specific Name of the Place (e.g. Starfield Library)",
            "placeType": "Category (e.g. Cafe, Park, Temple)",
            "activity": "Suggested activity (e.g. reading, meditation)",
            "reason": "Why this fits their energy (approx 200 chars)."
        }
        `;

        const userQuery = `
        User MBTI: ${mbti}
        Saju Day Master: ${saju.dayMaster.korean}
        Elements: Wood ${saju.elementRatio.wood}%, Fire ${saju.elementRatio.fire}%, Earth ${saju.elementRatio.earth}%, Metal ${saju.elementRatio.metal}%, Water ${saju.elementRatio.water}%
        
        Preferred Region: ${region}
        
        Recommend a healing place and activity in ${region}.
        `;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo-1106',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userQuery }
                ],
                temperature: 0.7,
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) throw new Error('OpenAI API Error');
        const data: any = await response.json();
        res.status(200).json(JSON.parse(data.choices[0].message.content));

    } catch (error: any) {
        console.error(error);
        res.status(500).json({ error: 'Failed to generate healing recommendation' });
    }
};
