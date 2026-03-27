import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamObject } from 'ai';
import { z } from 'zod';
import { calculateSaju } from './_utils/saju';

const schemas: Record<string, any> = {
    core: z.object({
        reportTitle: z.string(),
        keywords: z.string(),
        fusionNickname: z.string(),
        nature: z.object({
            dayPillarSummary: z.string(),
            dayMasterAnalysis: z.string(),
            dayBranchAnalysis: z.string(),
            monthBranchAnalysis: z.string()
        }),
        fiveElements: z.object({
            elements: z.array(z.object({
                element: z.string(),
                count: z.number(),
                interpretation: z.string()
            }))
        }),
        persona: z.object({
            mbtiNickname: z.string(),
            dominantFunction: z.string(),
            auxiliaryFunction: z.string()
        }),
        deepIntegration: z.object({
            integrationPoints: z.array(z.object({
                subtitle: z.string(),
                content: z.string()
            }))
        })
    }),
    fortune: z.object({
        yearlyFortune: z.object({
            theme: z.string(),
            overview: z.string(),
            keywords: z.array(z.string())
        }),
        monthlyFortune: z.object({
            months: z.array(z.object({
                period: z.string(),
                energy: z.string(),
                guide: z.string()
            }))
        })
    }),
    strategy: z.object({
        fieldStrategies: z.object({
            career: z.object({ subtitle: z.string(), analysis: z.string(), advice: z.string() }),
            love: z.object({ subtitle: z.string(), analysis: z.string(), advice: z.string() }),
            wealth: z.object({ subtitle: z.string(), analysis: z.string(), advice: z.string() })
        }),
        warnings: z.object({
            watchOut: z.array(z.object({ title: z.string(), description: z.string() })),
            avoid: z.array(z.object({ title: z.string(), description: z.string() }))
        }),
        solution: z.string()
    })
};

export const config = {
    maxDuration: 60,
};

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const { part } = req.query;
    const body = req.body || {};
    const { mbti, birthDate, birthTime, gender, name, sajuData } = body;
    const currentSchema = schemas[part as string];

    if (!currentSchema) {
        return res.status(400).json({ error: 'Invalid part' });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.REACT_APP_GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!GEMINI_API_KEY) {
        return res.status(500).json({ error: 'Missing API Key' });
    }

    // Use client-provided sajuData or calculate on server as fallback
    let finalSaju = sajuData;
    if (!finalSaju) {
        finalSaju = calculateSaju(birthDate, birthTime);
    }

    const sajuContext = `사주 원국: ${finalSaju.ganZhi.year} ${finalSaju.ganZhi.month} ${finalSaju.ganZhi.day} ${finalSaju.ganZhi.hour} (일간: ${finalSaju.dayMaster.korean} / 성질: ${finalSaju.dayMaster.description})`;

    let systemPrompt = `당신은 세계 최고의 '소울 융합 분석가'입니다. 사용자의 MBTI 성향과 사주 명리학의 깊은 원리를 결합하여, 단순한 정보를 넘어선 '인생의 지도'를 그려줍니다.
    
    [핵심 규칙]
    1. 모든 답변은 20대 여성이 흥미를 느낄 수 있도록 친근하고 감각적인 어투를 사용하세요.
    2. 가독성을 위해 '글머리표(•)'와 '문단 간 공백'을 적극 활용하세요.
    3. 절대적 금지 사항 (CRITICAL): 답변 어디에도 마크다운 강조 기호인 별표 두 개(**)를 절대로 사용하지 마세요.
    4. MBTI 용어를 제외한 모든 언어는 한국어만 사용하세요.
    5. JSON 답변 내부에서 실제 줄바꿈을 하지 말고 \\n 을 사용하세요.`;

    let userQuery = `사용자 성함: ${name}, MBTI: ${mbti}, ${sajuContext}, 생년월일시: ${birthDate} ${birthTime || ''}, 성별: ${gender}`;

    try {
        const google = createGoogleGenerativeAI({
            apiKey: GEMINI_API_KEY
        });

        const result = await streamObject({
            model: google('gemini-2.5-flash'),
            schema: currentSchema,
            system: systemPrompt,
            prompt: userQuery,
        });

        // For 'core' part, we might want to include sajuResult as well.
        return result.toTextStreamResponse();
    } catch (error: any) {
        console.error(`[Streaming Error - ${part}]:`, error);
        res.status(500).json({ error: "분석 중 오류가 발생했습니다.", details: error.message });
    }
}
