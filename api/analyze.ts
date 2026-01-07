import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import { calculateSaju } from './_utils/saju';
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

            // Calculate Saju
            const sajuResult = calculateSaju(birthDate, birthTime);

            // Translate elements to Korean for the prompt to avoid English leakage
            const elementKoreanMap: { [key: string]: string } = {
                wood: '목(Wood)', fire: '화(Fire)', earth: '토(Earth)', metal: '금(Metal)', water: '수(Water)'
            };

            const systemPrompt = `
            You are an expert consultant specializing in the fusion of MBTI and traditional Korean Saju (Four Pillars of Destiny).
            Your role is to analyze a user's information and provide a COMPREHENSIVE and DETAILED analysis (approx. 1 page length in content).
            Maintain a friendly, encouraging, and professional tone.
            The response MUST be in Korean (Hangul).
            DO NOT use English terms for Saju elements (e.g., do NOT use 'Metal', 'Wood'). ALWAYS use Korean terms like '금(Metal)', '목(Wood)', or just '금', '목'.
            
            The response MUST be a JSON object with the following keys:
            - "keywords": 3-4 key personality keywords (string).
            - "commonalities": Explanation of common points between Saju and MBTI (string).
            - "typeDescription": A description of their Saju Day Master type (e.g., "섬세한 보석 신금") (string).
            - "elementAnalysis": A brief analysis of their element distribution (e.g., "물(수)이 많아 지혜롭지만...") (string).
            - "detailedAnalysis": A deep dive into their personality, potential, and life path combining MBTI and Saju (string, long text).
            `;

            const userQuery = `
            Please analyze the following user:
            - Name: ${name}
            - Gender: ${gender}
            - MBTI: ${mbti}
            - Birth: ${birthDate} ${birthTime || '(Time Unknown)'}
            
            [Saju Data]
            - Day Master (Il-Gan): ${sajuResult.dayMaster.korean} (${sajuResult.dayMaster.description})
            - Pillars (Gan-Zhi): Year(${sajuResult.ganZhi.year}), Month(${sajuResult.ganZhi.month}), Day(${sajuResult.ganZhi.day}), Hour(${sajuResult.ganZhi.hour})
            - Element Connection:
              Wood: ${sajuResult.elements.wood}, Fire: ${sajuResult.elements.fire}, Earth: ${sajuResult.elements.earth}, Metal: ${sajuResult.elements.metal}, Water: ${sajuResult.elements.water}

            Provide the JSON response based on this. Ensure "Metal" is displayed as "금" or "금(Metal)" and never just "Metal".
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

            // Merge calculated Saju data with AI response
            const finalResponse = {
                ...content,
                saju: sajuResult
            };

            res.status(200).json(finalResponse);
        } else {
            res.status(405).json({ error: 'Method Not Allowed' });
        }
    } catch (error: any) {
        console.error('Server Error:', error);
        res.status(500).json({ error: error.message || 'An internal server error occurred.' });
    }
};
