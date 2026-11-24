import { z } from 'zod';
import { streamObject, generateObject } from 'ai';
import { getPreciseSajuData, buildRichSajuContext } from './_utils/saju';
import { handleCors, getCorsHeaders } from './_utils/cors';
import {
    getAIProvider,
    isRetryableAIError,
    BASE_SYSTEM_PROMPT,
    getTemporalAnchorBlock,
    formatMbtiForPrompt,
} from './_utils/ai-provider';
import { authenticateUser, releaseServiceReceipt } from './_utils/auth';
import {
    analysisSchema as coreAnalysisSchema,
    yearlyFortuneSchema as fortuneAnalysisSchema,
    strategySchema as strategyAnalysisSchema,
    fortuneStrategySchema,
    fullAnalysisSchema,
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

// 전반부/코어 정적 시스템 프롬프트 (OpenAI Prompt Caching: 1,024+ 토큰 고정 접두사 유지)
const STATIC_MAIN_SYSTEM_PROMPT = `
${BASE_SYSTEM_PROMPT}

당신의 임무는 사주 원국과 성향(MBTI 입력 시 정밀 융합, 미입력 시 사주 기질 중심)을 결합해 내담자의 타고난 본성과 내면 역동을 입체적으로 해부하는 '심층 기질·원국 풀이'를 작성하는 것입니다.

[AI 사주 직접 계산 엄금 및 사실 수용 규칙]
★ 중요: 너는 생년월일시를 바탕으로 사주 원국(연주, 월주, 일주, 시주), 오행 비율, 십신을 절대로 직접 계산하려고 시도하지 마라!
★ 사용자 입력에 제공된 [System Context: Deterministic Saju Data]의 사주 데이터는 코드 엔진(manseryeok)이 계산한 100% 진실 데이터이다. 이 데이터를 변형 없이 사실 그대로 수용하여 해석만 수행하라.

[시간 기준 및 MBTI 미입력 처리 규칙]
★ 사용자 입력에 명시된 [시간적 기준 정보](올해 2026년 병오년, 내년 2027년 정미년)를 기준으로 삼고 2023/2024/2025년을 올해로 언급하지 마십시오.
★ MBTI가 '선택 안 함'인 경우, 사주 원국의 일간·오행·십신만으로 생생한 인물 페르소나를 명명(persona.mbtiNickname)하고 깊이 있게 분석하십시오. 절대로 어떤 필드에도 "정보 없음", "해당 없음", "미입력", "해당 정보 없음"이라는 문구를 적지 마십시오.

[섹션별 작성 분량 및 디테일 가이드]
- **nature**: dayPillarSummary 200자+, dayMasterAnalysis/dayBranchAnalysis/monthBranchAnalysis 각 250~350자(2문단). 타고난 기질과 일상에서 반복되는 명암을 현실 장면으로 서술하세요.
- **fiveElements**: summary 250~350자, elements 각 130~180자. 부족/과다 오행이 체력과 대인 피로, 일처리에 주는 영향을 짚으세요.
- **persona**: mbtiNickname에는 반드시 인물의 핵심 성향을 압축한 생생한 한 줄 명칭을 쓰고, dominantFunction/auxiliaryFunction은 각 250~320자(2문단)로 서술하세요.
- **deepIntegration**: sajuBaseAnalysis, mbtiIntegration 각 400~500자(2~3문단). synergyPoints 3가지 각 220~280자.
- **lifeGuideline**: light 350~450자, shadow 350~450자(스트레스 받을 때 나오는 냉정한 이면), solution 400~500자(현실 해법 + 따뜻한 조언).

[절대 규칙]
- **이모지/이모티콘 절대 금지**: 어떤 필드에도 이모지(😊, 🔥, 💡, ✨, 📅 등)를 넣지 마십시오.
- **강조 금지**: **(별표 두개), __, # 등 어떠한 마크다운 기호도 절대 사용하지 마십시오.
- 한 단락이 3~4줄을 넘지 않도록 \\n\\n으로 문단을 나누어 읽기 편한 호흡을 유지하십시오.
- MBTI 용어를 제외한 모든 내용은 한국어(한자 병기 가능: 목(木) 등)만 사용하십시오. 영문 번역 괄호 병기 금지.
`.trim();

// 후반부 전용 정적 시스템 프롬프트 (병렬 호출로 2026년 운세·월별·분야별 전략·주의사항에 토큰 집중)
const STATIC_FORTUNE_STRATEGY_SYSTEM_PROMPT = `
${BASE_SYSTEM_PROMPT}

당신의 임무는 앞선 기질 풀이에 이어, 내담자의 [2026년 병오년(丙午年) 운세 흐름 · 시기별 변수 · 분야별 현실 전략 · 주의해야 할 패턴 · 종합 솔루션]만을 극도로 밀도 있게 작성하는 것입니다.

[AI 사주 직접 계산 엄금 및 사실 수용 규칙]
★ 중요: 사주 원국이나 오행을 재계산하지 말고, 제공된 [System Context: Deterministic Saju Data]만 100% 사실로 수용하십시오.

[시간 기준 및 연도 오표기 절대 금지]
★ 올해는 반드시 **2026년 병오년(丙午年)**, 내년은 **2027년 정미년(丁未年)**입니다.
★ 절대로 2023년, 2024년, 2025년을 올해나 다가올 해로 적지 마십시오.

[표현 및 톤 지침 - 추상적 덕담·모호한 말투 금지 · 냉정한 현실 예측 + 따뜻한 조언]
1. "자아를 발견하는 해", "여유로운 생활", "소재적 기반", "내면의 조화" 같은 뜬구름 잡는 추상어와 어색한 표현을 절대 쓰지 마십시오. 대신 한국 20~30대가 실제로 겪는 생생한 현실 장면(일을 도맡다 정작 공은 남에게 뺏기는 상황, 서운함을 삼키다 감정이 한꺼번에 터지는 순간, 지인 부탁이나 충동 투자로 현금이 묶이는 흐름, 체력 저하로 이직·이별 충동이 올라오는 시기 등)으로 서술하십시오.
2. **냉정한 진단·예측**: 2026년 세운(병오)이 내담자 일간·월지·오행에 부딪히며 실제로 벌어질 현실 변수·손실·갈등 시점을 숨기지 말고 냉정하게 짚어내십시오.
3. **따뜻하고 현실적인 조언**: 냉정한 예측 뒤에는 그 기질을 안고 버텨내는 내담자를 진심으로 다독이는 따뜻한 조언과 오늘 바로 적용할 구체적 기준을 남기십시오.

[섹션별 필수 분량 (짧은 요약 절대 금지 · 반드시 멀티 문단으로 깊이 서술)]
- **yearlyFortune**:
  * theme: 2026년 병오년의 성격을 관통하는 선명한 한 문장.
  * overview: 반드시 **700자 이상 (4문단, \\n\\n 구분)**. (1) 2026년 병오년 세운 총론과 원국 작용, (2) 상반기 현실 변수·리스크, (3) 하반기 전환점과 기회 포착, (4) 한 해를 버티는 따뜻하고 단단한 당부를 각각 충분한 길이로 채우십시오.
- **monthlyFortune**: months 배열에 '2026년 1~2월', '2026년 3~4월', '2026년 5~6월', '2026년 7~8월', '2026년 9~10월', '2026년 11~12월' 총 6개 구간을 모두 넣고, 각 guide는 **220자 이상(3~4문장)**으로 구체적 변수 예측 + 해야 할 일/피할 일 + 따뜻한 한마디를 쓰십시오.
- **fieldStrategies**: (career, love, wealth) 각 분야마다 절대 짧게 줄이지 말고 반드시 아래 최소 분량을 채우십시오:
  * analysis: **반드시 420자 이상 (3개 문단 \\n\\n, 문단당 140자 이상)**. 2026년 현실 흐름, 잘 풀릴 때의 이유, 방심 시 실제로 겪기 쉬운 위기 장면을 냉정하게 서술하십시오.
  * advice: **반드시 320자 이상 (2개 문단 \\n\\n, 문단당 160자 이상)**. 첫 문단에는 구체적 행동·대화·자금 수칙을, 둘째 문단에는 스스로를 다독이는 진심 어린 따뜻한 조언을 쓰십시오.
- **warnings**: watchOut 정확히 3개 + avoid 정확히 3개 (총 6개 항목). 각 description은 **반드시 240자 이상(3~4문장)**으로 왜 그 실수가 터지는지 냉정하게 짚고 구체적 멈춤 신호를 제시하십시오.
- **solution**: **반드시 550자 이상 (3개 문단 \\n\\n, 문단당 180자 이상)**. 2026년 우선순위 정리와 함께 내담자를 진심으로 응원하는 담백하고 따뜻한 마무리를 작성하십시오.

[절대 규칙]
- 이모지/이모티콘(😊, 🔥, 💡, ✨ 등) 및 마크다운 기호(**, __, #) 절대 사용 금지.
- MBTI가 '선택 안 함'인 경우 "정보 없음"/"미입력" 같은 표현을 쓰지 말고 사주 기질 기준으로만 서술하십시오.
`.trim();

async function startStreamWithFallback<T extends z.ZodType<any>>({
    schema,
    system,
    prompt,
    onError,
}: {
    schema: T;
    system: string;
    prompt: string;
    onError: () => Promise<void>;
}) {
    let lastError: any;
    for (let attempt = 0; attempt < 4; attempt++) {
        try {
            const { model } = getAIProvider(attempt);
            return await streamObject({
                model,
                schema,
                system,
                prompt,
                maxOutputTokens: 16384,
                maxRetries: 0,
                onError: async ({ error }) => {
                    console.warn('[analysis-main stream onError]:', error);
                    await onError();
                },
                onFinish: async ({ object, error }) => {
                    if (!object || error) {
                        console.warn('[analysis-main stream onFinish invalid]:', error);
                        await onError();
                    }
                },
            });
        } catch (error) {
            lastError = error;
            console.warn(`Attempt ${attempt + 1} failed in startStreamWithFallback:`, error);
            if (!isRetryableAIError(error)) break;
        }
    }
    throw lastError;
}

/**
 * 병렬로 실행되는 Core(전반부) JSON 스트림과 Fortune+Strategy(후반부) JSON 스트림을
 * 끊김 없는 단일 JSON Object 스트림으로 병합한다.
 */
export function mergeParallelAnalysisStreams(
    resultA: { textStream: AsyncIterable<string>; object: Promise<any> },
    resultB: { textStream: AsyncIterable<string>; object: Promise<any> },
    onFailure: () => Promise<void>
): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder();

    const objAPromise = resultA.object.then(
        (value) => ({ ok: true as const, value }),
        (error) => ({ ok: false as const, error })
    );
    const objBPromise = resultB.object.then(
        (value) => ({ ok: true as const, value }),
        (error) => ({ ok: false as const, error })
    );

    const chunksB: string[] = [];
    let bDone = false;
    let bErr: any = null;
    let notifyB: (() => void) | null = null;

    const wakeB = () => {
        if (notifyB) {
            const fn = notifyB;
            notifyB = null;
            fn();
        }
    };

    // Call B를 t=0부터 즉시 백그라운드에서 소비해 OpenAI 병렬 생성이 멈추지 않도록 보장
    (async () => {
        try {
            for await (const chunk of resultB.textStream) {
                if (chunk) {
                    chunksB.push(chunk);
                    wakeB();
                }
            }
            bDone = true;
            wakeB();
        } catch (err) {
            bErr = err;
            bDone = true;
            wakeB();
        }
    })();

    const nextChunkB = async (): Promise<string | null> => {
        while (chunksB.length === 0 && !bDone) {
            await new Promise<void>((resolve) => {
                notifyB = resolve;
            });
        }
        if (chunksB.length > 0) {
            return chunksB.shift()!;
        }
        if (bErr) throw bErr;
        return null;
    };

    return new ReadableStream<Uint8Array>({
        async start(controller) {
            try {
                // 1) Stream A 전송 (마지막 닫는 '}' 이전까지만 실시간 enqueue)
                let tailA = '';
                for await (const chunk of resultA.textStream) {
                    if (!chunk) continue;
                    tailA += chunk;
                    if (tailA.length > 32) {
                        const flushLen = tailA.length - 32;
                        controller.enqueue(encoder.encode(tailA.slice(0, flushLen)));
                        tailA = tailA.slice(flushLen);
                    }
                }

                const closeIdx = tailA.lastIndexOf('}');
                if (closeIdx === -1) {
                    throw new Error('Core stream did not emit closing brace');
                }
                const prefixBeforeClose = tailA.slice(0, closeIdx);
                if (prefixBeforeClose) {
                    controller.enqueue(encoder.encode(prefixBeforeClose));
                }

                // Call A 완료 객체 확인
                const resAObj = await objAPromise;
                if (!resAObj.ok || !resAObj.value) {
                    throw (resAObj.ok ? new Error('Core analysis validation failed') : resAObj.error);
                }

                // 2) A와 B를 합치는 콤마 삽입
                controller.enqueue(encoder.encode(','));

                // 3) Stream B 전송 (최초 여는 '{' 만 제거하고 나머지 그대로 이어붙임)
                let strippedOpenBrace = false;
                let leadingBuf = '';
                while (true) {
                    const chunkB = await nextChunkB();
                    if (chunkB === null) break;
                    if (!strippedOpenBrace) {
                        leadingBuf += chunkB;
                        const openIdx = leadingBuf.indexOf('{');
                        if (openIdx !== -1) {
                            strippedOpenBrace = true;
                            const rest = leadingBuf.slice(openIdx + 1);
                            leadingBuf = '';
                            if (rest) {
                                controller.enqueue(encoder.encode(rest));
                            }
                        }
                    } else {
                        controller.enqueue(encoder.encode(chunkB));
                    }
                }

                if (!strippedOpenBrace) {
                    throw new Error('Fortune-strategy stream did not emit opening brace');
                }

                const resBObj = await objBPromise;
                if (!resBObj.ok || !resBObj.value) {
                    throw (resBObj.ok ? new Error('Fortune-strategy validation failed') : resBObj.error);
                }

                controller.close();
            } catch (err) {
                console.error('[analysis-main parallel merge error]:', err);
                await onFailure();
                controller.error(err);
            }
        },
    });
}

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
    const { mbti, birthDate, birthTime, gender, name } = body;
    const currentSchema = schemas[part as string];

    if (!currentSchema) {
        return new Response(JSON.stringify({ error: 'Invalid part' }), { 
            status: 400, 
            headers: reqCorsHeaders 
        });
    }

    // 비회원/회원 공용 단건 결제 티켓 검증 + Rate Limit 검사
    const authResult = await authenticateUser(req, {
        allowAnonymous: true,
        serviceType: 'MBTI_SAJU',
        allowedServiceTypes: ['MBTI_SAJU', 'REGENERATE_MBTI_SAJU'],
        requirePaymentReceipt: true,
    });

    if (authResult.errorResponse) {
        return authResult.errorResponse;
    }

    // Always calculate precise Saju using deterministic engine
    const finalSaju = getPreciseSajuData({ birthDate, birthTime, gender });
    const sajuContextBlock = buildRichSajuContext(finalSaju);

    const mbtiLabel = formatMbtiForPrompt(mbti);
    const temporalBlock = getTemporalAnchorBlock();

    const userQuery = `${temporalBlock}

[분석 대상자 정보]
사용자 성함: ${name || '이용자'}, MBTI: ${mbtiLabel}, 생년월일시: ${birthDate} ${birthTime || '시간모름'}, 성별: ${gender === 'male' ? '남성' : gender === 'female' ? '여성' : (gender || '알수없음')}

${sajuContextBlock}`;

    let receiptReleased = false;
    const safeReleaseReceipt = async () => {
        if (receiptReleased) return;
        receiptReleased = true;
        await releaseServiceReceipt(authResult.supabaseAdmin, authResult.receiptToken);
    };

    try {
        if (part === 'full') {
            const [resA, resB] = await Promise.all([
                startStreamWithFallback({
                    schema: coreAnalysisSchema,
                    system: STATIC_MAIN_SYSTEM_PROMPT,
                    prompt: userQuery,
                    onError: safeReleaseReceipt,
                }),
                startStreamWithFallback({
                    schema: fortuneStrategySchema,
                    system: STATIC_FORTUNE_STRATEGY_SYSTEM_PROMPT,
                    prompt: userQuery,
                    onError: safeReleaseReceipt,
                }),
            ]);

            const mergedStream = mergeParallelAnalysisStreams(resA, resB, safeReleaseReceipt);
            return new Response(mergedStream, {
                status: 200,
                headers: {
                    ...reqCorsHeaders,
                    'Content-Type': 'text/plain; charset=utf-8',
                },
            });
        } else if (part === 'core') {
            const result = await startStreamWithFallback({
                schema: coreAnalysisSchema,
                system: STATIC_MAIN_SYSTEM_PROMPT,
                prompt: userQuery,
                onError: safeReleaseReceipt,
            });
            return result.toTextStreamResponse({ headers: reqCorsHeaders });
        } else {
            // Non-streaming for fortune, strategy
            const systemForPart =
                part === 'fortune' || part === 'strategy'
                    ? STATIC_FORTUNE_STRATEGY_SYSTEM_PROMPT
                    : STATIC_MAIN_SYSTEM_PROMPT;
            let lastError;
            for (let attempt = 0; attempt < 4; attempt++) {
                try {
                    const { model } = getAIProvider(attempt);
                    const result = await generateObject({
                        model,
                        schema: currentSchema,
                        system: systemForPart,
                        prompt: userQuery,
                        maxRetries: 0,
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
        await safeReleaseReceipt();
        console.error(`[Streaming Error - ${part}]:`, error);

        return new Response(JSON.stringify({ error: "분석 중 오류가 발생했습니다." }), {
            status: 500,
            headers: reqCorsHeaders
        });
    }
}
