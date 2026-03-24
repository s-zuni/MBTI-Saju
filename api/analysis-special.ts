import { GoogleGenerativeAI } from '@google/generative-ai';
import { calculateSaju } from './_utils/saju';
import { generateContentWithRetry, getKoreanErrorMessage } from './_utils/retry';
import { cleanAndParseJSON } from './_utils/json';

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const { type } = req.query;
    console.log(`[Special Analysis Requested] Type: ${type}`);

    // Robust body parsing
    let body = req.body;
    if (typeof body === 'string') {
        try {
            body = JSON.parse(body);
        } catch (e) {
            console.error('Failed to parse body string:', e);
        }
    }
    body = body || {};

    const { 
        birthDate, birthTime, mbti, region, gender, name, 
        startDate, endDate, targetBirthDate, targetBirthTime, targetGender, requirements 
    } = body;

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.REACT_APP_GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!GEMINI_API_KEY) {
        console.error('Missing GEMINI_API_KEY');
        return res.status(500).json({ error: 'Special analysis configuration missing (API Key)' });
    }

    // Common analysis context (if provided)
    let saju: any = null;
    if (birthDate) {
        try {
            saju = calculateSaju(birthDate, birthTime);
        } catch (e) {
            console.error('Initial Saju calculation failed for birthDate:', birthDate, e);
        }
    }

    let systemPrompt = `당신은 20대 여성의 감성과 니즈를 완벽하게 파악하고 있는 '트렌디 웰니스 & 라이프 컨설턴트'입니다.
    
    [핵심 규칙]
    1. 모든 답변은 20대 여성이 흥미를 느낄 수 있도록 친근하고 감각적인 어투(말투)를 사용하세요.
    2. 답변 내용을 단순한 줄글로 나열하지 말고, 반드시 '글머리표(-)'와 '문단 간 공백(줄바꿈)'을 사용하여 항목별로 깔끔하게 시각화하세요.
    3. 중요한 포인트나 상세 설명은 최소 3개 이상의 하위 항목(-)으로 나누어 설명하세요.
    4. 가독성을 위해 한 문단은 최대 3~4줄을 넘지 않도록 하고, 문단 사이에 반드시 빈 줄을 추가하세요.
    5. ** (별표 두 개) 등 마크다운 강조 문법을 절대로 사용하지 마세요. (사용 금지 유지)
    6. MBTI 용어를 제외한 모든 언어는 한국어만 사용하세요. (영어 사용 금지)
    7. 뻔한 조언 대신, 사용자 개인의 MBTI와 사주 기운이 반영된 독특하고 실질적인 인사이트를 제공하세요.`;

    let userQuery = '';

    try {
        if (type === 'healing') {
            if (!birthDate || !mbti || !saju) {
                console.warn('[Healing Validation Failed] Missing fields or saju', { birthDate, mbti, hasSaju: !!saju });
                return res.status(400).json({ error: '힐링 분석을 위한 필수 정보(생년월일, MBTI)가 누락되었습니다.' });
            }
            systemPrompt += `\n사용자의 MBTI와 사주 오행 분포를 토대로 가장 적합한 '나를 위한 힐링 스팟'과 활동을 추천하세요.
            - 결과 형식 (JSON): { 
                "place": "장소 이름", 
                "placeType": "장소 유형", 
                "activity": "구체적인 힐링 활동 (글머리표 활용)", 
                "reason": "항목별로 나열된 상세 추천 이유 (최소 3개 항목)", 
                "summary": "3줄 이내의 핵심 요약" 
            }`;
            userQuery = `MBTI: ${mbti}, 일간(Day Master): ${saju.dayMaster.korean}, 오행분포: ${JSON.stringify(saju.elementRatio)}, 선호 지역: ${region || '전국'}`;
        } else if (type === 'naming') {
            if (!targetBirthDate) {
                console.warn('[Naming Validation Failed] Missing targetBirthDate');
                return res.status(400).json({ error: '작명 대상의 생년월일이 누락되었습니다. (Error: 400.1)' });
            }
            let targetSaju: any;
            try {
                targetSaju = calculateSaju(targetBirthDate, targetBirthTime);
            } catch (e) {
                console.error('[Naming Saju Error]:', e);
                return res.status(400).json({ error: '작명 대상의 생년월일 형식이 올바르지 않습니다. (Error: 400.2)' });
            }
            
            systemPrompt = `당신은 정통 사주명리학에 정통한 최고의 현대 작명가입니다. 모든 답변은 진지하고 신뢰감 있는 전문가 어투를 사용하세요.
            - 결과 형식 (JSON): { 
                "summary": "핵심 사주 기운 요약", 
                "analysis": "사주 원국 분석 및 작명 방향성 (항목별로 구분하여 상세 설명)", 
                "names": [
                    { "name": "이름 (한글)", "hanja": "이름 (한자)", "meaning": "이름의 뜻과 어원 (글머리표 활용)", "sajuFit": "사주적으로 좋은 이유 (항목별 나열)" }
                ] 
            }`;
            userQuery = `작명 대상의 성별: ${targetGender === 'male' ? '남성' : '여성'}, 사주 기운: 일간 ${targetSaju.dayMaster.korean}, 오행분포 ${JSON.stringify(targetSaju.elementRatio)}, 생년월일 ${targetBirthDate}. 사용자의 특별 요청사항: ${requirements || '없음'}`;
        } else if (type === 'job') {
            if (!birthDate || !mbti || !saju) {
                console.warn('[Job Validation Failed] Missing fields or saju', { birthDate, mbti, hasSaju: !!saju });
                return res.status(400).json({ error: '직업 분석을 위한 필수 정보(생년월일, MBTI)가 누락되었습니다.' });
            }
            systemPrompt += `\n사용자의 타고난 기질(사주)과 성격 패턴(MBTI)이 시너지를 낼 수 있는 '천직'을 제안하세요.
            - 결과 형식 (JSON): { 
                "jobs": ["직업1", "직업2", "직업3"], 
                "reason": "해당 직업들이 추천되는 상세 이유 (직업별로 항목을 나누어 글머리표로 설명)", 
                "summary": "3줄 이내 핵심 요약" 
            }`;
            userQuery = `MBTI: ${mbti}, 사주 일간: ${saju.dayMaster.korean} (${saju.dayMaster.description})`;
        } else if (type === 'trip') {
            if (!birthDate || !mbti || !saju) {
                console.warn('[Trip Validation Failed] Missing fields or saju', { birthDate, mbti, hasSaju: !!saju });
                return res.status(400).json({ error: '여행 분석을 위한 필수 정보(생년월일, MBTI)가 누락되었습니다.' });
            }
            const travelType = body.regionType === 'overseas' ? '해외' : '국내';
            
            // Calculate trip duration
            let durationDays = 1;
            if (startDate && endDate) {
                const s = new Date(startDate);
                const e = new Date(endDate);
                if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
                    durationDays = Math.max(1, Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1);
                }
            }

            systemPrompt += `\n사용자의 기운을 북돋아줄 수 있는 '운명적 여행지'를 큐레이션 하세요.
            - 여행 기간(${durationDays}일)에 맞춰 '심층 일정 가이드'를 매일매일 상세히 작성해야 합니다.
            - 결과 형식 (JSON): { 
                "places": [{ "name": "장소명", "reason": "간략한 추천 이유 (글머리표 활용)" }], 
                "itinerary": [
                    { "day": 1, "schedule": "오전/오후/저녁으로 나누어 글머리표(-)를 사용해 상세히 작성" }
                    // 여행 기간(${durationDays}일)만큼 모든 날짜의 일정을 추가해야 함
                ], 
                "summary": "핵심 요약", 
                "bestTime": "추천 시기", 
                "tip": "여행 팁 (나열식)" 
            }`;
            userQuery = `이름: ${name || '사용자'}, MBTI: ${mbti}, 사주 기운: ${saju.dayMaster.korean}, 선택 지역: ${region || '전국'}, 여행 타입: ${travelType}, 여행 기간: ${startDate} ~ ${endDate} (${durationDays}일간), 요청사항: ${requirements || '없음'}`;
        } else if (type === 'fortune') {
            if (!birthDate || !mbti) {
                return res.status(400).json({ error: '운세 분석을 위한 필수 정보(생년월일, MBTI)가 누락되었습니다.' });
            }
            const yearStr = birthDate.split('-')[0] || '1990';
            const animals = ["쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양", "원숭이", "닭", "개", "돼지"];
            const zodiac = animals[(parseInt(yearStr) - 4) % 12];
            
            systemPrompt += `\n사용자의 띠(${zodiac})와 MBTI 성향을 종합하여 오늘과 내일의 운세를 분석합니다.
            - 결과 형식 (JSON): { "today": { "fortune": "상세 분석", "lucky": { "color": "색상", "number": "숫자", "direction": "방향" } }, "tomorrow": { "fortune": "상세 분석", "lucky": { "color": "색상", "number": "숫자", "direction": "방향" } } }`;
            userQuery = `띠: ${zodiac}, 생년월일: ${birthDate}, MBTI: ${mbti}`;
        } else {
            return res.status(400).json({ error: `Invalid analysis type: ${type}` });
        }

        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        // Robust model selection: trim and strip potential quotes
        const modelNameFromEnv = (process.env.GEMINI_MODEL || "").trim().replace(/^["']|["']$/g, '');
        // Use gemini-3-flash-preview as primary
        const modelName = (modelNameFromEnv && modelNameFromEnv.length > 5) ? modelNameFromEnv : "gemini-3-flash-preview";
        let currentModelName = modelName;
        
        let model = genAI.getGenerativeModel({ 
            model: currentModelName, 
            systemInstruction: systemPrompt
        });
        
        console.log(`[Gemini Call] Model: ${currentModelName}, Type: ${type}`);
        let result;
        try {
            result = await generateContentWithRetry(model, {
                contents: [{ role: 'user', parts: [{ text: userQuery }] }],
                generationConfig: { 
                    responseMimeType: "application/json",
                    temperature: 0.8
                }
            });
        } catch (error: any) {
            // Fallback for 503/429
            const msg = error.message || '';
            const isRetryable = msg.includes('503') || msg.includes('429') || msg.includes('Service Unavailable') || msg.includes('high demand');
            if (isRetryable && currentModelName !== "gemini-1.5-flash") {
                console.warn(`[Fallback] Switching to gemini-1.5-flash for special analysis: ${type}`);
                currentModelName = "gemini-1.5-flash";
                model = genAI.getGenerativeModel({ 
                    model: currentModelName, 
                    systemInstruction: systemPrompt
                });
                result = await generateContentWithRetry(model, {
                    contents: [{ role: 'user', parts: [{ text: userQuery }] }],
                    generationConfig: { 
                        responseMimeType: "application/json",
                        temperature: 0.8
                    }
                });
            } else {
                throw error;
            }
        }
        
        const responseText = result.response.text();
        console.log(`[Gemini Response] Type: ${type}, Success: ${!!responseText}, Length: ${responseText?.length || 0}`);
        
        if (!responseText) throw new Error("AI returned an empty response");
        
        const content = cleanAndParseJSON(responseText);
        res.status(200).json(content);

    } catch (error: any) {
        console.error(`[Special Analysis Crash - ${type}]:`, error);
        // Provide more detailed error info in the response if possible
        const errorMessage = error.message || String(error);
        res.status(500).json({ 
            error: getKoreanErrorMessage(error) || "분석 정보를 가져오는 중 오류가 발생했습니다.",
            details: errorMessage,
            model: process.env.GEMINI_MODEL || "gemini-3.1-flash-lite-preview"
        });
    }
}
