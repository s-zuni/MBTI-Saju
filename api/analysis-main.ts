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
           - **가독성을 위해 문단 사이마다 줄바꿈(\\n\\n)을 넣고, 각 포인트는 '•' 머리표를 사용하세요.**
           - 이 MBTI 조합이 일상, 스트레스 상황, 인간관계에서 어떻게 발현되는지 구체적인 심리 묘사를 포함하세요.
        
        2. **사주 심층 분석 (nature 필드)**: 
           - **풍성하고 전문적인** 분량으로 작성하세요. 
           - **가독성을 위해 문단 사이마다 줄바꿈(\\n\\n)을 넣고, 주요 특징은 '•' 머리표를 사용하세요.**
           - 일주(Day Pillar)의 상징을 현대적인 비유로 풀어내고, 월지와의 관계, 오행의 흐름이 사용자의 천성과 기질에 주는 영향을 매우 상세히 분석하세요.

        3. **융합 포인트 (deepIntegration 필드)**:
           - MBTI와 사주가 만났을 때 생기는 독특한 시너지를 **최소 3개 이상의 주제**로 깊게 분석하세요.
        [중요: 결과 구조] 반드시 아래 JSON 구조를 엄격히 지키세요:
        {
          "reportTitle": "이 분석을 관통하는 감각적인 제목",
          "keywords": "핵심, 키워드, 3개",
          "fusionNickname": "사용자의 일간(십간)과 MBTI를 결합한 창의적인 별명. 예: ENTP+신금=독설을 품은 다이아몬드, INFP+임수=깊은 바다의 몽상가. 십간 속성과 MBTI 핵심 특성을 결합하여 15자 이내의 매력적인 별명",
          "nature": {
            "dayPillarSummary": "일주에 대한 한 줄 요약",
            "dayMasterAnalysis": "일간 기질 분석 (상세히)",
            "dayBranchAnalysis": "일지 성향 분석 (상세히)",
            "monthBranchAnalysis": "월지 환경 분석 (상세히)"
          },
          "fiveElements": {
            "elements": [
              {"element": "목(木)", "count": 0, "interpretation": "목 기운의 의미와 영향"},
              {"element": "화(火)", "count": 0, "interpretation": "화 기운의 의미와 영향"},
              {"element": "토(土)", "count": 0, "interpretation": "토 기운의 의미와 영향"},
              {"element": "금(金)", "count": 0, "interpretation": "금 기운의 의미와 영향"},
              {"element": "수(水)", "count": 0, "interpretation": "수 기운의 의미와 영향"}
            ]
          },
          "persona": {
            "mbtiNickname": "트렌디한 MBTI 별칭",
            "dominantFunction": "주기능의 일상적 발현과 잠재력 (풍성하게)",
            "auxiliaryFunction": "부기능이 만드는 삶의 균형과 지혜 (풍성하게)"
          },
          "deepIntegration": {
            "integrationPoints": [
              {"subtitle": "기질과 성격의 완벽한 조화: 타고난 에너지 활용법", "content": "상세한 융합 분석 내용 (300자 이상)"},
              {"subtitle": "잠재된 재능의 발견: 당신만의 독보적인 강점", "content": "상세한 융합 분석 내용 (300자 이상)"},
              {"subtitle": "인생의 터닝포인트를 위한 제언: 성장을 위한 핵심 열쇠", "content": "상세한 융합 분석 내용 (300자 이상)"}
            ]
          }
        }

        [중요 지침]
        1. **심층 융합 진단(deepIntegration)의 소제목에서 '융합 주제 1', '융합주제 1'과 같은 단순 번호 매김은 절대 사용하지 마세요.** 대신 분석 내용을 관통하는 매력적이고 핵심적인 소제목을 직접 지으세요.
        
        [가독성 및 어조 규칙]
        1. ** (볼드체) 절대 사용 금지.
        2. **문장과 문장 사이, 항목 마다 줄바꿈(\n)과 줄공백을 넣어 여유롭게 읽히도록 하세요.**
        3. 20대 여성 타겟의 트렌디하고 친근하며, 깊은 공감을 이끌어내는 말투를 사용하세요.
        4. 적절한 이모지를 문맥에 맞게 배치하여 시각적인 재미를 더하세요.
        5. '...'이나 '!' 등을 적절히 섞어 생동감 있게 표현하세요.
        
        [JSON 안전성 규칙 - 필수]
        - 문자열 값 내부에서 실제 줄바꿈(Enter)을 절대 사용하지 마세요.
        - 대신 반드시 '\\n' (백슬래시 n) 기호를 사용하여 줄바꿈을 표현하세요.
        - JSON 객체 외부에 불필요한 서술이나 설명을 절대 추가하지 마세요.`;
        userQuery = `사용자 성함: ${name}, MBTI: ${mbti}, ${sajuContext}, 생년월일시: ${birthDate} ${birthTime || ''}, 성별: ${gender}`;
    } else if (part === 'fortune') {
        systemPrompt = `당신은 '운명 전략가'입니다. 사용자의 사주와 2026년 병오년의 기운을 대조하여 한 해의 운세와 테마를 분석합니다.
        [중요: 결과 구조] 반드시 아래 JSON 구조를 엄격히 지키세요:
        {
          "yearlyFortune": {
            "theme": "올해를 관통하는 핵심 테마 한 문장",
            "overview": "전반적인 운의 흐름, 기회, 주의할 점을 포함한 상세한 조언 (줄바꿈 \n 활용 필수)",
            "keywords": ["핵심키워드1", "핵심키워드2", "핵심키워드3"]
          },
          "monthlyFortune": {
            "months": [
              { "period": "1-2월", "energy": "기운의 흐름 요약", "guide": "사용자의 사주와 MBTI 시너지가 이 시기에 어떻게 발현될지, 구체적인 예측과 상세 가이드 (400자 이상)" },
              { "period": "3-4월", "energy": "기운의 흐름 요약", "guide": "사용자의 사주와 MBTI 시너지가 이 시기에 어떻게 발현될지, 구체적인 예측과 상세 가이드 (400자 이상)" },
              { "period": "5-6월", "energy": "기운의 흐름 요약", "guide": "사용자의 사주와 MBTI 시너지가 이 시기에 어떻게 발현될지, 구체적인 예측과 상세 가이드 (400자 이상)" },
              { "period": "7-8월", "energy": "기운의 흐름 요약", "guide": "사용자의 사주와 MBTI 시너지가 이 시기에 어떻게 발현될지, 구체적인 예측과 상세 가이드 (400자 이상)" },
              { "period": "9-10월", "energy": "기운의 흐름 요약", "guide": "사용자의 사주와 MBTI 시너지가 이 시기에 어떻게 발현될지, 구체적인 예측과 상세 가이드 (400자 이상)" },
              { "period": "11-12월", "energy": "기운의 흐름 요약", "guide": "사용자의 사주와 MBTI 시너지가 이 시기에 어떻게 발현될지, 구체적인 예측과 상세 가이드 (400자 이상)" }
            ]
          }
        }
        [중요 지침] 뻔한 덕담은 지양하고, 사용자의 데이터(일간, 오행, MBTI)를 근거로 한 매우 구체적이고 실질적인 변화를 예측하세요.
        [JSON 안전성 규칙] 문자열 값 내부에서 실제 줄바꿈(Enter) 절대 금지. 줄바꿈은 반드시 '\\n' 사용.
        [가독성 규칙] **(볼드체) 절대 사용 금지. 문단 마다 \n 줄바꿈과 이모지 적극 활용. 친근하고 트렌디한 어조 유지.`;
        userQuery = `사용자 성함: ${name}, MBTI: ${mbti}, ${sajuContext}`;
    } else if (part === 'strategy') {
        systemPrompt = `당신은 '솔루션 가이드'입니다. 사용자의 사주와 MBTI를 기반으로 2026년 분야별 구체적인 조언과 성공 전략을 제시합니다.
        
        [가독성 규칙]
        - **(볼드체) 절대 사용 금지.**
        - 문단 마다 \\n 줄바꿈과 이모지를 적극 활용하여 가독성을 높이세요.
        - 20대 여성에게 어필할 수 있는 트렌디하고 다정한 어조를 유지하세요.

        [중요: 결과 구조] 반드시 아래 JSON 구조를 엄격히 지키며 오직 JSON으로만 대답하세요:
        {
          "fieldStrategies": {
            "career": {"subtitle": "커리어 전략 한줄 요약", "analysis": "사용자의 사주 특성과 MBTI 주기능이 커리어에서 어떻게 시너지를 내거나 충돌할지, 2026년의 기운과 결합한 매우 상세한 분석 (500자 이상)", "advice": "구체적인 실천 전략"},
            "love": {"subtitle": "연애/대인관계 전략 한줄 요약", "analysis": "사용자의 감정적 특성(MBTI)과 관계적 에너지(사주)가 2026년에 만나는 인연과 관계 맺기에 주는 영향 분석 (500자 이상)", "advice": "구체적인 실천 전략"},
            "wealth": {"subtitle": "재물/투자 전략 한줄 요약", "analysis": "타고난 재복의 흐름과 사용자의 의사결정 방식(MBTI)이 2026년 경제적 상황에서 보일 패턴 분석 (500자 이상)", "advice": "구체적인 실천 전략"}
          },
          "warnings": {
            "watchOut": [
              { "title": "주의할 점 1", "description": "상세 내용" },
              { "title": "주의할 점 2", "description": "상세 내용" }
            ],
            "avoid": [
              { "title": "피해야 할 것 1", "description": "상세 내용" },
              { "title": "피해야 할 것 2", "description": "상세 내용" }
            ]
          },
          "solution": "전반적인 인생 솔루션 및 제언 (상세히)"
        }`;
        systemPrompt += "\n[JSON 안전성 규칙] 문자열 안에서 실제 줄바꿈을 하지 말고 반드시 \\\\n 을 사용하세요. 오직 순수한 JSON만 반환하세요.";
        userQuery = `사용자 성함: ${name}, MBTI: ${mbti}, ${sajuContext}`;
    } else {
        return res.status(400).json({ error: 'Invalid part' });
    }

    try {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const modelName = (process.env.GEMINI_MODEL || "gemini-3-flash-preview").trim();
        let currentModelName = modelName;
        let model = genAI.getGenerativeModel({ 
            model: currentModelName, 
            systemInstruction: systemPrompt + "\nCRITICAL: DO NOT use markdown bolding (**). Use clear line breaks (\\n), bullet points (•), and emojis. Ensure text is spaced out nicely for readability."
        });
        
        let result;
        try {
            result = await generateContentWithRetry(model, {
                contents: [{ role: 'user', parts: [{ text: userQuery }] }],
                generationConfig: { 
                    responseMimeType: "application/json",
                    temperature: 0.7,
                    maxOutputTokens: 4096
                }
            });
        } catch (error: any) {
            // Fallback for 503/429 on preview model
            const msg = error.message || '';
            const isRetryable = msg.includes('503') || msg.includes('429') || msg.includes('Service Unavailable') || msg.includes('high demand');
            if (isRetryable && currentModelName !== "gemini-1.5-flash") {
                console.warn(`[Fallback] Switching to gemini-1.5-flash for ${part} analysis`);
                currentModelName = "gemini-1.5-flash";
                model = genAI.getGenerativeModel({ 
                    model: currentModelName, 
                    systemInstruction: systemPrompt + "\nCRITICAL: DO NOT use markdown bolding (**). Use clear line breaks (\\n), bullet points (•), and emojis. Ensure text is spaced out nicely for readability."
                });
                result = await generateContentWithRetry(model, {
                    contents: [{ role: 'user', parts: [{ text: userQuery }] }],
                    generationConfig: { 
                        responseMimeType: "application/json",
                        temperature: 0.7,
                        maxOutputTokens: 4096
                    }
                });
            } else {
                throw error;
            }
        }
        
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
            error: error.message || "Unknown AI Error",
            koreanError: `${part} 분석 중 오류 발생: ${errorMessage}`,
            message: error.message,
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}
