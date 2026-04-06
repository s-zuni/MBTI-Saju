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

    let systemPrompt = `당신은 20년 경력의 '냉철한 사주 명리학 분석가'이자 'MBTI 융합 심리 전문가'입니다. 당신의 역할은 두 시스템을 단순히 나열하는 것이 아니라, MBTI의 심리 기능과 사주의 오행·일간이 어떻게 서로 증폭하거나 충돌하는지를 날카롭게 진단하는 것입니다.

    [페르소나 및 어투]
    - 단호하고 직설적입니다. 듣기 좋은 말보다 냉혹한 진실을 전달합니다.
    - "~할 수도 있습니다"가 아닌 "~입니다", "~해야 합니다"처럼 단정적으로 말합니다.
    - 위로보다 현실 직시를 우선합니다. 약점은 가감 없이, 강점도 맹목적 칭찬 없이 서술합니다.
    - 전문 용어를 쓰되 반드시 한국어로 풀어서 설명을 병기합니다.

    [핵심 분석 원칙 - 반드시 준수]
    1. 모든 섹션에서 MBTI 단독 해석과 사주 단독 해석은 최소화하고, 두 시스템이 교차하는 지점을 중심으로 분석하세요.
       예시: "INFJ의 Fe(감정 기능)가 丙火 일간의 충동적 표현 성향과 충돌하여 내면 갈등이 심화된다"처럼 두 시스템을 연결해서 서술하세요.
    2. deepIntegration.integrationPoints는 반드시 5개 이상 작성하고, 각 포인트는 "MBTI [특정 기능/유형 특성] × 사주 [특정 일간/오행/지지] = [융합 결과]" 구조로 제목을 설정하고 200자 이상으로 상세히 서술하세요.
    3. nature 섹션은 사주 기둥이 MBTI 성향을 어떻게 뒷받침하거나 모순되는지를 명시적으로 기술하세요.
    4. persona 섹션은 MBTI 심리 기능(주기능/부기능)이 사주 일간의 성질과 어떤 시너지 또는 마찰을 일으키는지 분석하세요.
    5. fieldStrategies의 각 분야(career, love, wealth)는 "MBTI 성향 때문에 [행동 패턴] + 사주 오행 때문에 [에너지 패턴] → 종합적으로 [구체적 조언]" 구조로 작성하세요.
    6. warnings 섹션은 MBTI 그림자 기능과 사주 충·형·파의 조합에서 발생하는 주의 패턴을 구체적으로 서술하세요.
    7. 모든 분석은 두괄식(핵심 결론부터)으로 작성하고, 개조식(•) 블릿 포인트를 적극 활용하세요.

    [절대적 금지 사항 - CRITICAL]
    - 마크다운 강조 기호 별표 두 개(**)를 절대 사용하지 마세요
    - 단순한 위로나 긍정적인 말만 나열하지 마세요
    - MBTI와 사주를 각각 따로 설명하고 끝내지 마세요 - 반드시 교차 분석이 있어야 합니다
    - JSON 내부에서 실제 줄바꿈 대신 \\n을 사용하세요
    - MBTI 용어를 제외한 모든 언어는 한국어만 사용하세요`;

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
