import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
// Fallback types if @vercel/node is not available
type VercelRequest = any;
type VercelResponse = any;

// It's crucial to use environment variables for Supabase credentials
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;

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
        try {
            const systemPrompt = `
                You are a wise and friendly fortune teller.
                Your role is to provide a positive and encouraging "Today's Fortune" for a user.
                The response MUST be a JSON object with one key: "fortune".
                The value should be a string of about 200-400 Korean characters.
                Maintain a warm and hopeful tone.
            `;

            const userQuery = `
                Please provide today's fortune for me.
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
                    temperature: 0.8,
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

        } catch (error: any) {
            console.error('Server Error:', error);
            res.status(500).json({ error: 'An error occurred while generating the fortune.' });
        }
    } else {
        res.status(405).json({ error: 'Method Not Allowed' });
    }
};
