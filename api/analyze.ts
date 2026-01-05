import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
// Fallback types if @vercel/node is not available
type VercelRequest = any;
type VercelResponse = any;

// It's crucial to use environment variables for Supabase credentials
export default async (req: VercelRequest, res: VercelResponse) => {
    // CORS configuration
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        // It's crucial to use environment variables for Supabase credentials inside the handler
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
        const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

        if (!supabaseUrl || !supabaseAnonKey || !OPENAI_API_KEY) {
            throw new Error('Missing environment variables');
        }

        const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
            const { mbti, birthDate, birthTime, gender, name } = req.body;

            if (!name || !gender || !birthDate || !mbti) {
                return res.status(400).json({ error: 'Required fields (name, gender, birthDate, mbti) are missing.' });
            }

            const systemPrompt = `
            You are an expert consultant specializing in the fusion of MBTI and traditional Korean Saju (Four Pillars of Destiny).
            Your role is to analyze a user's information and provide a concise, insightful analysis of about 700 characters in total.
            Maintain a friendly, encouraging, and professional tone.
            The response MUST be a JSON object with three keys: "keywords", "commonalities", and "fortune2026".
            Each section should be a string.
            `;

            const userQuery = `
            Please analyze the following user information:
            - Name: ${name}
            - Gender: ${gender}
            - Date of Birth: ${birthDate}
            - Time of Birth: ${birthTime || 'Unknown'}
            - MBTI: ${mbti}

            Provide your analysis in a JSON object with the following structure:
            1. "keywords": Identify 3-4 key personality keywords from both the user's Saju and MBTI.
            2. "commonalities": Briefly explain the common points and unique characteristics found between the Saju and MBTI results.
            3. "fortune2026": Provide a simple, positive fortune for the year 2026 based on the overall analysis.
            `;

            const apiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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

            if (!apiResponse.ok) {
                const errorBody = await apiResponse.text();
                console.error('OpenAI API Error:', errorBody);
                throw new Error(`OpenAI API request failed with status ${apiResponse.status}`);
            }

            const responseData: any = await apiResponse.json();
            const content = JSON.parse(responseData.choices[0].message.content);

            res.status(200).json(content);
        } else {
            res.status(405).json({ error: 'Method Not Allowed' });
        }
    } catch (error: any) {
        console.error('Server Error:', error);
        res.status(500).json({ error: error.message || 'An internal server error occurred.' });
    }
};
