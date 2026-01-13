import { GoogleGenerativeAI } from '@google/generative-ai';

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
        const { question, selectedCards } = req.body;
        // selectedCards: Array of { name: string, name_ko: string, ... }

        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
        if (!GEMINI_API_KEY) throw new Error('Missing Gemini API Key');

        const systemPrompt = `
        You are a Mystical Tarot Reader.
        User has asked a question and selected 3 cards (Past/Present/Future or Situation/Action/Outcome).
        Interpret these cards in the context of their question.

        **Structure**:
        1. **Card Interpretation**: Brief meaning of each card.
        2. **Synthesis**: How they tell a story together regarding the question.
        3. **Advice**: Actionable advice based on the reading.

        **Tone**: Mystical, intuitive, yet clear.
        **Language**: Korean Only.
        **JSON Output**:
        {
            "cardReadings": [
                { "cardName": "Card 1 Name", "interpretation": "Meaning..." },
                { "cardName": "Card 2 Name", "interpretation": "Meaning..." },
                { "cardName": "Card 3 Name", "interpretation": "Meaning..." }
            ],
            "overallReading": "Synthesis of the reading...",
            "advice": "Final advice..."
        }
        `;

        const userQuery = `
        Question: "${question}"
        Selected Cards:
        1. ${selectedCards[0].name} (${selectedCards[0].name_ko})
        2. ${selectedCards[1].name} (${selectedCards[1].name_ko})
        3. ${selectedCards[2].name} (${selectedCards[2].name_ko})
        `;

        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({
            model: "gemini-3-flash-preview",
            systemInstruction: systemPrompt
        });

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: userQuery }] }],
            generationConfig: { responseMimeType: "application/json" }
        });

        const responseText = result.response.text();
        const content = JSON.parse(responseText);

        res.status(200).json(content);

    } catch (error: any) {
        console.error("Tarot API Error:", error);
        res.status(500).json({ error: 'Failed to read tarot cards', details: error.message });
    }
};
