import { GoogleGenerativeAI } from '@google/generative-ai';
import { calculateSaju } from './_utils/saju';
import { generateContentWithRetry, getKoreanErrorMessage } from './_utils/retry';
import { cleanAndParseJSON } from './_utils/json';

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const { type } = req.query;
    const body = req.body || {};
    const { birthDate, birthTime, mbti, region, gender, name, startDate, endDate } = body;
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.REACT_APP_GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!GEMINI_API_KEY) {
        console.error('Missing GEMINI_API_KEY');
        return res.status(500).json({ error: 'Special analysis configuration missing (API Key)' });
    }

    // Input validation
    if (!birthDate || !mbti) {
        return res.status(400).json({ error: '필수 정보(생년월일, MBTI)가 누락되었습니다.' });
    }

    const saju = calculateSaju(birthDate, birthTime);
    let systemPrompt = `당신은 20대 여성의 감성과 니즈를 완벽하게 파악하고 있는 '트렌디 웰니스 & 라이프 컨설턴트'입니다.
    
    [핵심 규칙]
    1. 모든 답변은 20대 여성이 흥미를 느낄 수 있도록 친근하고 감각적인 어투(말투)를 사용하세요.
    2. 모든 설명 문구는 최소 300자 이상으로 풍부하고 구체적으로 작성하세요.
    3. ** (별표 두 개) 등 마크다운 강조 문법을 절대로 사용하지 마세요.
    4. MBTI 용어를 제외한 모든 언어는 한국어만 사용하세요. (영어 사용 금지)
    5. 뻔한 조언 대신, 사용자 개인의 MBTI와 사주 기운이 반영된 독특하고 실질적인 인사이트를 제공하세요.`;

    let userQuery = '';

    if (type === 'healing') {
        systemPrompt += `\n사용자의 MBTI와 사주 오행 분포를 토대로 가장 적합한 '나를 위한 힐링 스팟'과 활동을 추천하세요.
        - 추천 이유에 사주 오행(목, 화, 토, 금, 수)의 균형과 MBTI의 성향이 어떻게 힐링에 기여하는지 상세히 포함하세요.
        - 결과 형식 (JSON): { "place": "장소 이름", "placeType": "장소 유형 (예: 독립서점, 숲속 카페 등)", "activity": "구체적인 힐링 활동", "reason": "300자 이상의 상세한 추천 이유 및 기대 효과" }`;
        userQuery = `MBTI: ${mbti}, 일간(Day Master): ${saju.dayMaster.korean}, 오행분포: ${JSON.stringify(saju.elementRatio)}, 선호 지역: ${region || '전국'}`;
    } else if (type === 'job') {
        systemPrompt += `\n사용자의 타고난 기질(사주)과 성격 패턴(MBTI)이 가장 완벽한 시너지를 낼 수 있는 '천직'을 제안하세요.
        - 단순 직업명 나열이 아닌, 왜 이 직업이 당신의 운명에 맞는지 심리학적, 명리학적 근거를 들어 설명하세요.
        - 결과 형식 (JSON): { "jobs": ["직업1", "직업2", "직업3"], "reason": "300자 이상의 상세한 제안 이유 및 커리어 성장 전략" }`;
        userQuery = `MBTI: ${mbti}, 사주 일간: ${saju.dayMaster.korean} (${saju.dayMaster.description})`;
    } else if (type === 'trip') {
        const travelType = body.regionType === 'overseas' ? '해외' : '국내';
        systemPrompt += `\n사용자의 기운을 북돋아주고 새로운 영감을 줄 수 있는 '운명적 여행지'를 큐레이션 하세요. 현재 ${travelType} 여행을 계획 중입니다.
        - 반드시 ${travelType} 내의 장소를 추천해야 하며, 사용자의 MBTI와 현재 사주 기운(일간 등)에 맞는 장소를 선정하세요.
        - 결과 형식 (JSON): { "places": [{ "name": "구체적인 장소명", "reason": "이 장소가 왜 사용자와 운명적으로 맞는지에 대한 300자 이상의 상세한 설명" }], "bestTime": "추천 방문 시기 및 그 이유", "tip": "해당 여행지에서 기운을 얻을 수 있는 특별한 팁" }`;
        userQuery = `이름: ${name || '사용자'}, MBTI: ${mbti}, 사주 기운: ${saju.dayMaster.korean}, 선택 지역/대륙: ${region || '전국'}, 여행 타입: ${travelType}`;
    } else if (type === 'fortune') {
        const getZodiacSign = (dateStr: string) => {
            const year = parseInt(dateStr.split('-')[0] || '1990');
            const animals = ["쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양", "원숭이", "닭", "개", "돼지"];
            return animals[(year - 4) % 12];
        };
        const zodiac = getZodiacSign(birthDate);
        systemPrompt += `\n사용자의 띠(${zodiac})와 사주 전반적인 기운, MBTI 성향을 종합하여 오늘과 내일의 운세를 분석합니다.
        - 결과 형식 (JSON): { 
            "today": { "fortune": "300자 이상의 상세한 오늘의 운세 분석과 행동 지침", "lucky": { "color": "색상", "number": "숫자", "direction": "방향" }, "mission": "오늘의 행운 미션" },
            "tomorrow": { "fortune": "300자 이상의 상세한 내일의 운세 분석과 기대 효과", "lucky": { "color": "색상", "number": "숫자", "direction": "방향" }, "mission": "내일의 행운 미션" }
        }`;
        userQuery = `띠: ${zodiac}, 생년월일: ${birthDate}, MBTI: ${mbti}`;
    } else {
        return res.status(400).json({ error: 'Invalid type' });
    }

    try {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ 
            model: process.env.GEMINI_MODEL || "gemini-3.1-flash-lite-preview", 
            systemInstruction: systemPrompt
        });
        
        const result = await generateContentWithRetry(model, {
            contents: [{ role: 'user', parts: [{ text: userQuery }] }],
            generationConfig: { 
                responseMimeType: "application/json",
                temperature: 0.8
            }
        });
        
        const responseText = result.response.text();
        if (!responseText) throw new Error("AI returned an empty response");
        
        const content = cleanAndParseJSON(responseText);
        res.status(200).json(content);
    } catch (error: any) {
        console.error(`[Special Analysis Error - ${type}]:`, error);
        res.status(500).json({ 
            error: getKoreanErrorMessage(error) || "추천 정보를 가져오는 중 오류가 발생했습니다." 
        });
    }
}
