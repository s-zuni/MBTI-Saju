import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { calculateSaju } from './_utils/saju';
import { cleanAndParseJSON } from './_utils/json';
import { generateContentWithRetry, getKoreanErrorMessage } from './_utils/retry';

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const { part } = req.query;
    const body = req.body || {};
    const { mbti, birthDate, birthTime, gender, name } = body;

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.REACT_APP_GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!supabaseUrl || !supabaseAnonKey || !GEMINI_API_KEY) {
        console.error('Missing environment variables:', { 
            supabaseUrl: !!supabaseUrl, 
            supabaseAnonKey: !!supabaseAnonKey, 
            GEMINI_API_KEY: !!GEMINI_API_KEY 
        });
        return res.status(500).json({ 
            error: `Configuration missing: ${[!supabaseUrl && 'SUPABASE_URL', !supabaseAnonKey && 'SUPABASE_ANON_KEY', !GEMINI_API_KEY && 'GEMINI_API_KEY'].filter(Boolean).join(', ')}`
        });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
    const token = authHeader.split(' ')[1]!;
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

    const sajuResult = calculateSaju(birthDate, birthTime);
    let systemPrompt = '';
    let userQuery = '';

    if (part === 'core') {
        systemPrompt = `당신은 세계 최고의 '소울 융합 분석가'입니다. 사용자의 MBTI 성향과 사주 명리학의 깊은 원리를 결합하여, 단순한 정보를 넘어선 '인생의 지도'를 그려줍니다.
        건조한 정보 나열이 아닌, 사용자의 삶에 깊이 공감하고 흥미진진하게 풀어내는 스토리텔러가 되어주세요.

        [중요: 분석 분량 및 깊이 가이드라인]
        1. **MBTI 심층 분석 (persona 필드)**: 
           - **최소 700자 이상**의 매우 풍성한 분량으로 작성하세요.
           - 단순히 주기능/부기능을 설명하는 것을 넘어, 이 조합이 일상, 스트레스 상황, 인간관계에서 어떻게 발현되는지 구체적인 에피소드처럼 묘사하세요.
           - 사용자가 "내 속마음을 들켰다!"고 느낄 정도로 깊이 있는 심리 묘사를 포함하세요.
        
        2. **사주 심층 분석 (nature 필드)**: 
           - **최소 1,000자 이상**의 압도적인 분량으로 작성하세요.
           - 일주(Day Pillar)의 상징(예: 갑목, 임수 등)을 현대적인 비유로 풀어내고, 월지와의 관계, 오행의 흐름이 사용자의 천성과 기질에 주는 영향을 매우 상세히 분석하세요.
           - 과거-현재-미래의 잠재력을 연결하여 한 편의 서사시처럼 서술하세요.

        3. **융합 포인트 (deepIntegration 필드)**:
           - MBTI와 사주가 만났을 때 생기는 독특한 시너지를 **최소 3개 이상의 주제**로 깊게 분석하세요.
           - 두 결과가 상충할 때의 내적 갈등이나, 일치할 때의 폭발적인 강점을 구체적으로 짚어주세요.

        [중요: 결과 구조] 반드시 아래 JSON 구조를 엄격히 지키세요:
        {
          "reportTitle": "사용자의 심장을 뛰게 할 매력적인 통합 분석 제목",
          "keywords": ["핵심키워드1", "핵심키워드2", "핵심키워드3", "핵심키워드4", "핵심키워드5"],
          "nature": {
            "dayPillarSummary": "일주의 현대적 재해석 별칭",
            "dayMasterAnalysis": "일간 중심의 심층 기질 분석 (압도적 분량)",
            "dayBranchAnalysis": "내면의 욕구와 무의식적 행동 패턴 분석 (상세히)",
            "monthBranchAnalysis": "사회적 환경과 직업적 소명 분석 (상세히)"
          },
          "fiveElements": {
            "elements": [
              {"element": "목(木)", "count": 0, "function": "심리/신체 에너지", "interpretation": "삶에 미치는 상세 영향"},
              {"element": "화(火)", "count": 0, "function": "열정/표현 에너지", "interpretation": "삶에 미치는 상세 영향"},
              {"element": "토(土)", "count": 0, "function": "안정/중재 에너지", "interpretation": "삶에 미치는 상세 영향"},
              {"element": "금(金)", "count": 0, "function": "결단/원칙 에너지", "interpretation": "삶에 미치는 상세 영향"},
              {"element": "수(水)", "count": 0, "function": "지혜/유연 에너지", "interpretation": "삶에 미치는 상세 영향"}
            ]
          },
          "persona": {
            "mbtiNickname": "트렌디한 MBTI 별칭",
            "dominantFunction": "주기능의 일상적 발현과 잠재력 (풍성하게)",
            "auxiliaryFunction": "부기능이 만드는 삶의 균형과 지혜 (풍성하게)"
          },
          "deepIntegration": {
            "integrationPoints": [
              {"subtitle": "융합 주제 1: 기질과 성격의 완벽한 조화", "content": "상세한 융합 분석 내용"},
              {"subtitle": "융합 주제 2: 잠재된 재능의 발견", "content": "상세한 융합 분석 내용"},
              {"subtitle": "융합 주제 3: 인생의 터닝포인트를 위한 제언", "content": "상세한 융합 분석 내용"}
            ]
          }
        }

        [가독성 및 어조 규칙]
        1. ** (볼드체) 절대 사용 금지. (사용금지 유지)
        2. 적절한 줄바꿈과 줄공백을 넣어 호흡이 긴 글도 쾌적하게 읽히도록 하세요.
        3. 20대 여성 타겟의 트렌디하고 친근하며, 깊은 공감을 이끌어내는 말투를 사용하세요.
        4. 적절한 이모지를 문맥에 맞게 배치하여 시각적인 재미를 더하세요.
        5. '...'이나 '!' 등을 적절히 섞어 생동감 있게 표현하세요.`;
        userQuery = `사용자 성함: ${name}, MBTI: ${mbti}, 생년월일시: ${birthDate} ${birthTime || ''}, 성별: ${gender}`;
    } else if (part === 'fortune') {
        systemPrompt = `당신은 '운명 전략가'입니다. 2026년 한 해의 운세와 테마를 분석합니다.
        [중요: 결과 구조] 반드시 아래 JSON 구조를 엄격히 지키세요:
        {
          "yearlyFortune": {
            "theme": "올해의 핵심 테마/키워드",
            "overview": "전반적인 운의 흐름 및 조언 (가독성 있게 작성)",
            "keywords": ["핵심", "운세", "키워드"]
          }
        }
        [가독성 규칙] **(볼드체) 사용금지. 줄바꿈과 이모지 적극 활용.`;
        userQuery = `사용자 성함: ${name}, MBTI: ${mbti}, 생년월일시: ${birthDate} ${birthTime || ''}`;
    } else if (part === 'strategy') {
        systemPrompt = `당신은 '솔루션 가이드'입니다. 분야별 구체적인 조언과 전략을 제시합니다.
        [중요: 결과 구조] 반드시 아래 JSON 구조를 엄격히 지키세요:
        {
          "fieldStrategies": {
            "career": {"subtitle": "커리어 한줄 요약", "analysis": "상세 분석", "advice": "실천 조언"},
            "love": {"subtitle": "연애 한줄 요약", "analysis": "상세 분석", "advice": "실천 조언"},
            "wealth": {"subtitle": "재물 한줄 요약", "analysis": "상세 분석", "advice": "실천 조언"}
          },
          "warnings": {
            "watchOut": [{"title": "주의사항 제목", "description": "상세 내용"}],
            "avoid": [{"title": "금기사항 제목", "description": "상세 내용"}]
          },
          "finalSolution": {
            "closingMessage": "마지막 따뜻한 응원의 메시지"
          }
        }
        [가독성 규칙] **(볼드체) 사용금지. 줄바꿈과 이모지 적극 활용.`;
        userQuery = `사용자 성함: ${name}, MBTI: ${mbti}, 생년월일시: ${birthDate} ${birthTime || ''}`;
    } else {
        return res.status(400).json({ error: 'Invalid part' });
    }

    try {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        // 사용자가 명시한 정확한 모델명 사용 (공백 제거 필수)
        const modelName = (process.env.GEMINI_MODEL || "gemini-3.1-flash-lite-preview").trim();
        const model = genAI.getGenerativeModel({ 
            model: modelName, 
            systemInstruction: systemPrompt + "\nCRITICAL: DO NOT use markdown bolding (**). Instead, use clear line breaks, bullet points, and appropriate emojis to enhance readability. Ensure content is formatted in a way that is easy to scan."
        });
        
        const result = await generateContentWithRetry(model, {
            contents: [{ role: 'user', parts: [{ text: userQuery }] }],
            generationConfig: { 
                responseMimeType: "application/json",
                temperature: 0.7
            }
        });
        
        const responseText = result.response.text(); // generateContentWithRetry에서 이미 처리됨
        if (!responseText) throw new Error("AI returned an empty response");
        
        const content = cleanAndParseJSON(responseText);
        res.status(200).json(part === 'core' ? { ...content, saju: sajuResult } : content);
    } catch (error: any) {
        console.error(`[Analysis Error - ${part}]:`, error);
        const errorMessage = getKoreanErrorMessage(error);
        res.status(500).json({ 
            error: errorMessage,
            details: error.message
        });
    }
}
