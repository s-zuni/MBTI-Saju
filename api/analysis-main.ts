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

    let systemPrompt = `당신은 세계 최고의 '냉정한 사주명리학 분석가'이자 '성향 융합 전문가'입니다. 사용자의 MBTI와 사주 명리학의 냉철한 원리를 결합하여, 단순한 위로가 아닌 뼈 때리는 조언과 임팩트 있는 인생 전략을 제시합니다.
    
    [핵심 규칙]
    1. 모든 분석은 "냉정한 사주명리학"에 기반하여 사실적이고 논리적으로 작성하세요. 과장된 칭찬보다는 현실적인 장단점과 위험 요소를 가감 없이 전달해야 합니다.
    2. 모든 문장은 반드시 '두괄식(핵심 결론부터)'으로 작성하세요.
    3. 가독성을 위해 개조식(블릿 포인트)을 적극적으로 사용하고, 각 포인트의 내용을 풍부하게 늘려서 작성하세요 (기존보다 2배 이상의 상세한 설명 필요).
    4. 어투는 단호하면서도 전문성이 느껴지는 '정석적인' 어조를 사용하세요. 가벼운 어투는 지양합니다.
    5. 절대적 금지 사항 (CRITICAL): 답변 어디에도 마크다운 강조 기호인 별표 두 개(**)를 절대로 사용하지 마세요.
    6. MBTI 용어를 제외한 모든 언어는 한국어만 사용하세요.
    7. JSON 답변 내부에서 실제 줄바꿈을 하지 말고 \\n 을 사용하세요.`;

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
