import { GoogleGenerativeAI } from '@google/generative-ai';
import { cleanAndParseJSON } from './_utils/json';

export default async (req: any, res: any) => {
    // CORS configuration
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    try {
        const { question, selectedCards, spreadType, userContext } = req.body;
        // spreadType: 'daily' | 'love' | 'career' | 'celtic'
        // userContext: { mbti?: string, birthDate?: string, name?: string }

        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
        if (!GEMINI_API_KEY) throw new Error('Missing Gemini API Key');

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

        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({
            model: "gemini-3-flash-preview", // Updated to stable model or use flash-preview if preferred
            systemInstruction: systemPrompt
        });

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: userQuery }] }],
            generationConfig: { responseMimeType: "application/json" }
        });

        const responseText = result.response.text();

        let content;
        try {
            content = cleanAndParseJSON(responseText);
        } catch (e) {
            console.error("JSON Parse Error:", e);
            console.error("Raw Text:", responseText); // Log raw text for debugging
            throw new Error("Failed to parse AI response");
        }

        res.status(200).json(content);

    } catch (error: any) {
        console.error("Tarot API Error:", error);
        res.status(500).json({ error: 'Failed to read tarot cards', details: error.message });
    }
};
