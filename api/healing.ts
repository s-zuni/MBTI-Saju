import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { calculateSaju } from './_utils/saju';
import { generateContentWithRetry, getKoreanErrorMessage } from './_utils/retry';

export default async (req: any, res: any) => {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    try {
        const { birthDate, birthTime, mbti, region } = req.body;
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.REACT_APP_GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
        if (!GEMINI_API_KEY) {
            return res.status(500).json({ error: '서버 설정 오류: GEMINI_API_KEY가 누락되었습니다.' });
        }

        const saju = calculateSaju(birthDate, birthTime);

        const systemPrompt = `
당신은 사주명리와 MBTI 데이터를 분석하여 가장 객관적이고 효과적인 휴식을 제안하는 '데이터 기반 웰니스 분석가'입니다.
사용자가 요청한 특정 지역(${region}) 내에서, 사용자의 심리적 스트레스를 치유할 수 있는 장소(카페, 공원, 체험 공간 등)와 활동을 추천하세요.

[핵심 규칙 - 반드시 지킬 것]
1. 언어: 무조건 **한국어(Korean)**로만 작성하세요. (영어 사용 금지)
2. 분량 및 구성: JSON의 "desc" 또는 "reason" 항목은 반드시 최소 400자 이상의 매우 상세하고 사실적인 분석을 기반으로 하되, 희망적인 어투의 글로 작성해야 합니다. 단순히 장소만 추천하지 말고, "왜 지금 당신에게 이런 휴식이 필요한지"를 MBTI의 기질과 사주의 오행(예: 수(水) 기운 부족 등) 관점에서 깊이 있게 분석하세요.
3. 가독성: 긴 서술형 문장보다는 **개괄식(블렛 포인트)**을 적극 활용하여 가독성을 극대화하세요. 답변 본문에서 마크다운 **볼드체**('**')를 절대 사용하지 마세요. 각 설명 문단 사이에는 명확한 줄바꿈(\`\\n\\n\`)을 적용하세요.
4. 이모지: 글의 분위기를 부드럽게 만들기 위해 🌿, ☕, ⛰️, 🧘‍♀️ 등의 이모지를 적극적으로 활용하세요.

응답 형식은 아래 JSON 구조를 반드시 지키세요:
{
    "place": "추천하는 장소 명칭 (예: 뚝섬 한강공원 수변무대)",
    "placeType": "장소 카테고리 (예: 카페, 공원, 복합문화공간)",
    "activity": "추천하는 구체적인 활동 (예: 잔잔한 윤슬을 보며 물멍하기)",
    "reason": "왜 이 장소와 활동이 사용자의 MBTI 및 사주 오행에 완벽히 들어맞는지, 현재 겪고 있을 만한 스트레스와 연결하여 **400자 이상의 매우 상세하고 사실적인 분석과 함께 전달하는 희망적인 가이드**로 작성. (볼드체 적극 활용)"
}
        `;

        const userQuery = `
        User MBTI: ${mbti}
        Saju Day Master: ${saju.dayMaster.korean}
        Elements: Wood ${saju.elementRatio.wood}%, Fire ${saju.elementRatio.fire}%, Earth ${saju.elementRatio.earth}%, Metal ${saju.elementRatio.metal}%, Water ${saju.elementRatio.water}%
        
        Preferred Region: ${region}
        
        Recommend a healing place and activity in ${region}.
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
        const content = JSON.parse(responseText);
        res.status(200).json(content);

    } catch (error: any) {
        console.error('Healing API Error:', error);
        res.status(500).json({ error: getKoreanErrorMessage(error) });
    }
};
