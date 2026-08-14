import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamObject } from 'ai';
import { z } from 'zod';
import { corsHeaders, handleCors } from './_utils/cors';
import { getAIProvider, isRetryableAIError, BASE_SYSTEM_PROMPT } from './_utils/ai-provider';


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
        // AI Key checking is now handled centrally in ai-provider.ts

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
${BASE_SYSTEM_PROMPT}

You are a realistic tarot analyst and intuitive strategist who interprets tarot cards through objective analysis of energetic flows (weather) and MBTI behavioral prescription.
${spreadContext}

**Personalization Context**:
${personalization}

**Instructions**:
- **Atmosphere**: Objective, realistic, yet profound. Avoid generic sentimentality or fear-mongering.
- **Narrative**: Connect the cards and user context into a dry, factual diagnosis of the current trajectory (Step 1 & Step 2).
- **Actionable Wisdom**: End with clear, concrete MBTI-tailored behavioral advice (Step 3).
- **Language**: Korean Only.

**JSON Output Structure**:
{
    "cardReadings": [
        { "cardName": "Card Name", "interpretation": "Deep interpretation for this position..." }
    ],
    "overallReading": "A synthesis of the entire spread, connecting the cards into a cohesive message.",
    "advice": "One clear, highly practical action item tailored for the user's MBTI."
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

        const schema = z.object({
            cardReadings: z.array(z.object({
                cardName: z.string(),
                interpretation: z.string()
            })),
            overallReading: z.string(),
            advice: z.string()
        });
        const fullSystemPrompt = systemPrompt + "\nCRITICAL (절대 준수): 답변 어디에도 마크다운 강조 기호인 별표 두 개(**)를 절대로 사용하지 마세요. 강조가 필요하면 글머리표(-), 이모지 등을 활용하세요. ** 을 사용하면 시스템 오류가 발생합니다.";

        try {
            let lastError;
            for (let attempt = 0; attempt < 4; attempt++) {
                try {
                    const { model, name } = getAIProvider(attempt);
                    const result = await streamObject({
                        model,
                        schema,
                        system: fullSystemPrompt,
                        prompt: userQuery,
                        maxTokens: 16384,
                        maxRetries: 0, // Faster switching
                    });
                    return result.toTextStreamResponse({ headers: corsHeaders });
                } catch (error) {
                    lastError = error;
                    console.warn(`Attempt ${attempt + 1} (${getAIProvider(attempt).name}) failed for tarot:`, error);
                    if (!isRetryableAIError(error)) break;
                }
            }
            throw lastError;
        } catch (error: any) {
            console.error("Tarot API Error:", error);
            return new Response(JSON.stringify({ error: error.message }), { 
                status: 500, 
                headers: corsHeaders 
            });
        }
    } catch (error: any) {
        console.error("Tarot API Error:", error);
        return new Response(JSON.stringify({ error: error.message }), { 
            status: 500, 
            headers: corsHeaders 
        });
    }
};
