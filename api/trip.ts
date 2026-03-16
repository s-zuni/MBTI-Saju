import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { calculateSaju } from './_utils/saju';
import { cleanAndParseJSON } from './_utils/json';
import { generateContentWithRetry, getKoreanErrorMessage } from './_utils/retry';

export default async (req: any, res: any) => {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    try {
        const { birthDate, birthTime, mbti, gender, name, region, startDate, endDate } = req.body;
        const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
        const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.REACT_APP_GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

        if (!GEMINI_API_KEY) {
            return res.status(500).json({ error: '서버 설정 오류: GEMINI_API_KEY가 누락되었습니다.' });
        }

        // Calculate Saju
        const saju = calculateSaju(birthDate, birthTime);

        // Calculate Duration
        let durationText = "";
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            const diffTime = Math.abs(end.getTime() - start.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // inclusive
            durationText = `Schedule: ${startDate} ~ ${endDate} (${diffDays} days)`;
        }

        const systemPrompt = `
당신은 사주명리와 MBTI를 결합하여 완벽한 여행지를 추천해주는 '운명 여행 큐레이터(Destiny Travel Curator)'입니다.
사용자가 요청한 지역(${region})을 기반으로, 그들의 기운을 보완하고 성향에 맞는 3곳의 여행지와 맞춤 일정을 제안하세요.

[핵심 규칙 - 반드시 지킬 것]
1. 언어: 무조건 **한국어(Korean)**로만 작성하세요. (영어 사용 금지)
2. 분량 및 깊이: 단순히 장소만 나열하지 마세요. 각 장소를 추천하는 이유(reason)는 이 사람의 MBTI 성향과 사주 오행(예: 사주에 수(水) 기운이 부족하여 물가 여행이 필요함 등)을 엮어 최소 300자 이상의 매우 상세하고 설득력 있는 스토리텔링으로 작성하세요.
3. 가독성: 단순히 나열하지 말고, **개괄식(블렛 포인트)** 구조를 사용하여 핵심 내용을 한눈에 파악할 수 있게 하세요. 답변 본문에서 마크다운 **볼드체**('**')를 절대 사용하지 마세요. 장소 정보와 일정 사이에는 충분한 줄바꿈(\`\\n\\n\`)을 적용하세요.
4. 이모지: 글이 지루하지 않게 ✈️, 🏞️, 🏖️, 🏯 등의 이모지를 섞어 사용하세요.

응답 형식은 아래 JSON 구조를 반드시 지키세요:
{
    "places": [
        { "name": "장소 이름 (예: 제주도 비자림)", "reason": "이 장소가 MBTI와 사주 오행에 맞춰 왜 완벽한 목적지인지 300자 이상으로 묘사" },
        ... (반드시 3곳 추천)
    ],
    "itinerary": [
        { "day": 1, "schedule": "오전/오후/저녁으로 나눈 매우 상세하고 감성적인 동선 계획" },
        { "day": 2, "schedule": "..." }
        ... (일정표를 작성)
    ],
    "summary": "마지막으로 여행자에게 건네는 따뜻하고 통찰력 있는 여행 팁과 총평 (최소 200자)"
}
        `;

        const userQuery = `
        User: ${name} (${gender})
        MBTI: ${mbti}
        Saju Day Master: ${saju.dayMaster.korean} (${saju.dayMaster.description})
        Elements: Wood ${saju.elementRatio.wood}%, Fire ${saju.elementRatio.fire}%, Earth ${saju.elementRatio.earth}%, Metal ${saju.elementRatio.metal}%, Water ${saju.elementRatio.water}%
        
        Region: ${region}
        ${durationText}
        
        Recommend 3 places in ${region} and create a detailed itinerary.
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
            console.error("Raw Text:", responseText);
            return res.status(500).json({ error: "Failed to parse travel recommendation." });
        }

        res.status(200).json(content);

    } catch (error: any) {
        console.error('Trip API Error:', error);
        res.status(500).json({ error: getKoreanErrorMessage(error) });
    }
};
