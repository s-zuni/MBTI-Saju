import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { cleanAndParseJSON } from './_utils/json';

// Fallback types if @vercel/node is not available
type VercelRequest = any;
type VercelResponse = any;

// It's crucial to use environment variables for Supabase credentials
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;

export default async (req: VercelRequest, res: VercelResponse) => {
    // CORS configuration
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Authenticate user
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'Authorization header is missing.' });
    }
    const token = authHeader.split(' ')[1]!;
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
        return res.status(401).json({ error: 'User not authenticated.' });
    }

    if (req.method === 'POST') {
        const { birthDate } = req.body;

        // Simple Zodiac Calculation Function
        const getZodiacSign = (dateStr: string) => {
            if (!dateStr) return 'Unknown';
            const date = new Date(dateStr);
            const month = date.getMonth() + 1;
            const day = date.getDate();

            if ((month == 1 && day <= 20) || (month == 12 && day >= 22)) return "Capricorn (염소자리)";
            if ((month == 1 && day >= 21) || (month == 2 && day <= 18)) return "Aquarius (물병자리)";
            if ((month == 2 && day >= 19) || (month == 3 && day <= 20)) return "Pisces (물고기자리)";
            if ((month == 3 && day >= 21) || (month == 4 && day <= 19)) return "Aries (양자리)";
            if ((month == 4 && day >= 20) || (month == 5 && day <= 20)) return "Taurus (황소자리)";
            if ((month == 5 && day >= 21) || (month == 6 && day <= 21)) return "Gemini (쌍둥이자리)";
            if ((month == 6 && day >= 22) || (month == 7 && day <= 22)) return "Cancer (게자리)";
            if ((month == 7 && day >= 23) || (month == 8 && day <= 22)) return "Leo (사자자리)";
            if ((month == 8 && day >= 23) || (month == 9 && day <= 22)) return "Virgo (처녀자리)";
            if ((month == 9 && day >= 23) || (month == 10 && day <= 23)) return "Libra (천칭자리)";
            if ((month == 10 && day >= 24) || (month == 11 && day <= 22)) return "Scorpio (전갈자리)";
            if ((month == 11 && day >= 23) || (month == 12 && day <= 21)) return "Sagittarius (궁수자리)";
            return "Unknown";
        };

        const zodiac = getZodiacSign(birthDate);
        const today = new Date().toLocaleDateString('ko-KR');

        try {
            const systemPrompt = `
                You are a "Daily Fate Forecaster" with a voice of clarity and gentle authority.
                Your job is to interpret the cosmic flow for the user's Zodiac sign (${zodiac}).
                
                **PERSONA & TONE**:
                - You are not guessing; you are reading the flow of energy.
                - **Tone**: Insightful, encouraging, slightly poetic but grounded in reality.
                - **Style**: Use "Today, the energy of [Sign] suggests..." or "Be mindful of..."
                
                **CONTENT REQUIREMENTS**:
                1. **Narrative Flow**: Don't just list facts. Create a short story of the day's energy (Morning -> Night).
                2. **Specific Advice**: Give one concrete action item (e.g., "Avoid impulsive spending," "Call an old friend").
                3. **Lucky Elements**: Must provide Color, Number, and Direction.
                4. **Language**: Korean Only.
                5. **Format**: Valid JSON.

                **REQUIRED JSON STRUCTURE (Strict)**:
                {
                    "today": {
                        "fortune": "Detailed today's fortune text (approx 200 chars). Focus on mindset and key events.",
                        "lucky": {
                            "color": "Color Name (e.g., Deep Blue)",
                            "number": "Number (e.g., 7)",
                            "direction": "Direction (e.g., East)"
                        }
                    },
                    "tomorrow": {
                        "fortune": "Detailed tomorrow's fortune text (approx 200 chars). Focus on preparation and outlook.",
                        "lucky": {
                            "color": "Color Name",
                            "number": "Number",
                            "direction": "Direction"
                        }
                    }
                }
            `;

            const userQuery = `
                Provide luck for Today (${today}) and Tomorrow for ${zodiac}.
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
                throw new Error("Failed to parse AI response");
            }

            res.status(200).json(content);

        } catch (error: any) {
            console.error('Server Error:', error);
            res.status(500).json({ error: 'An error occurred while generating the fortune.' });
        }
    } else {
        res.status(405).json({ error: 'Method Not Allowed' });
    }
};
