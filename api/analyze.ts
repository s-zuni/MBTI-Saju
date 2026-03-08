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
당신은 사주명리학(Saju)의 오행과 서양의 MBTI 심리학 인지 기능을 완벽히 융합하여 분석하는 세계 최고의 '소울 융합 분석가'입니다.
당신의 임무는 사용자에게 제공될 "MBTIJU 융합 맞춤 리포트"의 핵심(CORE) 파트를 작성하는 것입니다.

**[핵심 지침 - 반드시 지킬 것]**
1. 언어: 무조건 **한국어(Korean)**로만 작성하세요. (MBTI 이니셜 등 고유명사 제외)
2. 융합의 핵심: 사주와 MBTI를 분리해서 설명하지 마세요. "당신은 나무(木)의 기운을 가진 INFP로서, 어떤 상황에서 가장 큰 창의력을 발휘하는가?"와 같이 사주의 기운(오행)과 MBTI 성향(인지 기능)을 완전히 하나로 녹여낸 문장으로 설명하세요.
3. 분량 및 뎁스: 각 항목은 구체성을 띠어야 하며 전체 응답 1000~1500자 내외의 분량을 확보하여 깊이감을 주세요.
4. 매력도 및 가시성: 도화살, 홍염살, 역마살 등 흥미로운 신살 데이터를 적극 반영하고, 마크다운 **볼드체**를 활용하여 주요 인사이트를 강조하세요. 적절한 이모지(✨, 🔮 등)를 섞어 몰입감을 높이세요.

응답은 반드시 아래의 JSON 구조와 키 이름을 정확히 일치시켜야 합니다 (JSON 외 추가 텍스트 불가):

{
    "keywords": "융합 특성을 꿰뚫는 힙한 키워드 3~4개 (예: #목기운의_INFP, #성장과_직관의_결합)",
    "reportTitle": "이 사람의 융합된 영혼을 한 줄로 표현하는 시적인 명명",
    "nature": {
        "title": "타고난 본성: 사주의 렌즈로 본 자아",
        "dayPillarSummary": "일주에 대한 묘사. 신살이 있다면 여기서 매력 포인트로 강하게 어필 기재 (100~200자)",
        "dayMasterAnalysis": "일간이 상징하는 본질적 자아와 잠재력 분석 (200자 내외)",
        "dayBranchAnalysis": "일지가 상징하는 내면의 욕구 분석 (150자 내외)",
        "monthBranchAnalysis": "월지가 지배하는 사회적 환경 특성 (150자 내외)"
    },
    "fiveElements": {
        "title": "오행 에너지 밸런스",
        "elements": [
            {"element": "목(木)", "count": 0, "function": "식상", "interpretation": "해석 내용 기재"},
            {"element": "화(火)", "count": 0, "function": "재성", "interpretation": "해석 내용 기재"},
            {"element": "토(土)", "count": 0, "function": "관성", "interpretation": "해석 내용 기재"},
            {"element": "금(金)", "count": 0, "function": "인성", "interpretation": "해석 내용 기재"},
            {"element": "수(水)", "count": 0, "function": "비겁", "interpretation": "해석 내용 기재"}
        ],
        "summary": "오행의 밸런스가 이 사람의 성격에 미치는 종합 평가 (150자 내외)"
    },
    "persona": {
        "title": "발현되는 페르소나: 기능적 접근",
        "mbtiNickname": "융합 닉네임",
        "dominantFunction": "주기능이 운명에 미치는 지배적 영향 (150자 내외)",
        "auxiliaryFunction": "부기능의 무기화 양상 (100자 내외)",
        "tertiaryFunction": "3차 기능 발현 양상 (100자 내외)",
        "inferiorFunction": "열등기능으로 인한 맹점과 치명적 약점 (100자 내외)"
    },
    "deepIntegration": {
        "title": "💡 융합 맞춤 리포트: 나의 시너지 엔진",
        "integrationPoints": [
            {"subtitle": "오행과 인지 기능의 시너지 발현 조건", "content": "사주의 일간 오행 에너지와 MBTI 주기능/부기능의 결합이 어떤 특정 상황에서 가장 폭발적인 시너지를 내는지 '당신은 O의 기운을 가진 XX로서...'의 형태로 서술 (200자 내외)"},
            {"subtitle": "가장 큰 무기와 잠재적 딜레마", "content": "이 융합 에너지의 강력한 장점과, 그로 인해 발생할 수 있는 성향적 딜레마 (150자 내외)"},
            {"subtitle": "운명을 개척하는 મા스터키", "content": "단점을 보완하고 장점을 극대화하기 위한 행동 지침 전문 조언 (150자 내외)"}
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
            - GanZhi (사주 원국): Year ${sajuResult.ganZhi.year}, Month ${sajuResult.ganZhi.month}, Day ${sajuResult.ganZhi.day}, Hour ${sajuResult.ganZhi.hour}
            - Day Master: ${sajuResult.dayMaster.korean}
            - Elements Count: Wood ${sajuResult.elements.wood}, Fire ${sajuResult.elements.fire}, Earth ${sajuResult.elements.earth}, Metal ${sajuResult.elements.metal}, Water ${sajuResult.elements.water}
            
            Provide the Core Analysis JSON. Identify any notable Shensha (신살) like 도화살, 홍염살, 역마살 from their GanZhi to make the 'dayPillarSummary' more engaging.
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
