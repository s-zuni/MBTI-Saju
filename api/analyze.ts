import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { calculateSaju } from './_utils/saju';
import { cleanAndParseJSON } from './_utils/json';

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
            Your task is to create a premium "MBTIJU 소울 리포트" - a deeply personalized life analysis report that is insightful, mystical yet logical, warm and empowering.
            
            **CRITICAL INSTRUCTIONS**: 
            1. **LANGUAGE**: Korean (Hangul) ONLY. Be eloquent and poetic.
            2. **TONE**: Professional, empathetic, deeply insightful, mystical yet grounded ("~합니다", "~입니다" polite style). Use vivid metaphors and imagery.
            3. **FORMAT**: Output MUST be a valid JSON object following the EXACT structure below.
            4. **NO MARKDOWN BOLDING**: Do NOT use '**' characters. Use plain text only.
            5. **ELEMENT NAMES**: You MUST use "한글(漢字)" format (e.g., 목(木), 화(火), 토(土), 금(金), 수(水)). NEVER use English.
            6. **FIVE ELEMENT FUNCTIONS**: Use the proper terms - 비겁(Self), 식상(Express), 재성(Result), 관성(Rule), 인성(Resource).
            7. **MBTI COGNITIVE FUNCTIONS**: Reference Fe, Fi, Te, Ti, Ne, Ni, Se, Si with Korean descriptions.
            
            **REQUIRED JSON STRUCTURE (9 Core Sections for 소울 리포트)**:
            {
                "keywords": "3-4 Keywords capturing their soul essence (e.g., '대지를 적시는 봄비', '열정적인 불꽃')",
                "reportTitle": "A poetic title summarizing their essence (e.g., '대지를 적시는 봄의 단비', '불꽃처럼 타오르는 열정의 리더')",
                
                "nature": {
                    "title": "본성(Nature): 사주 분석",
                    "dayPillarSummary": "Poetic description of their Day Pillar (일주). E.g., '안개 낀 아침의 숲', '바위 틈에서 솟아나는 맑은 샘물'",
                    "dayMasterAnalysis": "Detailed analysis of their Day Master (일간). Include personality traits, core strengths, and tendencies.",
                    "dayBranchAnalysis": "Analysis of their Day Branch (일지) and what it means for their inner resources.",
                    "monthBranchAnalysis": "Analysis of their Month Branch (월지) and birth season influence."
                },
                
                "fiveElements": {
                    "title": "오행의 구성 분석 (The Five Elements)",
                    "elements": [
                        {"element": "목(木)", "count": 0, "function": "식상(Express)", "interpretation": "창의성, 표현력, 다정함에 대한 해석"},
                        {"element": "화(火)", "count": 0, "function": "재성(Result)", "interpretation": "열정, 결과지향적 성향에 대한 해석"},
                        {"element": "토(土)", "count": 0, "function": "관성(Rule)", "interpretation": "책임감, 사회적 위치에 대한 해석"},
                        {"element": "금(金)", "count": 0, "function": "인성(Resource)", "interpretation": "사고력, 수용성에 대한 해석"},
                        {"element": "수(水)", "count": 0, "function": "비겁(Self)", "interpretation": "주체성, 독립심에 대한 해석"}
                    ],
                    "summary": "Overall analysis of their elemental balance (e.g., 재다신약, 신강 등) and its psychological implications."
                },
                
                "persona": {
                    "title": "페르소나(Persona): MBTI 분석",
                    "mbtiNickname": "MBTI nickname (e.g., '정의로운 사회운동가', '논리적인 전략가')",
                    "dominantFunction": "주기능 analysis (e.g., '외향 감정(Fe): 타인의 감정을 기민하게 읽고 조화를 이룹니다.')",
                    "auxiliaryFunction": "부기능 analysis with explanation",
                    "tertiaryFunction": "3차 기능 analysis and how it connects to their Saju",
                    "inferiorFunction": "열등기능 brief mention if relevant"
                },
                
                "deepIntegration": {
                    "title": "융합 분석: 사주와 MBTI의 상호작용 (Deep Integration)",
                    "integrationPoints": [
                        {"subtitle": "일간과 MBTI 핵심 기능의 결합", "content": "How their Day Master element interacts with their dominant MBTI function"},
                        {"subtitle": "오행 기운과 인지기능의 연결", "content": "Connection between their strong/weak elements and MBTI cognitive functions"},
                        {"subtitle": "시너지와 잠재적 딜레마", "content": "Potential conflicts or synergies between Saju tendencies and MBTI patterns"}
                    ]
                },
                
                "yearlyFortune": {
                    "title": "2026년(丙午年) 운세 흐름",
                    "theme": "A poetic theme for the year (e.g., '뜨거운 태양 아래의 소나기')",
                    "yearlyElementAnalysis": "Analysis of how 2026's 丙午 (Fire Horse) energy affects this person",
                    "overview": "Comprehensive yearly fortune overview",
                    "keywords": ["3-4 key themes for the year"]
                },
                
                "monthlyFortune": {
                    "title": "2026년 월별 상세 흐름 및 가이드",
                    "months": [
                        {"period": "1~2월", "energy": "에너지 흐름 키워드", "guide": "핵심 가이드 및 주의사항"},
                        {"period": "3~4월", "energy": "에너지 흐름 키워드", "guide": "핵심 가이드 및 주의사항"},
                        {"period": "5~6월", "energy": "에너지 흐름 키워드", "guide": "핵심 가이드 및 주의사항"},
                        {"period": "7~8월", "energy": "에너지 흐름 키워드", "guide": "핵심 가이드 및 주의사항"},
                        {"period": "9~10월", "energy": "에너지 흐름 키워드", "guide": "핵심 가이드 및 주의사항"},
                        {"period": "11~12월", "energy": "에너지 흐름 키워드", "guide": "핵심 가이드 및 주의사항"}
                    ]
                },
                
                "warnings": {
                    "title": "2026년 주의사항 및 금기사항",
                    "watchOut": [
                        {"title": "주의점 제목", "description": "상세 설명"},
                        {"title": "주의점 제목", "description": "상세 설명"},
                        {"title": "주의점 제목", "description": "상세 설명"}
                    ],
                    "avoid": [
                        {"title": "금기사항 제목", "description": "상세 설명"},
                        {"title": "금기사항 제목", "description": "상세 설명"},
                        {"title": "금기사항 제목", "description": "상세 설명"}
                    ]
                },
                
                "fieldStrategies": {
                    "title": "분야별 전략: 직업운 & 연애운",
                    "career": {
                        "subtitle": "직업운",
                        "analysis": "Detailed career analysis based on Saju + MBTI",
                        "advice": "Specific actionable advice for 2026"
                    },
                    "love": {
                        "subtitle": "연애운",
                        "analysis": "Detailed love/relationship analysis",
                        "advice": "Specific advice and what to watch out for"
                    }
                },
                
                "finalSolution": {
                    "title": "최종 심리 솔루션",
                    "theme": "A poetic theme summarizing the core advice (e.g., '비워야 채워지는 물의 지혜')",
                    "tips": [
                        {"title": "실천 팁 제목", "description": "구체적인 실천 방법"},
                        {"title": "실천 팁 제목", "description": "구체적인 실천 방법"},
                        {"title": "실천 팁 제목", "description": "구체적인 실천 방법"}
                    ],
                    "closingMessage": "An empowering, personalized closing message that wraps up the entire report warmly."
                }
            }
            `;

            const userQuery = `
            Analyze this person:
            - Name: ${name}
            - Gender: ${gender}
            - MBTI: ${mbti}
            - Birth: ${birthDate} ${birthTime || '(Time Unknown)'}
            
            [Saju Data]
            - Day Master: ${sajuResult.dayMaster.korean} (Element: ${sajuResult.dayMaster.element})
            - Elements Count: Wood ${sajuResult.elements.wood}, Fire ${sajuResult.elements.fire}, Earth ${sajuResult.elements.earth}, Metal ${sajuResult.elements.metal}, Water ${sajuResult.elements.water}
            
            Provide the Premium Analysis JSON.
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
        // Identify specific errors to return friendly messages
        if (error.message?.includes('Missing environment variables')) {
            return res.status(500).json({ error: 'Server Configuration Error: Missing API Keys' });
        }
        res.status(500).json({ error: error.message || 'An internal server error occurred.', details: error.toString() });
    }
};
