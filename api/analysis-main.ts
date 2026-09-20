import { z } from 'zod';
import { streamObject, generateObject } from 'ai';
import { getPreciseSajuData, buildRichSajuContext } from './_utils/saju';
import { corsHeaders, handleCors, getCorsHeaders } from './_utils/cors';
import { getAIProvider, isRetryableAIError, BASE_SYSTEM_PROMPT } from './_utils/ai-provider';
import { authenticateUser } from './_utils/auth';
import { 
    analysisSchema as coreAnalysisSchema, 
    yearlyFortuneSchema as fortuneAnalysisSchema, 
    strategySchema as strategyAnalysisSchema, 
    fullAnalysisSchema 
} from '../src/config/schemas';

export const config = {
    runtime: 'edge',
};

const schemas: Record<string, z.ZodType<any>> = {
    core: coreAnalysisSchema,
    fortune: fortuneAnalysisSchema,
    strategy: strategyAnalysisSchema,
    full: fullAnalysisSchema,
};

// 정적 시스템 프롬프트 (OpenAI Prompt Caching: 1,024+ 토큰 고정 접두사 유지)
const STATIC_MAIN_SYSTEM_PROMPT = `
${BASE_SYSTEM_PROMPT}

당신의 임무는 MBTI와 사주를 결합해, 사용자의 본질을 깊이 있게 파헤치는 '초밀착 소울 리포트'를 작성하는 것입니다.

[AI 사주 직접 계산 엄금 및 사실 수용 규칙]
★ 중요: 너는 생년월일시를 바탕으로 사주 원국(연주, 월주, 일주, 시주), 오행 비율, 십신을 절대로 직접 계산하려고 시도하지 마라!
★ 사용자 입력에 제공된 [System Context: Deterministic Saju Data]의 사주 데이터는 코드 엔진(manseryeok)이 계산한 100% 진실 데이터이다. 이 데이터를 변형 없이 사실 그대로 수용하여 MBTI와 융합된 해석만 수행하라.

[핵심 지침 - DETAILED & DEEP]
1. **풍성하고 디테일한 분석**: 사용자가 자신의 성향과 운명을 깊이 이해할 수 있도록, 분량을 충분히 길고 구체적으로 작성하세요. 단순한 요약이 아닌 깊이 있는 통찰을 제공해야 합니다. 특히 긴 서술형 텍스트 영역(sajuBaseAnalysis, mbtiIntegration, light, shadow, solution)은 각각 최소 5문장 이상으로 구체적인 상황을 들어 깊게 서술하세요. 토큰을 아끼지 말고 정성껏 작성하는 것이 창업자의 제1 원칙입니다.
2. **팩트 중심 및 날카로운 전략 (Punchy)**: 사주의 기운은 날씨처럼 담담한 팩트로 분석하고, 조언은 MBTI 성향에 맞춘 현실적 행동 지침으로 제시하세요.
3. **가독성 최우선**: 분량이 많아도 읽기 편해야 합니다. 한 단락이 끝나면 반드시 줄을 바꾸거나 (\n\n), 내용을 개조식(-)으로 나열하여 가독성을 극대화하세요.
4. **융합의 농도**: MBTI 심리와 사주 기운이 어떻게 상호작용하는지 원리와 현상을 구체적으로 녹여내세요.

[섹션별 디테일 가이드]
- **nature**: 본질을 명확히 정의하고, 성격의 입체적인 모순점과 강점을 매우 구체적인 상황 예시를 들어 상세히 짚어주세요.
- **fiveElements**: 각 오행이 사용자 삶에 미치는 구체적인 영향과 그 기운이 만드는 '아우라'를 구체적으로 서술하세요.
- **deepIntegration**: 
  * sajuBaseAnalysis: 사주의 천간(일간)과 지지(일지/월지) 조합이 가진 명리학적 함의와 기운의 근본적 특징을 상세히 해석하세요.
  * mbtiIntegration: 이 사주적 기운이 사용자의 MBTI 성향(특히 주기능/부기능의 심리 역동)과 만나 어떠한 시너지를 내거나 내면의 모순을 유발하는지 정교하게 교차 분석하세요.
  * synergyPoints: 융합으로 발현되는 대표적인 성격적 강점 및 일상 시너지 패턴 2-3가지를 구체적인 제목과 함께 서술하세요.
- **lifeGuideline**:
  * lightAndShadow: 사용자의 성향이 긍정적으로 작용하는 '빛(light)'과, 스트레스 상태나 과몰입 시 무의식적으로 발현되는 '그림자(shadow)', 그리고 이를 스스로 치유하고 성장하기 위한 '솔루션(solution)'을 각각 5문장 이상 상세하게 제시하세요.
  * luckyBooster: 오행의 과다/조화 및 라이프스타일을 바탕으로, 행운의 색상, 시그니처 아이템, 힐링 장소, 그리고 활력을 주는 데일리 루틴을 처방하세요.
- **fieldStrategies**: (career, love, wealth) 성공 공식을 딱 한 줄로 요약하고 짧은 액션 플랜 제시.
- **warnings**: "절대 하지 말 것"과 "정신 차려야 할 점"을 날카롭게 경고.

[절대 규칙]
- **강조 금지**: **(별표 두개) 및 어떠한 마크다운 강조 기호도 절대 사용 금지.**
- 모든 분석 내용은 반드시 한국어만 사용하세요. (MBTI 용어 제외)
- 오행(목, 화, 토, 금, 수)을 언급할 때 Wood, Fire 등의 영어는 절대로 사용하지 마세요.
- 한국어 단어 뒤에 영어 번역을 괄호로 병기하지 마세요. (예: "목(Wood)" (X), "목(木)" (O))
- **줄 바꿈**: 가급적 매 문장마다 \n\n을 사용하여 텍스트가 뭉쳐 보이지 않게 하세요.
`.trim();

