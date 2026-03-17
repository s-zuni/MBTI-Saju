import { GoogleGenerativeAI } from '@google/generative-ai';
import { calculateSaju } from './_utils/saju';
import { generateContentWithRetry, getKoreanErrorMessage } from './_utils/retry';
import { cleanAndParseJSON } from './_utils/json';

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const { type } = req.query;
    const body = req.body || {};
    const { birthDate, birthTime, mbti, region, gender, name, startDate, endDate } = body;
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!GEMINI_API_KEY) {
        console.error('Missing GEMINI_API_KEY');
        return res.status(500).json({ error: 'Special analysis configuration missing (API Key)' });
    }

    // Input validation
    if (!birthDate || !mbti) {
        return res.status(400).json({ error: '필수 정보(생년월일, MBTI)가 누락되었습니다.' });
    }

    const saju = calculateSaju(birthDate, birthTime);
    let systemPrompt = '';
    let userQuery = '';

    if (type === 'healing') {
        systemPrompt = `당신은 '데이터 기반 웰니스 분석가'입니다. 사용자의 MBTI와 사주 오행 분포를 토대로 가장 적합한 힐링 장소와 활동을 추천합니다.
        **결과 형식 (JSON)**:
        { "place": "장소 이름", "placeType": "장소 유형", "activity": "추천 활동", "reason": "추천 이유" }`;
        userQuery = `User MBTI: ${mbti}, Day Master: ${saju.dayMaster.korean}, Elements: ${JSON.stringify(saju.elementRatio)}, Region: ${region || '전국'}`;
    } else if (type === 'job') {
        systemPrompt = `당신은 '천직 전략 컨설턴트'입니다. 사용자의 기질과 재능이 가장 잘 발휘될 수 있는 직업군을 제안합니다.
        **결과 형식 (JSON)**:
        { "jobs": ["직업1", "직업2", "직업3"], "reason": "제안 이유" }`;
        userQuery = `User MBTI: ${mbti}, Saju Day Master: ${saju.dayMaster.korean} (${saju.dayMaster.description})`;
    } else if (type === 'trip') {
        systemPrompt = `당신은 '운명 여행 큐레이터'입니다. 사용자의 기운을 북돋아줄 수 있는 여행지와 시기를 제안합니다.
        **결과 형식 (JSON)**:
        { "places": [{ "name": "장소", "reason": "이유" }], "bestTime": "추천 시기", "tip": "여행 팁" }`;
        userQuery = `User: ${name || '사용자'}, MBTI: ${mbti}, Saju: ${saju.dayMaster.korean}, Region: ${region || '전국'}`;
    } else if (type === 'fortune') {
        const getZodiacSign = (dateStr: string) => {
            const year = parseInt(dateStr.split('-')[0]);
            const animals = ["쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양", "원숭이", "닭", "개", "돼지"];
            return animals[(year - 4) % 12];
        };
        const zodiac = getZodiacSign(birthDate);
        systemPrompt = `당신은 '운세 분석가'입니다. 띠와 사주 전반적인 기운을 살펴 오늘과 내일의 운세를 분석합니다.
        **결과 형식 (JSON)**:
        { "today": { "fortune": "설명", "lucky": { "color": "색상", "number": "숫자", "direction": "방향" } }, "tomorrow": { "fortune": "설명", "lucky": { "color": "색상", "number": "숫자", "direction": "방향" } } }`;
        userQuery = `띠: ${zodiac}, 생년월일: ${birthDate}, MBTI: ${mbti}`;
    } else {
        return res.status(400).json({ error: 'Invalid type' });
    }

    try {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash", 
            systemInstruction: systemPrompt 
        });
        
        const result = await generateContentWithRetry(model, {
            contents: [{ role: 'user', parts: [{ text: userQuery }] }],
            generationConfig: { 
                responseMimeType: "application/json",
                temperature: 0.7
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
