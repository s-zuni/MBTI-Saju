import { streamObject } from 'ai';
import { corsHeaders, handleCors, getCorsHeaders } from './_utils/cors';
import {
    getAIProvider,
    isRetryableAIError,
    BASE_SYSTEM_PROMPT,
    getTemporalAnchorBlock,
    formatMbtiForPrompt,
} from './_utils/ai-provider';
import { authenticateUser, releaseServiceReceipt } from './_utils/auth';
import { tarotSchema } from '../src/config/schemas';

export const config = {
    runtime: 'edge',
};

// 정적 시스템 프롬프트 (OpenAI Prompt Caching 최적화)
const STATIC_TAROT_SYSTEM_PROMPT = `
${BASE_SYSTEM_PROMPT}

당신은 뽑힌 타로 카드의 상징과 내담자의 질문·생년월일·성향을 연결해 현실적이고 냉정한 상황 진단과 따뜻한 조언을 함께 전하는 타로 전략가입니다.

[작성 원칙]
- 사용자 입력의 [시간적 기준 정보](올해 2026년 병오년, 내년 2027년 정미년)를 기준으로 시기를 해석하고, 2023/2024/2025년을 올해로 적지 마십시오.
- 분량 확대: cardReadings 각 카드별 interpretation은 반드시 350~500자(2~3문단 \\n\\n), overallReading은 600~800자(3~4문단 \\n\\n), advice는 350~450자(2~3문단 \\n\\n)로 깊이 있게 작성하십시오.
- 톤앤매너: 카드가 가리키는 변수는 현실적이고 냉정하게 짚어주고, 마무리는 마음을 다독이는 따뜻하고 실행 가능한 조언으로 전하십시오.
- 언어: 한국어만 사용하십시오.
- 절대 준수: 답변 어디에도 마크다운 강조 기호(** , __, #)와 이모티콘/이모지를 절대 사용하지 마십시오. 문단 줄바꿈(\\n\\n)과 글머리표(-)만 사용하십시오.
`.trim();

export default async (req: Request) => {
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    const reqCorsHeaders = getCorsHeaders(req);

    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { 
            status: 405, 
            headers: reqCorsHeaders 
        });
    }

    // 신비타로 단건 결제 티켓 검증 및 Rate Limit
    const authResult = await authenticateUser(req, {
        serviceType: 'TAROT',
        allowedServiceTypes: ['TAROT'],
        requirePaymentReceipt: true,
        allowAnonymous: true,
    });

    if (authResult.errorResponse) {
        return authResult.errorResponse;
    }

    try {
        const body = await req.json();
        const { question, selectedCards, spreadType, userContext } = body;
        // AI Key checking is now handled centrally in ai-provider.ts

        let spreadContext = "";
        let positionDescriptions: string[] = [];

        switch (spreadType) {
            case 'daily':
                spreadContext = "User is asking for daily guidance (One Card Reading). Focus on the energy of the day and a key actionable advice.";
                positionDescriptions = ["Daily Advice"];
                break;
            case 'love':
                spreadContext = "User is asking about love/relationships (3 Card Spread). Interpret as: 1. User's Feelings/Position, 2. Partner's Feelings/Current Energy, 3. Future Outlook/Advice.";
                positionDescriptions = ["User's Feelings", "Partner's Feelings", "Future/Advice"];
                break;
            case 'career':
                spreadContext = "User is asking about career/work (3 Card Spread). Interpret as: 1. Current Situation, 2. Challenge/Obstacle, 3. Solution/Outcome.";
                positionDescriptions = ["Current Situation", "Challenge", "Solution/Outcome"];
                break;
            case 'celtic':
                spreadContext = "User is requesting a Celtic Cross Reading (10 Cards). Provide a deep, comprehensive analysis covering present, immediate challenge, distant past, recent past, best outcome, immediate future, internal feelings, external influences, hopes/fears, and final outcome.";
                positionDescriptions = [
                    "Present", "Challenge", "Distant Past", "Recent Past",
                    "Best Outcome", "Immediate Future", "Internal Feelings",
                    "External Influences", "Hopes/Fears", "Final Outcome"
                ];
                break;
            default: // basic 3 card fallback
                spreadContext = "User is asking a general question (3 Card Spread). Interpret as Past, Present, and Future.";
                positionDescriptions = ["Past/Situation", "Present/Action", "Future/Result"];
        }

        let personalization = "";
        if (userContext) {
            if (userContext.name) personalization += `내담자 이름: ${userContext.name}님. `;
            personalization += `MBTI: ${formatMbtiForPrompt(userContext.mbti)}. `;
            if (userContext.birthDate) personalization += `생년월일: ${userContext.birthDate}. `;
        }

        let cardsList = "";
        selectedCards.forEach((card: any, idx: number) => {
            const position = positionDescriptions[idx] || `Position ${idx + 1}`;
            cardsList += `${idx + 1}. [${position}]: ${card.name} (${card.name_ko})\n`;
        });

        const userQuery = `
        ${getTemporalAnchorBlock()}

        Spread Mode: ${spreadContext}
        Personalization Context: ${personalization}
        Question: "${question}"
        Spread Type: ${spreadType}
        Selected Cards:
        ${cardsList}
        `;

        let receiptReleased = false;
        const safeReleaseReceipt = async () => {
            if (receiptReleased) return;
            receiptReleased = true;
            await releaseServiceReceipt(authResult.supabaseAdmin, authResult.receiptToken);
        };

        try {
            let lastError;
            for (let attempt = 0; attempt < 4; attempt++) {
                try {
                    const { model } = getAIProvider(attempt);
                    const result = await streamObject({
                        model,
                        schema: tarotSchema,
                        system: STATIC_TAROT_SYSTEM_PROMPT,
                        prompt: userQuery,
                        maxOutputTokens: 16384,
                        maxRetries: 0, // Faster switching
                        onError: async () => { await safeReleaseReceipt(); },
                        onFinish: async ({ object, error }) => {
                            if (!object || error) await safeReleaseReceipt();
                        },
                    });
                    return result.toTextStreamResponse({ headers: reqCorsHeaders });
                } catch (error) {
                    lastError = error;
                    console.warn(`Attempt ${attempt + 1} (${getAIProvider(attempt).name}) failed for tarot:`, error);
                    if (!isRetryableAIError(error)) break;
                }
            }
            throw lastError;
        } catch (error: any) {
            await releaseServiceReceipt(authResult.supabaseAdmin, authResult.receiptToken);
            console.error("Tarot API Error:", error);
            return new Response(JSON.stringify({ error: '타로 해석 중 오류가 발생했습니다.' }), { 
                status: 500, 
                headers: reqCorsHeaders 
            });
        }
    } catch (error: any) {
        await releaseServiceReceipt(authResult.supabaseAdmin, authResult.receiptToken);
        console.error("Tarot API Error:", error);
        return new Response(JSON.stringify({ error: '타로 해석 중 오류가 발생했습니다.' }), { 
            status: 500, 
            headers: reqCorsHeaders 
        });
    }
};