export default async function handler(req: Request) {
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    const reqCorsHeaders = getCorsHeaders(req);

    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { 
            status: 405, 
            headers: reqCorsHeaders 
        });
    }

    const url = new URL(req.url, 'http://localhost');
    const body = await req.json();
    const part = url.searchParams.get('part') || body?.part || 'core';
    const { mbti, birthDate, birthTime, gender, name, sajuData, isRegenerate } = body;
    const currentSchema = schemas[part as string];

    if (!currentSchema) {
        return new Response(JSON.stringify({ error: 'Invalid part' }), { 
            status: 400, 
            headers: reqCorsHeaders 
        });
    }

    // 인증 및 크레딧 차감 (메인 분석: 20C, 재분석: 10C)
    // part가 'full' 또는 'core'일 때만 크레딧 차감 (fortune, strategy는 후속 단계)
    const shouldDeduct = part === 'full' || part === 'core';
    const serviceType = isRegenerate ? 'REGENERATE_MBTI_SAJU' : 'MBTI_SAJU';
    const authResult = await authenticateUser(req, {
        serviceType: shouldDeduct ? serviceType : undefined,
        cost: shouldDeduct ? undefined : 0
    });

    if (authResult.errorResponse) {
        return authResult.errorResponse;
    }

    // Always calculate precise Saju using deterministic engine
    const finalSaju = getPreciseSajuData({ birthDate, birthTime, gender });
    const sajuContextBlock = buildRichSajuContext(finalSaju);

    const userQuery = `[분석 대상자 정보]
사용자 성함: ${name}, MBTI: ${mbti}, 생년월일시: ${birthDate} ${birthTime || ''}, 성별: ${gender || '알수없음'}

${sajuContextBlock}`;

    try {
        if (part === 'full' || part === 'core') {
            let lastError;
            for (let attempt = 0; attempt < 4; attempt++) {
                try {
                    const { model } = getAIProvider(attempt);
                    const result = await streamObject({
                        model,
                        schema: currentSchema,
                        system: STATIC_MAIN_SYSTEM_PROMPT,
                        prompt: userQuery,
                        maxOutputTokens: 16384,
                        maxRetries: 0, // Faster fallback
                    });
                    return result.toTextStreamResponse({ headers: reqCorsHeaders });
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
                        system: STATIC_MAIN_SYSTEM_PROMPT,
                        prompt: userQuery,
                        maxRetries: 0, // Faster fallback
                    });
                    return new Response(JSON.stringify({ ...(result.object as any), saju: finalSaju }), { 
                        status: 200,
                        headers: { ...reqCorsHeaders, 'Content-Type': 'application/json' } 
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
            headers: reqCorsHeaders 
        });
    }
}
