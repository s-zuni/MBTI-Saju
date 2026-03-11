import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { calculateSaju } from './_utils/saju';
import { cleanAndParseJSON } from './_utils/json';
import { generateContentWithRetry, getKoreanErrorMessage } from './_utils/retry';

export default async (req: any, res: any) => {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    try {
        const { birthDate, birthTime, mbti } = req.body;
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.REACT_APP_GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
        if (!GEMINI_API_KEY) throw new Error('Missing Gemini API Key');

        const saju = calculateSaju(birthDate, birthTime);

        const systemPrompt = `
당신은 일과 사주명리학, MBTI 심리학을 결합하여 완벽한 진로를 찾아주는 '천직 전략 컨설턴트(Career Strategy Consultant)'입니다.
사용자의 인지기능(MBTI)과 오행의 밸런스(사주)를 분석하여 가장 큰 성과를 낼 수 있는 3가지 직업군을 제안하세요.

[핵심 규칙 - 반드시 지킬 것]
1. 언어: 무조건 **한국어(Korean)**로만 작성하세요. (영어 사용 금지)
2. 분량 및 깊이: "reason" 항목은 반드시 최소 600자 이상의 매우 심층적이고 전문적인 컨설팅 리포트로 작성해야 합니다. 이 사람이 무언가에 끌리는 심리적 이유(MBTI)와, 성과를 낼 수밖에 없는 기질적 강점(사주의 오행, 예를 들어 화(火) 기운의 언변력 등)을 논리적이고 입체적으로 서술하세요. 가벼운 결과가 아닌 뼈 때리면서도 응원이 되는 분석을 하세요.
3. 가독성: 전문 컨설팅 리포트처럼 **개괄식(블렛 포인트)**을 적극 활용하세요. 답변 본문에서 마크다운 **볼드체**('**')를 절대 사용하지 마세요. 각 항목과 설명 사이에는 충분한 줄바꿈(`\n\n`)을 적용하여 가독성을 높이세요.
4. 이모지: 리포트가 딱딱하지 않도록 💼, 📈, 🔥, 💡 등의 이모지를 포함하세요.

응답 형식은 아래 JSON 구조를 반드시 지키세요:
{
    "jobs": ["구체적인 직무명 1", "구체적인 직무명 2", "구체적인 직무명 3"],
    "reason": "왜 이 3가지 직무가 당신의 MBTI(인지기능)와 사주(오행 밸런스, 강점)에 완벽히 부합하는지를 서술한 **최소 600자 이상의 매우 상세한 컨설팅 리포트**. (단락 분리, 볼드체, 이모지 적극 사용)"
}
        `;

        const userQuery = `
        User MBTI: ${mbti}
        Saju Day Master: ${saju.dayMaster.korean}
        Elements: Wood ${saju.elementRatio.wood}%, Fire ${saju.elementRatio.fire}%, Earth ${saju.elementRatio.earth}%, Metal ${saju.elementRatio.metal}%, Water ${saju.elementRatio.water}%
        
        Recommend 3 best career paths.
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
            return res.status(500).json({ error: "Failed to generate job recommendation" });
        }

        res.status(200).json(content);

    } catch (error: any) {
        console.error('Job API Error:', error);
        res.status(500).json({ error: getKoreanErrorMessage(error) });
    }
};
