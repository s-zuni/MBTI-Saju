import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
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
    res.setHeader('Access-Control-Allow-Origin', '*'); // Consider restricting this to your frontend's domain in production
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
        console.log("Fortune Request Body:", req.body); // Check what we receive

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
                You are a wise and friendly fortune teller using Western Astrology (Zodiac Signs).
                Your role is to provide a positive and encouraging "Today's Fortune" for a user with the Zodiac sign: ${zodiac}.
                The response MUST be a JSON object with one key: "fortune".
                The value should be a string of about 200-400 Korean characters.
                Start by mentioning their Zodiac sign (e.g., "오늘의 물병자리 운세는...").
                Maintain a warm and hopeful tone.
                **IMPORTANT**: Add relevant emojis (✨, 🍀, 🌈) throughout the text to make it visually engaging.
            `;

            const userQuery = `
                Please provide today's fortune for me. My birthdate is ${birthDate} (${zodiac}).
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
            console.error('Server Error:', error);
            res.status(500).json({ error: 'An error occurred while generating the fortune.' });
        }
    } else {
        res.status(405).json({ error: 'Method Not Allowed' });
    }
};
