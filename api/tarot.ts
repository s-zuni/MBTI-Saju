import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamObject } from 'ai';
import { z } from 'zod';
import { corsHeaders, handleCors } from './_utils/cors';

export const config = {
    runtime: 'edge',
};

export default async (req: Request) => {
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { 
            status: 405, 
            headers: corsHeaders 
        });
    }

    try {
        const body = await req.json();
        const { question, selectedCards, spreadType, userContext } = body;
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.REACT_APP_GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
        
        if (!GEMINI_API_KEY) {
            console.error('[Tarot API] Missing GEMINI_API_KEY');
            return new Response(JSON.stringify({ error: '서버 설정 오류: API 키가 누락되었습니다.' }), { 
                status: 500, 
                headers: corsHeaders 
            });
        }

        let spreadContext = "";
        let positionDescriptions: string[] = [];

        switch (spreadType) {
            case 'daily':
                spreadContext = "User is asking for daily guidance (One Card Reading). Focus on the energy of the day and a key actionable advice.";
                positionDescriptions = ["Daily Advice"];
                break;
            case 'love':
                spreadContext = "User is asking about love/relationships (3 Card Spread). Interpret as: 1. User's Feelings/Position, 2. Partner's Feelings/Current Energy, 3. Future Outlook/Advice.";
                positionDescriptions = ["User's Feelings", "Partner's Feelings", "Future/Advice"];
                break;
            case 'career':
                spreadContext = "User is asking about career/work (3 Card Spread). Interpret as: 1. Current Situation, 2. Challenge/Obstacle, 3. Solution/Outcome.";
                positionDescriptions = ["Current Situation", "Challenge", "Solution/Outcome"];
                break;
            case 'celtic':
                spreadContext = "User is requesting a Celtic Cross Reading (10 Cards). Provide a deep, comprehensive analysis covering present, immediate challenge, distant past, recent past, best outcome, immediate future, internal feelings, external influences, hopes/fears, and final outcome.";
                positionDescriptions = [
                    "Present", "Challenge", "Distant Past", "Recent Past",
                    "Best Outcome", "Immediate Future", "Internal Feelings",
                    "External Influences", "Hopes/Fears", "Final Outcome"
                ];
                break;
            default: // basic 3 card fallback
                spreadContext = "User is asking a general question (3 Card Spread). Interpret as Past, Present, and Future.";
                positionDescriptions = ["Past/Situation", "Present/Action", "Future/Result"];
        }

        let personalization = "";
        if (userContext) {
            if (userContext.name) personalization += `Address the user as "${userContext.name}님". `;
            if (userContext.mbti) personalization += `User's MBTI is ${userContext.mbti}. Adapt your tone to fit this personality type (e.g., T=Logical, F=Empathetic, J=Structured, P=Flexible). `;
            if (userContext.birthDate) personalization += `User's birth date is ${userContext.birthDate}. Occasionally reference their astrological/elemental energy if it fits the cards. `;
        }

        const systemPrompt = `
        You are a Mystical Tarot Reader with deep intuition and a connection to the subconscious.
        ${spreadContext}
        
        **Personalization Context**:
        ${personalization}
        
        **Instructions**:
        - **Atmosphere**: Create a sacred, quiet atmosphere in your writing. Use words like "energy," "flow," "shadow," "light."
        - **Narrative**: Don't just define the cards. Weave them into a story specific to the user's question.
          - *Connect* the cards: "While [Card 1] suggests X, [Card 2] warns that..."
        - **Actionable Wisdom**: End with a clear, empowering message, not just fatalistic prediction.
        - **Tone**: Mystical but grounded. Empathetic. Polite Korean.
        - **Language**: Korean Only.

        **JSON Output Structure**:
        {
            "cardReadings": [
                { "cardName": "Card Name", "interpretation": "Deep interpretation for this position..." }
                // ... one for each card
            ],
            "overallReading": "A synthesis of the entire spread, connecting the cards into a cohesive message.",
            "advice": "One clear, spiritual yet practical action item."
        }
        `;

        let cardsList = "";
        selectedCards.forEach((card: any, idx: number) => {
            const position = positionDescriptions[idx] || `Position ${idx + 1}`;
            cardsList += `${idx + 1}. [${position}]: ${card.name} (${card.name_ko})\n`;
        });

        const userQuery = `
        Question: "${question}"
        Spread Type: ${spreadType}
        Selected Cards:
        ${cardsList}
        `;

        const google = createGoogleGenerativeAI({ apiKey: GEMINI_API_KEY });
        
        const result = await streamObject({
            model: google('gemini-3.1-flash-lite-preview'),
            schema: z.object({
                cardReadings: z.array(z.object({
                    cardName: z.string(),
                    interpretation: z.string()
                })),
                overallReading: z.string(),
                advice: z.string()
            }),
            system: systemPrompt + "\nCRITICAL (절대 준수): 답변 어디에도 마크다운 강조 기호인 별표 두 개(**)를 절대로 사용하지 마세요. 강조가 필요하면 글머리표(-), 이모지 등을 활용하세요. ** 을 사용하면 시스템 오류가 발생합니다.",
            prompt: userQuery,
        });

        return result.toTextStreamResponse({ headers: corsHeaders });
    } catch (error: any) {
        console.error("Tarot API Error:", error);
        return new Response(JSON.stringify({ error: error.message }), { 
            status: 500, 
            headers: corsHeaders 
        });
    }
};
