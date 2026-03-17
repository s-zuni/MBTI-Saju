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
    const sajuContext = `사주 원국: ${sajuResult.ganZhi.year} ${sajuResult.ganZhi.month} ${sajuResult.ganZhi.day} ${sajuResult.ganZhi.hour} (일간: ${sajuResult.dayMaster.korean} / 성질: ${sajuResult.dayMaster.description})`;

    let systemPrompt = '';
    let userQuery = '';

    if (part === 'core') {
        systemPrompt = `당신은 세계 최고의 '소울 융합 분석가'입니다. 사용자의 MBTI 성향과 사주 명리학의 깊은 원리를 결합하여, 단순한 정보를 넘어선 '인생의 지도'를 그려줍니다.
        건조한 정보 나열이 아닌, 사용자의 삶에 깊이 공감하고 흥미진진하게 풀어내는 스토리텔러가 되어주세요.

        [중요: 분석 분량 및 깊이 가이드라인]
        1. **MBTI 심층 분석 (persona 필드)**: 
           - **매우 상세하고 깊이 있는** 분량으로 작성하세요. 
           - **가독성을 위해 문단 사이마다 줄바꿈(\n\n)을 넣고, 각 포인트는 '•' 머리표를 사용하세요.**
           - 이 MBTI 조합이 일상, 스트레스 상황, 인간관계에서 어떻게 발현되는지 구체적인 심리 묘사를 포함하세요.
        
        2. **사주 심층 분석 (nature 필드)**: 
           - **풍성하고 전문적인** 분량으로 작성하세요. 
           - **가독성을 위해 문단 사이마다 줄바꿈(\n\n)을 넣고, 주요 특징은 '•' 머리표를 사용하세요.**
           - 일주(Day Pillar)의 상징을 현대적인 비유로 풀어내고, 월지와의 관계, 오행의 흐름이 사용자의 천성과 기질에 주는 영향을 매우 상세히 분석하세요.

        3. **융합 포인트 (deepIntegration 필드)**:
           - MBTI와 사주가 만났을 때 생기는 독특한 시너지를 **최소 3개 이상의 주제**로 깊게 분석하세요.
           - 각 주제는 명확한 subtitle과 상세한 content(\n을 활용한 가독성 확보)로 구성하세요.
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
        1. ** (볼드체) 절대 사용 금지.
        2. **문장과 문장 사이, 항목 마다 줄바꿈(\n)과 줄공백을 넣어 여유롭게 읽히도록 하세요.**
        3. 20대 여성 타겟의 트렌디하고 친근하며, 깊은 공감을 이끌어내는 말투를 사용하세요.
        4. 적절한 이모지를 문맥에 맞게 배치하여 시각적인 재미를 더하세요.
        5. '...'이나 '!' 등을 적절히 섞어 생동감 있게 표현하세요.`;
        userQuery = `사용자 성함: ${name}, MBTI: ${mbti}, ${sajuContext}, 생년월일시: ${birthDate} ${birthTime || ''}, 성별: ${gender}`;
    } else if (part === 'fortune') {
        systemPrompt = `당신은 '운명 전략가'입니다. 사용자의 사주와 2026년 병오년의 기운을 대조하여 한 해의 운세와 테마를 분석합니다.
        [중요: 결과 구조] 반드시 아래 JSON 구조를 엄격히 지키세요:
        {
          "yearlyFortune": {
            "theme": "올해를 관통하는 핵심 테마 한 문장",
            "overview": "전반적인 운의 흐름, 기회, 주의할 점을 포함한 상세한 조언 (줄바꿈 \n 활용 필수)",
            "keywords": ["핵심키워드1", "핵심키워드2", "핵심키워드3"]
          }
        }
        [가독성 규칙] **(볼드체) 절대 사용 금지. 문단 마다 \n 줄바꿈과 이모지 적극 활용. 친근하고 트렌디한 어조 유지.`;
        userQuery = `사용자 성함: ${name}, MBTI: ${mbti}, ${sajuContext}`;
    } else if (part === 'strategy') {
        systemPrompt = `당신은 '솔루션 가이드'입니다. 사용자의 사주와 MBTI를 기반으로 2026년 분야별 구체적인 조언과 성공 전략을 제시합니다.
        [중요: 결과 구조] 반드시 아래 JSON 구조를 엄격히 지키세요:
        {
          "fieldStrategies": {
            "career": {"subtitle": "커리어 전략 한줄 요약", "analysis": "상세한 직업/사업운 분석 (줄바꿈 \n 활용)", "advice": "실천 조언"},
            "love": {"subtitle": "연애/대인관계 전략 한줄 요약", "analysis": "상세한 연애/관계운 분석 (줄바꿈 \n 활용)", "advice": "실천 조언"},
            "wealth": {"subtitle": "재물/투자 전략 한줄 요약", "analysis": "상세한 금전/투자운 분석 (줄바꿈 \n 활용)", "advice": "실천 조언"}
          },
          ...
        }
        [가독성 규칙] **(볼드체) 절대 사용 금지. 문단 마다 \n 줄바꿈과 이모지 적극 활용. 트렌디한 어조 유지.`;
        userQuery = `사용자 성함: ${name}, MBTI: ${mbti}, ${sajuContext}`;
    } else {
        return res.status(400).json({ error: 'Invalid part' });
    }

    try {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const modelName = (process.env.GEMINI_MODEL || "gemini-3.1-flash-lite-preview").trim();
        const model = genAI.getGenerativeModel({ 
            model: modelName, 
            systemInstruction: systemPrompt + "\nCRITICAL: DO NOT use markdown bolding (**). Use clear line breaks (\\n), bullet points (•), and emojis. Ensure text is spaced out nicely for readability."
        });
        
        const result = await generateContentWithRetry(model, {
            contents: [{ role: 'user', parts: [{ text: userQuery }] }],
            generationConfig: { 
                responseMimeType: "application/json",
                temperature: 0.7,
                maxOutputTokens: part === 'core' ? 4096 : 2048
            }
        });
        
        const responseText = result.response.text();
        if (!responseText) throw new Error("AI returned an empty response");
        
        console.log(`[AI Raw Response - ${part}]:`, responseText.substring(0, 500) + '...');
        
        const content = cleanAndParseJSON(responseText);
        res.status(200).json(part === 'core' ? { ...content, saju: sajuResult } : content);
    } catch (error: any) {
        console.error(`[Analysis Error - ${part}]:`, error);
        console.error(`[Error Stack]:`, error.stack);
        const errorMessage = getKoreanErrorMessage(error);
        res.status(500).json({ 
            error: `${part} 분석 중 오류 발생: ${errorMessage}`,
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}
