import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamObject, generateObject } from 'ai';
import { z } from 'zod';
import { calculateSaju } from './_utils/saju';
import { corsHeaders, handleCors } from './_utils/cors';
import { getAIProvider, isRetryableAIError } from './_utils/ai-provider';

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

    // API Key checking is now handled centrally in ai-provider.ts
    // but we can add a quick guard here if needed.

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

    const sajuContext = `사주 원국: ${finalSaju.ganZhi.year} ${finalSaju.ganZhi.month} ${finalSaju.ganZhi.day} ${finalSaju.ganZhi.hour} (일간: ${finalSaju.dayMaster.korean})`;

    let systemPrompt = `당신은 MZ세대의 영혼을 꿰뚫는 '힙한 운명 분석가'이자 '팩폭 명리학자'입니다. 
    당신의 임무는 MBTI와 사주를 결합해, 사용자의 본질을 단숨에 파악하는 '초밀착 소울 리포트'를 작성하는 것입니다.

    [핵심 지침 - SHORT & STRONG]
    1. **극강의 간결함**: 미사여구는 다 쳐내고 핵심만 굵고 짧게 찌르세요. 설명보다 진단이 중요합니다.
    2. **팩트 폭격 (Punchy)**: "당신은 ~한 사람입니다. 당장 ~하세요"라고 단호하게 말하세요.
    3. **융합의 농도**: MBTI 심리와 사주 기운을 한 문장에 녹이세요. (예: "엔팁의 넘치는 호기심이 사주의 화(火) 기운과 만나 제어 불가능한 불나방이 되었습니다.")
    4. **감각적 어휘**: 트렌디한 어휘와 이모지를 적절히 섞어 지루할 틈을 주지 마세요.

    [섹션별 압축 가이드]
    - **nature**: 본질을 한 줄로 정의하고, 입체적인 모순점을 날카롭게 짚으세요.
    - **fiveElements**: 수치적 분석보다 그 기운이 만드는 '아우라' 중심으로 1-2문장 요약.
    - **deepIntegration**: 제목은 "[키워드] 시너지" 형식. 각 포인트는 100자 내외의 강렬한 인사이트만 제공.
    - **fieldStrategies**: (career, love, wealth) 성공 공식을 딱 한 줄로 요약하고 짧은 액션 플랜 제시.
    - **warnings**: "절대 하지 말 것"과 "정신 차려야 할 점"을 날카롭게 경고.

    [절대 규칙]
    - **강조 금지**: **(별표 두개) 및 어떠한 마크다운 강조 기호도 절대 사용 금지.**
    - 한국어로 작성하되, MBTI 용어는 그대로 사용.
    - 텍스트 생성 속도를 위해 전체 답변 양을 평소보다 30% 줄여 압도적인 밀도를 만드세요.`;

    let userQuery = `사용자 성함: ${name}, MBTI: ${mbti}, ${sajuContext}, 생년월일시: ${birthDate} ${birthTime || ''}, 성별: ${gender}`;

    try {
        if (part === 'full') {
            let lastError;
            for (let attempt = 0; attempt < 4; attempt++) {
                try {
                    const { model, name } = getAIProvider(attempt);
                    const result = await streamObject({
                        model,
                        schema: currentSchema,
                        system: systemPrompt,
                        prompt: userQuery,
                        maxRetries: 0, // Faster fallback
                    });
                    return result.toTextStreamResponse({ headers: corsHeaders });
                } catch (error) {
                    lastError = error;
                    console.warn(`Attempt ${attempt + 1} (${getAIProvider(attempt).name}) failed for full analysis:`, error);
                    if (!isRetryableAIError(error)) break;
                }
            }
            throw lastError;
        } else {
            // Non-streaming for core, fortune, strategy
            let lastError;
            for (let attempt = 0; attempt < 4; attempt++) {
                try {
                    const { model, name } = getAIProvider(attempt);
                    const result = await generateObject({
                        model,
                        schema: currentSchema,
                        system: systemPrompt,
                        prompt: userQuery,
                        maxRetries: 0, // Faster fallback
                    });
                    return new Response(JSON.stringify({ ...(result.object as any), saju: finalSaju }), { 
                        status: 200,
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
                    });
                } catch (error) {
                    lastError = error;
                    console.warn(`Attempt ${attempt + 1} (${getAIProvider(attempt).name}) failed for part ${part}:`, error);
                    if (!isRetryableAIError(error)) break;
                }
            }
            throw lastError;
        }
    } catch (error: any) {
        console.error(`[Streaming Error - ${part}]:`, error);
        return new Response(JSON.stringify({ error: "분석 중 오류가 발생했습니다.", details: error.message }), { 
            status: 500, 
            headers: corsHeaders 
        });
    }
}
