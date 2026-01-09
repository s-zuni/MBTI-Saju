import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { calculateSaju } from './_utils/saju';

type VercelRequest = any;
type VercelResponse = any;

export default async (req: VercelRequest, res: VercelResponse) => {
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

    try {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

        if (!supabaseUrl || !supabaseAnonKey || !GEMINI_API_KEY) {
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
            const { myProfile, partnerProfile, relationshipType = 'lover' } = req.body;

            if (!myProfile || !partnerProfile) {
                return res.status(400).json({ error: 'Missing profile information.' });
            }

            // Calculate Saju for both
            const mySaju = calculateSaju(myProfile.birthDate, myProfile.birthTime);
            const partnerSaju = calculateSaju(partnerProfile.birthDate, partnerProfile.birthTime);

            const relationshipKoreanMap: { [key: string]: string } = {
                lover: '연인 (Lover)',
                friend: '친구 (Friend)',
                family: '가족 (Family)',
                colleague: '동료 (Colleague)',
                other: '그 외 (Other)'
            };
            const relationshipStr = relationshipKoreanMap[relationshipType] || '연인';

            const systemPrompt = `
            You are an expert relationship consultant specializing in MBTI and traditional Korean Saju (Four Pillars of Destiny).
            Analyze the compatibility between two people based on their profiles.
            The relationship type is: ${relationshipStr}.
            Maintain a friendly, insightful, and professional tone.
            The response MUST be in Korean (Hangul).
            The response MUST be a JSON object with the following keys:
            - "score": A compatibility score between 0 and 100 (number).
            - "desc": A detailed paragraph explaining the compatibility, strengths, and advice (string).
            - "keywords": 3 key phrases summarizing the relationship (e.g., "상호보완", "티키타카 친구") (string).
            `;

            const userQuery = `
            Person A (User):
            - Name: ${myProfile.name}
            - MBTI: ${myProfile.mbti}
            - Saju Day Master: ${mySaju.dayMaster.korean} (${mySaju.dayMaster.description})
            - Elements: Wood ${mySaju.elementRatio.wood}%, Fire ${mySaju.elementRatio.fire}%, Earth ${mySaju.elementRatio.earth}%, Metal ${mySaju.elementRatio.metal}%, Water ${mySaju.elementRatio.water}%

            Person B (Partner):
            - Name: ${partnerProfile.name}
            - MBTI: ${partnerProfile.mbti}
            - Saju Day Master: ${partnerSaju.dayMaster.korean} (${partnerSaju.dayMaster.description})
            - Elements: Wood ${partnerSaju.elementRatio.wood}%, Fire ${partnerSaju.elementRatio.fire}%, Earth ${partnerSaju.elementRatio.earth}%, Metal ${partnerSaju.elementRatio.metal}%, Water ${partnerSaju.elementRatio.water}%

            Analyze their compatibility as "${relationshipStr}" based on MBTI interaction and Saju elemental balance/harmony.
            `;

            const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({
                model: "gemini-3.0-flash",
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
        } else {
            res.status(405).json({ error: 'Method Not Allowed' });
        }

    } catch (error: any) {
        console.error('Compatibility API Error:', error);
        res.status(500).json({ error: error.message || 'Error calculating compatibility.' });
    }
};
