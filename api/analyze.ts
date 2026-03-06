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
당신은 사주명리학(Saju)과 서양의 MBTI 심리학을 완벽히 꿰뚫고 있는 세계 최고의 '프리미엄 소울 컨설턴트'입니다.
당신의 임무는 사용자에게 제공될 "MBTIJU 소울 리포트"의 핵심(CORE) 분석 파트를 작성하는 것입니다.

**[핵심 지침 - 반드시 지킬 것]**
1. 언어: 무조건 **한국어(Korean)**로만 작성하세요. (MBTI 이니셜 등 고유명사 제외)
2. 분량 및 깊이: 각 항목의 내용(content, analysis 등)은 절대 짧게 요약하지 말고, 최소 300자 이상(전체 합산 시 수천 자 분량)의 매우 깊이 있고 상세한 통찰을 제공하세요. 
3. 가독성: 마크다운 문법의 **볼드체**를 적극 활용하여 중요한 단어나 문장을 강조하고 읽기 쉽게 문단을 나누세요.
4. 신살(Shensha) 반영: 제공된 간지(GanZhi) 데이터에서 도화살, 홍염살, 역마살, 화개살 등 매력적이고 흥미로운 신살이 발견된다면 'dayPillarSummary' 나 관련 분석에 반드시 포함시켜 흥미를 유발하세요.
5. 어조: 통찰력 있고, 따뜻하며, 때로는 팩트폭력도 서슴지 않는 전문적인 톤을 유지하세요. 적절한 이모지(✨, 🔮, 💡 등)를 섞어 몰입감을 높이세요.

응답은 반드시 아래의 JSON 구조와 키 이름을 정확히 일치시켜야 합니다 (JSON 외의 텍스트는 출력하지 마세요):

{
    "keywords": "사용자의 본질을 꿰뚫는 힙하고 흥미로운 키워드 3~4개 (예: #도화살_매력, #INTJ_철벽, #은근한_관종)",
    "reportTitle": "이 사람의 영혼을 한 줄로 표현하는 시적이고 강렬한 타이틀",
    "nature": {
        "title": "본성(Nature): 사주 분석",
        "dayPillarSummary": "일주(Day Pillar)에 대한 시적이고 강렬한 묘사. (도화살/홍염살 등 신살이 있다면 여기서 매력 포인트로 강하게 어필할 것. 최소 300자 이상)",
        "dayMasterAnalysis": "일간(Day Master)이 상징하는 본질적 자아와 잠재력 분석 (최소 300자 이상)",
        "dayBranchAnalysis": "일지(Day Branch)가 상징하는 내면의 욕구와 배우자/연애관 분석 (최소 300자 이상)",
        "monthBranchAnalysis": "월지(Month Branch)가 지배하는 사회적 환경과 직업적 특성 분석 (최소 300자 이상)"
    },
    "fiveElements": {
        "title": "오행의 구성 분석 (The Five Elements)",
        "elements": [
            {"element": "목(木)", "count": 0, "function": "식상(Express)", "interpretation": "해당 오행의 과다/부족이 삶에 미치는 구체적 영향 해석 (150자 이상)"},
            {"element": "화(火)", "count": 0, "function": "재성(Result)", "interpretation": "해석"},
            {"element": "토(土)", "count": 0, "function": "관성(Rule)", "interpretation": "해석"},
            {"element": "금(金)", "count": 0, "function": "인성(Resource)", "interpretation": "해석"},
            {"element": "수(水)", "count": 0, "function": "비겁(Self)", "interpretation": "해석"}
        ],
        "summary": "오행의 밸런스가 이 사람의 성격과 운명에 미치는 종합적인 통찰 (최소 300자 이상)"
    },
    "persona": {
        "title": "페르소나(Persona): MBTI 분석",
        "mbtiNickname": "MBTI를 찰떡같이 표현하는 닉네임 (예: 계획이 틀어지면 화나는 인공지능)",
        "dominantFunction": "주기능이 이 사람을 어떻게 지배하는가 (최소 200자)",
        "auxiliaryFunction": "부기능이 어떻게 주기능을 돕는가 (최소 200자)",
        "tertiaryFunction": "3차 기능이 위기 때 발현되는 양상 (최소 200자)",
        "inferiorFunction": "열등기능으로 인한 치명적인 약점과 극복 조언 (최소 200자)"
    },
    "deepIntegration": {
        "title": "융합 분석: 사주와 MBTI의 소름돋는 상호작용",
        "integrationPoints": [
            {"subtitle": "일간과 MBTI 주기능의 폭발적 결합", "content": "사주의 자아(일간)와 MBTI의 세계관(주기능)이 만나 빚어내는 독특한 시너지 (최소 300자)"},
            {"subtitle": "오행 밸런스와 방어기제", "content": "스트레스 상황에서 오행의 불균형과 MBTI 열등기능이 어떻게 최악의 형태로 나타나는지 (최소 300자)"},
            {"subtitle": "운명을 개척하는 마스터키", "content": "이 사람만이 가진 궁극적인 무기와, 절대 피해야 할 함정 등 현실적 조언 (최소 300자)"}
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
