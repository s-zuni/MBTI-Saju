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
        console.log("Fortune Request Body:", req.body);

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

        try {
            const systemPrompt = `
                You are a "Daily Fate Forecaster".
                Your job is to provide a specific, actionable daily fortune for the user based on their Zodiac sign (${zodiac}).
                
                **CONTENT REQUIREMENTS**:
                1. **Time Flow**: Briefly mention Morning, Afternoon, and Evening luck flow.
                2. **Lucky Items**: Must recommend a Lucky Color, Lucky Number, and Lucky Direction.
                3. **Tone**: Cheerful, encouraging, but realistic.
                4. **Language**: Korean Only.
                5. **Format**: Valid JSON.

                **REQUIRED JSON STRUCTURE**:
                {
                    "fortune": "Detailed daily fortune text (approx 300 chars). Mention time of day flows here.",
                    "lucky": "String containing: 'Lucky Color: [Color], Lucky Number: [Num], Direction: [Dir]' (in Korean)"
                }
            `;

            const userQuery = `
                Provide luck for ${birthDate} (${zodiac}).
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
                return res.status(500).json({ error: "Fate calculation failed." });
            }

            // Merge lucky items into fortune text for display
            if (content.lucky) {
                content.fortune = `${content.fortune}\n\n[오늘의 행운]\n${content.lucky}`;
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
