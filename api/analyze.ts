import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { calculateSaju } from './_utils/saju';
import { cleanAndParseJSON } from './_utils/json';
import { generateContentWithRetry, getKoreanErrorMessage } from './_utils/retry';

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
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

        if (!supabaseUrl || !supabaseAnonKey || !GEMINI_API_KEY) {
            const missing = [];
            if (!supabaseUrl) missing.push('SUPABASE_URL');
            if (!supabaseAnonKey) missing.push('SUPABASE_ANON_KEY');
            if (!GEMINI_API_KEY) missing.push('GEMINI_API_KEY');
            console.error('Missing Environment Variables:', missing.join(', '));
            throw new Error(`Missing environment variables: ${missing.join(', ')}`);
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

            const systemPrompt = `
            You are a world-renowned master of both Eastern Saju/Myungri (Four Pillars of Destiny) and Western MBTI psychology, taking on the role of a 'Premium Soul Consultant'.
            Your task is to create the CORE part of a premium "MBTIJU 소울 리포트".
            
            **CRITICAL INSTRUCTIONS**: 
            1. **LANGUAGE**: Korean (Hangul) ONLY.
            2. **TONE**: Professional, empathetic, deeply insightful.
            3. **FORMAT**: Output MUST be a valid JSON object.
            4. **NO MARKDOWN BOLDING**: Do NOT use '**' characters.
            
            **REQUIRED JSON STRUCTURE (Core Analysis)**:
            {
                "keywords": "3-4 Keywords capturing their soul essence",
                "reportTitle": "A poetic title summarizing their essence",
                "nature": {
                    "title": "본성(Nature): 사주 분석",
                    "dayPillarSummary": "Poetic description of their Day Pillar (일주)",
                    "dayMasterAnalysis": "Detailed analysis of their Day Master (일간)",
                    "dayBranchAnalysis": "Analysis of their Day Branch (일지)",
                    "monthBranchAnalysis": "Analysis of their Month Branch (월지)"
                },
                "fiveElements": {
                    "title": "오행의 구성 분석 (The Five Elements)",
                    "elements": [
                        {"element": "목(木)", "count": 0, "function": "식상(Express)", "interpretation": "해석"},
                        {"element": "화(火)", "count": 0, "function": "재성(Result)", "interpretation": "해석"},
                        {"element": "토(土)", "count": 0, "function": "관성(Rule)", "interpretation": "해석"},
                        {"element": "금(金)", "count": 0, "function": "인성(Resource)", "interpretation": "해석"},
                        {"element": "수(水)", "count": 0, "function": "비겁(Self)", "interpretation": "해석"}
                    ],
                    "summary": "Overall elemental balance analysis"
                },
                "persona": {
                    "title": "페르소나(Persona): MBTI 분석",
                    "mbtiNickname": "MBTI nickname",
                    "dominantFunction": "주기능 analysis",
                    "auxiliaryFunction": "부기능 analysis",
                    "tertiaryFunction": "3차 기능 analysis",
                    "inferiorFunction": "열등기능 mention"
                },
                "deepIntegration": {
                    "title": "융합 분석: 사주와 MBTI의 상호작용",
                    "integrationPoints": [
                        {"subtitle": "일간과 MBTI 핵심 기능의 결합", "content": "content"},
                        {"subtitle": "오행 기운과 인지기능의 연결", "content": "content"},
                        {"subtitle": "시너지와 잠재적 딜레마", "content": "content"}
                    ]
                }
            }
            `;

            const userQuery = `
            Analyze this person (CORE sections only):
            - Name: ${name}
            - Gender: ${gender}
            - MBTI: ${mbti}
            - Birth: ${birthDate} ${birthTime || '(Time Unknown)'}
            
            [Saju Data]
            - Day Master: ${sajuResult.dayMaster.korean}
            - Elements Count: Wood ${sajuResult.elements.wood}, Fire ${sajuResult.elements.fire}, Earth ${sajuResult.elements.earth}, Metal ${sajuResult.elements.metal}, Water ${sajuResult.elements.water}
            
            Provide the Core Analysis JSON.
            `;

            const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({
                model: "gemini-3-flash-preview",
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

            let content;
            try {
                content = cleanAndParseJSON(responseText);
            } catch (e) {
                console.error("JSON Parse Error:", e);
                console.error("Raw Text:", responseText); // Log raw text for debugging
                return res.status(500).json({ error: "Failed to parse AI response. Please try again." });
            }

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
        if (error.message?.includes('Missing environment variables')) {
            return res.status(500).json({ error: 'Server Configuration Error: Missing API Keys' });
        }
        res.status(500).json({ error: getKoreanErrorMessage(error) });
    }
};
