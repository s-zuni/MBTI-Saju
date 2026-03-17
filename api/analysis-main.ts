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
        systemPrompt = `당신은 '소울 융합 분석가'입니다. 사용자의 MBTI 성향과 사주 명리학의 핵심 원리를 결합하여, 유일무이한 자아 정체성과 삶의 방향성을 제시해 줍니다. 
        [중요: 결과 구조] 반드시 아래 JSON 구조를 엄격히 지키세요:
        {
          "reportTitle": "한 줄 요약 제목",
          "keywords": ["키워드1", "키워드2", "키워드3", "키워드4", "키워드5"],
          "nature": {
            "dayPillarSummary": "일주 요약 (예: '갑목의 지혜를 가진 실천가')",
            "dayMasterAnalysis": "일간 분석 내용",
            "dayBranchAnalysis": "일지 분석 내용",
            "monthBranchAnalysis": "월지 분석 내용"
          },
          "fiveElements": {
            "elements": [
              {"element": "목(木)", "count": 0, "function": "심리 기능", "interpretation": "해석 내용"},
              {"element": "화(火)", "count": 0, "function": "심리 기능", "interpretation": "해석 내용"},
              {"element": "토(土)", "count": 0, "function": "심리 기능", "interpretation": "해석 내용"},
              {"element": "금(金)", "count": 0, "function": "심리 기능", "interpretation": "해석 내용"},
              {"element": "수(水)", "count": 0, "function": "심리 기능", "interpretation": "해석 내용"}
            ]
          },
          "persona": {
            "mbtiNickname": "MBTI 별칭",
            "dominantFunction": "주기능 설명",
            "auxiliaryFunction": "부기능 설명"
          },
          "deepIntegration": {
            "integrationPoints": [
              {"subtitle": "융합 포인트 1 제목", "content": "내용"},
              {"subtitle": "융합 포인트 2 제목", "content": "내용"}
            ]
          }
        }
        [가독성 규칙]
        1. ** (볼드체)는 절대 사용하지 마세요. (사용금지 유지)
        2. 적절한 줄바꿈과 줄공백을 넣어 읽기 쾌적하게 작성하세요.
        3. 문장은 20대 여성 타겟의 트렌디하고 공감적인 말투를 사용하세요.
        4. 적절한 이모지를 사용하여 밝은 분위기를 조성하세요.`;
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
