import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { calculateSaju } from './_utils/saju';
import { generateContentWithRetry, getKoreanErrorMessage } from './_utils/retry';

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
            - "desc": A detailed paragraph explaining the compatibility, strengths, and advice (string). "도화살", "홍염살", "역마살" 등 사주 원국에서 도출되는 흥미로운 신살(神殺)이 있다면 적극적으로 언급하여 매력을 어필해주세요 (단, 해당되는 살이 없을 경우 억지로 적지 말 것).
            - "keywords": 3 key phrases summarizing the relationship (e.g., "상호보완", "티키타카 친구", "도화살 매력") (string).
            
            **IMPORTANT**: Use emojis (❤️, 🤝, ⭐) in the description and keywords to make it friendly and fun.
            `;

            const userQuery = `
            Person A (User):
            - Name: ${myProfile.name}
            - MBTI: ${myProfile.mbti}
            - Saju GanZhi (사주 원국): Year ${mySaju.ganZhi.year}, Month ${mySaju.ganZhi.month}, Day ${mySaju.ganZhi.day}, Hour ${mySaju.ganZhi.hour}
            - Saju Day Master: ${mySaju.dayMaster.korean} (${mySaju.dayMaster.description})
            - Elements: Wood ${mySaju.elementRatio.wood}%, Fire ${mySaju.elementRatio.fire}%, Earth ${mySaju.elementRatio.earth}%, Metal ${mySaju.elementRatio.metal}%, Water ${mySaju.elementRatio.water}%

            Person B (Partner):
            - Name: ${partnerProfile.name}
            - MBTI: ${partnerProfile.mbti}
            - Saju GanZhi (사주 원국): Year ${partnerSaju.ganZhi.year}, Month ${partnerSaju.ganZhi.month}, Day ${partnerSaju.ganZhi.day}, Hour ${partnerSaju.ganZhi.hour}
            - Saju Day Master: ${partnerSaju.dayMaster.korean} (${partnerSaju.dayMaster.description})
            - Elements: Wood ${partnerSaju.elementRatio.wood}%, Fire ${partnerSaju.elementRatio.fire}%, Earth ${partnerSaju.elementRatio.earth}%, Metal ${partnerSaju.elementRatio.metal}%, Water ${partnerSaju.elementRatio.water}%

            Analyze their compatibility as "${relationshipStr}" based on MBTI interaction and Saju elemental balance/harmony. Identify any notable Shensha (신살) like 도화살 or 홍염살 from their GanZhi to make the description more engaging.
            `;

            const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({
                model: "gemini-3.1-flash-lite-preview",
                systemInstruction: systemPrompt
            });

            const result = await generateContentWithRetry(model, {
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
        res.status(500).json({ error: getKoreanErrorMessage(error) });
    }
};
