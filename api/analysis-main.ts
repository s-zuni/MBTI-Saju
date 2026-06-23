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
            sajuBaseAnalysis: z.string().describe("사주 명리학 관점에서 분석한 본질적인 운명적 기운과 성향 풀이 (최소 5문장 이상 상세하게)"),
            mbtiIntegration: z.string().describe("사주 기운과 MBTI 심리 유형의 결합 분석. 타고난 사주적 본질이 MBTI 행동 양식으로 어떻게 발현되고 갈등하는지 서술 (최소 5문장 이상 상세하게)"),
            synergyPoints: z.array(z.object({
                subtitle: z.string(),
                content: z.string()
            })).describe("사주와 MBTI의 결합 시너지로 생겨나는 타고난 강점 및 일상에서의 발현 양상 2-3가지")
        }),
        lifeGuideline: z.object({
            lightAndShadow: z.object({
                light: z.string().describe("본인이 가진 성향 중 가장 밝게 빛나는 지점과 현실적 강점 (최소 4문장 이상 상세하게)"),
                shadow: z.string().describe("본인이 빠지기 쉬운 무의식적 함정, 과몰입 시 나타나는 약점과 팩폭 (최소 4문장 이상 상세하게)"),
                solution: z.string().describe("무의식적 약점을 극복하고 인생을 잘 살기 위한 핵심 극복 솔루션 (최소 4문장 이상 상세하게)")
            }),
            luckyBooster: z.object({
                luckyColor: z.string().describe("나를 보완해주는 행운의 색상과 일상 활용법"),
                luckyItem: z.string().describe("나의 기운을 끌어올려 주는 행운의 아이템"),
                luckyPlace: z.string().describe("지친 에너지를 충전할 수 있는 행운의 장소와 그 이유"),
                dailyRoutine: z.string().describe("하루의 에너지를 다스려 줄 나만의 추천 모닝/이브닝 데일리 루틴 행동")
            })
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
            sajuBaseAnalysis: z.string().describe("사주 명리학 관점에서 분석한 본질적인 운명적 기운과 성향 풀이 (최소 5문장 이상 상세하게)"),
            mbtiIntegration: z.string().describe("사주 기운과 MBTI 심리 유형의 결합 분석. 타고난 사주적 본질이 MBTI 행동 양식으로 어떻게 발현되고 갈등하는지 서술 (최소 5문장 이상 상세하게)"),
            synergyPoints: z.array(z.object({
                subtitle: z.string(),
                content: z.string()
            })).describe("사주와 MBTI의 결합 시너지로 생겨나는 타고난 강점 및 일상에서의 발현 양상 2-3가지")
        }),
        lifeGuideline: z.object({
            lightAndShadow: z.object({
                light: z.string().describe("본인이 가진 성향 중 가장 밝게 빛나는 지점과 현실적 강점 (최소 4문장 이상 상세하게)"),
                shadow: z.string().describe("본인이 빠지기 쉬운 무의식적 함정, 과몰입 시 나타나는 약점과 팩폭 (최소 4문장 이상 상세하게)"),
                solution: z.string().describe("무의식적 약점을 극복하고 인생을 잘 살기 위한 핵심 극복 솔루션 (최소 4문장 이상 상세하게)")
            }),
            luckyBooster: z.object({
                luckyColor: z.string().describe("나를 보완해주는 행운의 색상과 일상 활용법"),
                luckyItem: z.string().describe("나의 기운을 끌어올려 주는 행운의 아이템"),
                luckyPlace: z.string().describe("지친 에너지를 충전할 수 있는 행운의 장소와 그 이유"),
                dailyRoutine: z.string().describe("하루의 에너지를 다스려 줄 나만의 추천 모닝/이브닝 데일리 루틴 행동")
            })
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
    당신의 임무는 MBTI와 사주를 결합해, 사용자의 본질을 깊이 있게 파헤치는 '초밀착 소울 리포트'를 작성하는 것입니다.

    [핵심 지침 - DETAILED & DEEP]
    1. **풍성하고 디테일한 분석**: 사용자가 자신의 성향과 운명을 깊이 이해할 수 있도록, 분량을 충분히 길고 구체적으로 작성하세요. 단순한 요약이 아닌 깊이 있는 통찰을 제공해야 합니다. 특히 긴 서술형 텍스트 영역(sajuBaseAnalysis, mbtiIntegration, light, shadow, solution)은 각각 최소 5문장 이상으로 구체적인 상황을 들어 깊게 서술하세요. 토큰을 아끼지 말고 정성껏 작성하는 것이 창업자의 제1 원칙입니다.
    2. **팩트 폭격 (Punchy)**: "당신은 ~한 사람입니다."라고 단호하면서도, 왜 그런지 이유를 상세히 설명하세요.
    3. **가독성 최우선**: 분량이 많아도 읽기 편해야 합니다. 한 단락이 끝나면 반드시 줄을 바꾸거나 (\n\n), 내용을 개조식(-)으로 나열하여 가독성을 극대화하세요.
    4. **융합의 농도**: MBTI 심리와 사주 기운이 어떻게 상호작용하는지 원리와 현상을 구체적으로 녹여내세요.
    5. **감각적 어휘**: 트렌디한 어휘와 이모지를 적절히 섞어 지루할 틈을 주지 마세요.

    [섹션별 디테일 가이드]
    - **nature**: 본질을 명확히 정의하고, 성격의 입체적인 모순점과 강점을 매우 구체적인 상황 예시를 들어 상세히 짚어주세요.
    - **fiveElements**: 각 오행이 사용자 삶에 미치는 구체적인 영향과 그 기운이 만드는 '아우라'를 구체적으로 서술하세요.
    - **deepIntegration**: 
      * sajuBaseAnalysis: 사주의 천간(일간)과 지지(일지/월지) 조합이 가진 명리학적 함의와 기운의 근본적 특징을 상세히 해석하세요.
      * mbtiIntegration: 이 사주적 기운이 사용자의 MBTI 성향(특히 주기능/부기능의 심리 역동)과 만나 어떠한 시너지를 내거나 내면의 모순을 유발하는지 정교하게 교차 분석하세요.
      * synergyPoints: 융합으로 발현되는 대표적인 성격적 강점 및 일상 시너지 패턴 2-3가지를 구체적인 제목과 함께 서술하세요.
    - **lifeGuideline**:
      * lightAndShadow: 사용자의 성향이 긍정적으로 작용하는 '빛(light)'과, 스트레스 상태나 과몰입 시 무의식적으로 발현되는 '그림자(shadow - 팩폭 포함)', 그리고 이를 스스로 치유하고 성장하기 위한 '솔루션(solution)'을 각각 5문장 이상 상세하게 제시하세요.
      * luckyBooster: 오행의 과다/조화 및 라이프스타일을 바탕으로, 행운의 색상, 시그니처 아이템, 힐링 장소, 그리고 활력을 주는 데일리 루틴을 처방하세요.
    - **fieldStrategies**: (career, love, wealth) 성공 공식을 딱 한 줄로 요약하고 짧은 액션 플랜 제시.
    - **warnings**: "절대 하지 말 것"과 "정신 차려야 할 점"을 날카롭게 경고.

    [절대 규칙]
    - **강조 금지**: **(별표 두개) 및 어떠한 마크다운 강조 기호도 절대 사용 금지.**
    - 모든 분석 내용은 반드시 한국어만 사용하세요. (MBTI 용어 제외)
    - 오행(목, 화, 토, 금, 수)을 언급할 때 Wood, Fire 등의 영어는 절대로 사용하지 마세요.
    - 한국어 단어 뒤에 영어 번역을 괄호로 병기하지 마세요. (예: "목(Wood)" (X), "목(木)" (O))
    - **줄 바꿈**: 가급적 매 문장마다 \n\n을 사용하여 텍스트가 뭉쳐 보이지 않게 하세요.`;

    let userQuery = `사용자 성함: ${name}, MBTI: ${mbti}, ${sajuContext}, 생년월일시: ${birthDate} ${birthTime || ''}, 성별: ${gender}`;

    try {
        if (part === 'full' || part === 'core') {
            let lastError;
            for (let attempt = 0; attempt < 4; attempt++) {
                try {
                    const { model } = getAIProvider(attempt);
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
                    console.warn(`Attempt ${attempt + 1} failed for ${part} analysis:`, error);
                    if (!isRetryableAIError(error)) break;
                }
            }
            throw lastError;
        } else {
            // Non-streaming for fortune, strategy
            let lastError;
            for (let attempt = 0; attempt < 4; attempt++) {
                try {
                    const { model } = getAIProvider(attempt);
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
                    console.warn(`Attempt ${attempt + 1} failed for part ${part}:`, error);
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
