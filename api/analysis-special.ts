import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamObject } from 'ai';
import { z } from 'zod';
import { calculateSaju } from './_utils/saju';

const luckySchema = z.object({
    color: z.string().describe("행운의 색상"),
    number: z.string().describe("행운의 숫자"),
    direction: z.string().describe("행운의 방향")
});

const fortuneItemSchema = z.object({
    fortune: z.string().describe("상세 운세 분석 내용 (글머리표와 줄바꿈 활용)"),
    lucky: luckySchema,
    mission: z.string().optional().describe("오늘의 미션/조언")
});

const schemas: Record<string, any> = {
    healing: z.object({
        place: z.string(),
        placeType: z.string(),
        activity: z.string(),
        reason: z.string(),
        summary: z.string()
    }),
    naming: z.object({
        names: z.array(z.object({
            hangul: z.string(),
            hanja: z.string(),
            meaning: z.string(),
            saju_compatibility: z.string()
        })),
        summary: z.string()
    }),
    job: z.object({
        job_analysis: z.array(z.object({
            job: z.string(),
            compatibility: z.string(),
            reason: z.string(),
            strategy: z.string()
        })),
        summary: z.string()
    }),
    trip: z.object({
        places: z.array(z.object({
            name: z.string(),
            reason: z.string(),
            activity: z.string()
        })),
        itinerary: z.array(z.object({
            day: z.string(),
            schedule: z.array(z.string())
        })),
        summary: z.string(),
        bestTime: z.string(),
        tip: z.string()
    }),
    cherry: z.object({
        places: z.array(z.object({
            name: z.string(),
            reason: z.string()
        })),
        summary: z.string(),
        tip: z.string()
    }),
    fortune: z.object({
        today: fortuneItemSchema,
        tomorrow: fortuneItemSchema
    })
};

export const config = {
    maxDuration: 60,
};

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const { type } = req.query;
    const currentSchema = schemas[type as string];

    if (!currentSchema) {
        return res.status(400).json({ error: `Invalid analysis type: ${type}` });
    }

    let body = req.body;
    if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch (e) { console.error('Parse error:', e); }
    }
    body = body || {};

    const { 
        birthDate, birthTime, mbti, region, gender, name, 
        startDate, endDate, targetBirthDate, targetBirthTime, targetGender, requirements,
        sajuData, targetSajuData
    } = body;

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.REACT_APP_GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!GEMINI_API_KEY) {
        return res.status(500).json({ error: 'Missing API Key' });
    }

    let saju = sajuData;
    if (!saju && birthDate) {
        try { saju = calculateSaju(birthDate, birthTime); } catch (e) { console.error('Saju error:', e); }
    }

    let systemPrompt = `당신은 20대 여성의 감성과 니즈를 완벽하게 파악하고 있는 '트렌디 웰니스 & 라이프 컨설턴트'입니다.
    
    [핵심 규칙]
    1. 모든 답변은 20대 여성이 흥미를 느낄 수 있도록 친근하고 감각적인 어투를 사용하세요.
    2. 답변 내용을 단순한 줄글로 나열하지 말고, 반드시 '글머리표(-)'와 '문단 간 공백'을 사용하세요.
    3. 절대적 금지 사항 (CRITICAL): 답변 어디에도 마크다운 강조 기호인 별표 두 개(**)를 절대로 사용하지 마세요. 강조가 필요하면 글머리표(-), 숫자, 이모지 등을 활용하세요.
    4. MBTI 용어를 제외한 모든 언어는 한국어만 사용하세요.`;

    let userQuery = '';

    if (type === 'healing') {
        userQuery = `MBTI: ${mbti}, 일간: ${saju?.dayMaster?.korean || '알수없음'}, 오행분포: ${JSON.stringify(saju?.elementRatio || {})}, 선호 지역: ${region || '전국'}`;
    } else if (type === 'naming') {
        let finalTargetSaju = targetSajuData;
        if (!finalTargetSaju) {
            finalTargetSaju = calculateSaju(targetBirthDate, targetBirthTime);
        }
        userQuery = `성별: ${targetGender}, 사주: 일간 ${finalTargetSaju.dayMaster.korean}, 오행분포 ${JSON.stringify(finalTargetSaju.elementRatio)}, 생년월일 ${targetBirthDate}. 요청사항: ${requirements || '없음'}`;
    } else if (type === 'job') {
        userQuery = `MBTI: ${mbti}, 사주 일간: ${saju?.dayMaster?.korean || '알수없음'}`;
    } else if (type === 'trip') {
        userQuery = `이름: ${name}, MBTI: ${mbti}, 사주 일간: ${saju?.dayMaster?.korean}, 지역: ${region}, 기간: ${startDate} ~ ${endDate}, 요청사항: ${requirements}`;
    } else if (type === 'cherry') {
        userQuery = `이름: ${name}, MBTI: ${mbti}, 사주 일간: ${saju?.dayMaster?.korean}, 오행분포: ${JSON.stringify(saju?.elementRatio)}, 요청사항: ${requirements}`;
    } else if (type === 'fortune') {
        const yearStr = birthDate?.split('-')[0] || '1990';
        const zodiac = ["쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양", "원숭이", "닭", "개", "돼지"][(parseInt(yearStr) - 4) % 12];
        userQuery = `띠: ${zodiac}, 생년월일: ${birthDate}, MBTI: ${mbti}, 사주 일간: ${saju?.dayMaster?.korean || '알수없음'}`;
    }

    try {
        const google = createGoogleGenerativeAI({ apiKey: GEMINI_API_KEY });
        const result = await streamObject({
            model: google('gemini-2.5-flash'),
            schema: currentSchema,
            system: systemPrompt,
            prompt: userQuery,
        });

        return result.toTextStreamResponse();
    } catch (error: any) {
        console.error(`[Streaming Error - ${type}]:`, error);
        res.status(500).json({ error: "분석 중 오류가 발생했습니다.", details: error.message });
    }
}
