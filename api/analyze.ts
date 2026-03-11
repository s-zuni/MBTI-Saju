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
        const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.REACT_APP_GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

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
당신의 임무는 사용자에게 제공될 "MBTIJU 융합 맞춤 리포트"의 핵심(CORE) 파트를 작성하는 것입니다. 특히 20대 여성이 가장 열광하는 '연애 분석'과 '심층 궁합 원리'를 압도적인 분량과 디테일로 작성해야 합니다.

**[핵심 지침 - 반드시 지킬 것]**
1. 언어: 무조건 **한국어(Korean)**로만 작성하세요. (MBTI 이니셜 등 고유명사 제외)
2. 융합의 핵심: 사주와 MBTI를 분리해서 설명하지 마세요. "당신은 나무(木)의 기운을 가진 INFP로서, 어떤 상황에서 가장 큰 창의력을 발휘하는가?"와 같이 사주의 기운(오행)과 MBTI 성향(인지 기능)을 완전히 하나로 녹여낸 문장으로 설명하세요.
3. 분량 및 뎁스: 각 항목은 매우 구체적이어야 하며 전체 응답은 공백 포함 4,000~5,000자 내외의 압도적인 분량을 확보하세요. 겉핥기식 설명이 아닌, 사용자의 영혼을 꿰뚫는 듯한 심층 분석이 필요합니다.
4. 연애 분석 특화: 20대 여성이 가장 궁금해하는 연애 성향, 미래의 인연, 연애 시 주의점을 사주 신살(도화살, 홍염살 등)과 MBTI의 결합 관점에서 최소 1,500자 이상 할애하여 작성하세요.
5. 매력도 및 가시성: 모든 분석 내용은 긴 서술형 대신 **개괄식(블렛 포인트)** 구조를 사용하여 가독성을 극대화하세요. 답변 본문에서 마크다운 **볼드체**('**')를 절대 사용하지 마세요. 각 주요 포인트나 문단 사이에는 반드시 두 번의 줄바꿈(`\n\n`)을 사용하여 시각적으로 여유 있는 간격을 확보하세요. 도화살, 홍염살 등 특정 신살은 제공된 사주 데이터에서 명확하게 확인되는 경우에만 언급하세요. 흥미를 위해 억지로 포함해서는 안 됩니다. 적절한 이모지(✨, 🔮, 💖)를 섞어 몰입감을 높이세요.
6. 키워드 생성: `keywords` 필드에는 MBTI와 사주가 어우러진 고유하고 상징적인 짧은 수식어 하나만을 생성하세요 (예: '침착한_지혜의_탐구자'). **절대** ISTJ, ENFP와 같은 MBTI 약어를 직접 포함하지 마세요.

응답은 반드시 아래의 JSON 구조와 키 이름을 정확히 일치시켜야 합니다 (JSON 외 추가 텍스트 불가):

{
    "keywords": "융합 특성을 꿰뚫는 고유한 수식어 하나 (예: '침착한_지혜의_탐구자')",
    "reportTitle": "이 사람의 융합된 영혼과 운명을 상징하는 화려하고 감각적인 제목",
    "nature": {
        "title": "타고난 본성: 사주와 MBTI가 만난 자아의 원형",
        "dayPillarSummary": "일주와 MBTI의 결합 분석. 특히 도화살, 홍염살 등 매력 신살을 활용해 **개괄식**으로 기술 (400자 이상)",
        "dayMasterAnalysis": "일간의 오행 에너지가 MBTI와 결합하여 나타나는 본질적 기질을 **개괄식**으로 기술 (400자 이상)",
        "dayBranchAnalysis": "내면 사생활과 욕구가 MBTI와 어떻게 작용하는지 **개괄식**으로 기술 (300+ 자)",
        "monthBranchAnalysis": "사회적 성공과 직업 환경에서의 융합 에너지를 **개괄식**으로 기술 (300+ 자)"
    },
    "fiveElements": {
        "title": "오행 에너지 & 심리 밸런스 분석",
        "elements": [
            {"element": "목(木)", "count": 0, "function": "심리적 에너지", "interpretation": "**개괄식**으로 기술 (150자 내외)"},
            {"element": "화(火)", "count": 0, "function": "심리적 에너지", "interpretation": "**개괄식**으로 기술 (150자 내외)"},
            {"element": "토(土)", "count": 0, "function": "심리적 에너지", "interpretation": "**개괄식**으로 기술 (150자 내외)"},
            {"element": "금(金)", "count": 0, "function": "심리적 에너지", "interpretation": "**개괄식**으로 기술 (150자 내외)"},
            {"element": "수(水)", "count": 0, "function": "심리적 에너지", "interpretation": "**개괄식**으로 기술 (150자 내외)"}
        ],
        "summary": "오행 분포가 인생 전반과 성격의 균형에 미치는 심층 종합 평가를 **개괄식**으로 기술 (400자 이상)"
    },
    "romanceDepth": {
        "title": "💖 심층 연애 & 소울메이트 분석 (20대 여성 맞춤)",
        "style": "사주와 MBTI로 본 나의 연애 스타일과 매력 발산 방식 (500자 이상)",
        "idealType": "내가 무의식적으로 끌리는 상대와 실제 운명적 소울메이트의 특징 (사주 궁합 원리 및 MBTI 상성 융합 분석, 500자 이상)",
        "caution": "연애 시 반드시 주의해야 할 점과 운명적으로 피해야 할 이성 타입 (500자 이상)"
    },
    "deepIntegration": {
        "title": "💡 융합 맞춤 리포트: 나의 인생 시너지 매트릭스",
        "integrationPoints": [
            {"subtitle": "오행과 인지 기능의 폭발적 시너지 조건", "content": "특정 상황에서 나의 잠재력이 최고조로 발달하는 융합적 조건 분석 (400자 이상)"},
            {"subtitle": "가장 강력한 무기와 잠재적 딜레마", "content": "인생을 살며 마주할 가장 큰 강점과 그것이 독이 될 때의 해결책 (300자 이상)"},
            {"subtitle": "운명을 개척하는 마스터 키 가이드", "content": "향후 3~5년 내에 집중해야 할 변화와 성장을 위한 구체적 행동 지침 (300자 이상)"}
        ]
    }
}
`;

            const userQuery = `
            다음 사용자 정보를 심층 분석해주세요:
            - 성명: \${name}
            - 성별: \${gender}
            - MBTI: \${mbti}
            - 생년월일시: \${birthDate} \${birthTime || '(시간 모름)'}

            [사주 데이터]
            - 간지(사주 원국): \${sajuResult.ganZhi.year} 년, \${sajuResult.ganZhi.month} 월, \${sajuResult.ganZhi.day} 일, \${sajuResult.ganZhi.hour} 시
            - 일간(Day Master): \${sajuResult.dayMaster.korean}
            - 오행 구성: 목(\${sajuResult.elements.wood}), 화(\${sajuResult.elements.fire}), 토(\${sajuResult.elements.earth}), 금(\${sajuResult.elements.metal}), 수(\${sajuResult.elements.water})
            
            분석 리포트를 JSON 형식으로 답변해주세요. 'dayPillarSummary'에는 도화살, 홍염살, 역마살 등 흥미로운 신살 정보를 포함하여 사용자가 자신의 매력을 느낄 수 있도록 작성해주세요.
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
