import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { cleanAndParseJSON } from './_utils/json';
import { generateContentWithRetry, getKoreanErrorMessage } from './_utils/retry';

// Fallback types if @vercel/node is not available
type VercelRequest = any;
type VercelResponse = any;

// It's crucial to use environment variables for Supabase credentials
// Superseded by internal handler initialization for environment variable robustness
let supabase: any;
let GEMINI_API_KEY: string;

export default async (req: VercelRequest, res: VercelResponse) => {
    // CORS configuration
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.REACT_APP_GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';

    if (!supabaseUrl || !supabaseAnonKey || !GEMINI_API_KEY) {
        return res.status(500).json({ error: 'Server Configuration Error: Missing API Keys' });
    }
    supabase = createClient(supabaseUrl, supabaseAnonKey);

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
                당신은 20대 여성이 선호하는 친근하고 따스하며 통찰력 있는 '행운의 상담가'입니다. 
                사용자의 띠(\${zodiac})를 바탕으로 오늘의 에너지 흐름을 분석하여 다정하게 전해주세요.
                
                **퍼소나 & 톤앤매너**:
                - 단순한 예측이 아닌, 삶의 에너지를 읽어주는 통찰을 전하세요.
                - **톤**: 공감하는, 격려하는, 감성적이지만 현실에 기반한 조언. (예: "~하는 날이에요!", "조심하는 게 좋겠어요.")
                - **스타일**: 인위적인 느낌을 배제하고, 친구에게 이야기하듯 자연스럽게 작성하세요.
                
                **콘텐츠 요구사항**:
                1. **서사적 흐름**: 단순히 사실만 나열하지 말고, 하루의 흐름(아침~밤)을 짧은 이야기처럼 구성하세요.
                2. **구체적 조언**: 실질적으로 행동할 수 있는 한 가지 팁을 주세요 (예: "충동적인 지출은 피하세요", "오랜 친구에게 안부를 물어보세요").
                3. **행운의 요소**: 색상(Color), 숫자(Number), 방향(Direction)을 포함하세요.
                4. **언어**: 한국어 전용 (단, MBTI 기재 시 영어 표기 가능).
                5. **마크다운 금지**: **절대로** **, ##, - 등 마크다운 형식을 사용하지 마세요.** 오직 텍스트 평문으로만 답변하세요.
                6. **포맷**: 반드시 유효한 JSON 형식으로 응답하세요.

                **필수 JSON 구조 (엄격 준수)**:
                {
                    "today": {
                        "fortune": "오늘의 상세 운세 (약 200자 내외). 마음가짐과 핵심 사건에 집중하세요. (마크다운 금지)",
                        "lucky": {
                            "color": "색상명 (예: 딥 블루)",
                            "number": "숫자 (예: 7)",
                            "direction": "방향 (예: 동쪽)"
                        },
                        "mission": "실천하기 쉬운 구체적인 일일 미션 (예: '5분 동안 하늘 보기', '빨간색 음식 먹기'). 작은 리추얼을 제안하세요. (마크다운 금지)"
                    },
                    "tomorrow": {
                        "fortune": "내일의 상세 운세 (약 200자 내외). 준비와 전망에 집중하세요. (마크다운 금지)",
                        "lucky": {
                            "color": "색상명",
                            "number": "숫자",
                            "direction": "방향"
                        },
                        "mission": "내일을 위한 구체적인 미션 (마크다운 금지)"
                    }
                }
            `;

            const userQuery = `
                띠(\${zodiac})를 기반으로 오늘(\${today})과 내일의 운세를 분석해주세요. 20대 여성이 공감할 수 있는 따뜻한 톤으로 답변해주세요.
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
            res.status(500).json({ error: getKoreanErrorMessage(error) });
        }
    } else {
        res.status(405).json({ error: 'Method Not Allowed' });
    }
};
