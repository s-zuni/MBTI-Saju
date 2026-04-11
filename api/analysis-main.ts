import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamObject, generateObject } from 'ai';
import { z } from 'zod';
import { calculateSaju } from './_utils/saju';
import { corsHeaders, handleCors } from './_utils/cors';

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
            summary: z.string().describe("오행의 조화와 특징에 대한 감각적인 요약 (2-3문장)"),
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
    }),
    full: z.object({
        // Core Part
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
            summary: z.string().describe("오행의 조화와 특징에 대한 감각적인 요약 (2-3문장)"),
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
        }),
        // Fortune Part
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
        }),
        // Strategy Part
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
    runtime: 'edge',
};

export default async function handler(req: Request) {
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { 
            status: 405, 
            headers: corsHeaders 
        });
    }

    const url = new URL(req.url, 'http://localhost');
    const body = await req.json();
    const part = url.searchParams.get('part') || body.part;
    const { mbti, birthDate, birthTime, gender, name, sajuData } = body;
    const currentSchema = schemas[part as string];

    if (!currentSchema) {
        return new Response(JSON.stringify({ error: 'Invalid part' }), { 
            status: 400, 
            headers: corsHeaders 
        });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.REACT_APP_GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!GEMINI_API_KEY) {
        return new Response(JSON.stringify({ error: 'Missing API Key' }), { 
            status: 500, 
            headers: corsHeaders 
        });
    }

    // Use client-provided sajuData or calculate on server as fallback
    let finalSaju = sajuData;
    if (!finalSaju && birthDate) {
        finalSaju = calculateSaju(birthDate, birthTime);
    }

    if (!finalSaju) {
        return new Response(JSON.stringify({ error: 'Saju data missing' }), { 
            status: 400, 
            headers: corsHeaders 
        });
    }

    const sajuContext = `사주 원국: ${finalSaju.ganZhi.year} ${finalSaju.ganZhi.month} ${finalSaju.ganZhi.day} ${finalSaju.ganZhi.hour} (일간: ${finalSaju.dayMaster.korean} / 성질: ${finalSaju.dayMaster.description})`;

    let systemPrompt = `당신은 20년 경력의 '냉철한 심리분석가'이자 '사주 명리학 권위자'입니다. 
    당신의 임무는 사용자의 MBTI와 사주 데이터를 결합하여, 단순한 위로가 아닌 냉혹할 정도로 정확하고 객관적인 '융합 진단'을 내리는 것입니다.

    [페르소나 및 핵심 지침]
    1. **단호한 전문가**: "그럴 수도 있다"는 식의 모호한 표현은 절대 금지입니다. "~입니다", "~해야만 합니다"와 같이 단정적이고 권위 있는 어조를 유지하세요.
    2. **냉정한 분석**: 사용자의 약점이나 운명적 결함을 숨기지 말고 직설적으로 지적하세요. 이는 비난이 아닌, 성장을 위한 정확한 진단입니다.
    3. **융합 분석의 압도적 비중 (최우선)**: MBTI 단독 설명이나 사주 단독 설명은 전체의 20% 이내로 제한하세요. 나머지 80%는 반드시 두 시스템이 유기적으로 결합된 분석이어야 합니다.
       - 예: "ISTJ의 극단적 완벽주의가 사주의 편관(偏官)과 만나 스스로를 옥죄는 감옥을 만들고 있습니다." (O)
       - 예: "ISTJ는 계획적입니다. 사주에 금(金)이 많네요." (X - 단순 나열 금지)

    [섹션별 세부 지침]
    - **nature**: 사주 일주와 MBTI 유형이 심리적으로 어떻게 충돌하거나 보완되는지 심층 분석하세요.
    - **persona**: 주기능/부기능이 사주 오행의 기운과 결합하여 나타나는 실제 행동 양식을 진단하세요.
    - **persona**: 주기능/부기능이 사주 오행의 기운과 결합하여 나타나는 실제 행동 양식을 진단하세요.
    - **deepIntegration**: 반드시 5개 이상의 융합 포인트를 생성하세요. 제목은 "[MBTI 특성] x [사주 요소] = [융합 진단]" 형식을 유지하고, 각 포인트마다 핵심 위주로 150~200자 내외의 상세한 분석을 제공하세요.
    - **fieldStrategies**: (career, love, wealth) 각 분야에서 사용자의 기질이 운의 흐름과 만나 어떤 결과를 초래할지, 구체적이고 단호한 전략을 제시하세요.
    - **warnings**: 사용자가 가장 조심해야 할 '운명적 함정'을 MBTI 그림자 기능과 사주의 살(殺) 또는 충(沖)을 엮어서 경고하세요.

    [절대 규칙 - CRITICAL]
    - **마크다운 강조 금지**: 답변 어디에도 별표 두 개(**)를 절대 사용하지 마세요. 에러의 원인이 됩니다.
    - 줄바꿈, 이모지, 글머리 기호만 사용하여 가독성을 확보하세요.
    - 한국어로만 작성하세요. (MBTI 용어 제외)`;

    let userQuery = `사용자 성함: ${name}, MBTI: ${mbti}, ${sajuContext}, 생년월일시: ${birthDate} ${birthTime || ''}, 성별: ${gender}`;

    const google = createGoogleGenerativeAI({
        apiKey: GEMINI_API_KEY
    });

    try {
        const geminiModel = google('gemini-3.1-flash-lite-preview');
        const fallbackModel = google('gemini-2.5-flash');

        if (part === 'full') {
            let result;
            try {
                // Primary: 3.1 Flash Lite
                result = await streamObject({
                    model: geminiModel,
                    schema: currentSchema,
                    system: systemPrompt,
                    prompt: userQuery,
                });
            } catch (error) {
                console.warn(`Primary model failed for streaming part ${part}, falling back:`, error);
                // Fallback: 2.5 Flash
                result = await streamObject({
                    model: fallbackModel,
                    schema: currentSchema,
                    system: systemPrompt,
                    prompt: userQuery,
                });
            }
            return result.toTextStreamResponse({ headers: corsHeaders });
        } else {
            // Non-streaming for core, fortune, strategy
            let result;
            try {
                result = await generateObject({
                    model: geminiModel,
                    schema: currentSchema,
                    system: systemPrompt,
                    prompt: userQuery,
                });
            } catch (error) {
                console.warn(`Primary model failed for part ${part}, falling back:`, error);
                result = await generateObject({
                    model: fallbackModel,
                    schema: currentSchema,
                    system: systemPrompt,
                    prompt: userQuery,
                });
            }
            return new Response(JSON.stringify({ ...(result.object as any), saju: finalSaju }), { 
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            });
        }
    } catch (error: any) {
        console.error(`[Streaming Error - ${part}]:`, error);
        return new Response(JSON.stringify({ error: "분석 중 오류가 발생했습니다.", details: error.message }), { 
            status: 500, 
            headers: corsHeaders 
        });
    }
}
