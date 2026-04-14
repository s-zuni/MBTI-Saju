import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText, convertToModelMessages } from 'ai';
import { calculateSaju } from './_utils/saju';
import { corsHeaders, handleCors } from './_utils/cors';
import { getAIProvider, isRetryableAIError } from './_utils/ai-provider';

export const config = {
    runtime: 'edge',
};

export default async (req: Request) => {
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { 
            status: 405, 
            headers: corsHeaders 
        });
    }

    try {
        const body = await req.json();
        const { message, mbti, birthDate, birthTime, name, gender, messages, pastContext } = body;
        // AI Key checking is now handled centrally in ai-provider.ts

        // Calculate Saju
        let sajuInfo = "Saju information not available";
        if (birthDate) {
            try {
                const saju = calculateSaju(birthDate, birthTime);
                sajuInfo = `
                - Day Master (Il-Gan): ${saju.dayMaster.korean} (${saju.dayMaster.description})
                - Five Elements: Wood ${saju.elementRatio.wood}%, Fire ${saju.elementRatio.fire}%, Earth ${saju.elementRatio.earth}%, Metal ${saju.elementRatio.metal}%, Water ${saju.elementRatio.water}%
                `;
            } catch (e) {
                console.error("Saju Calculation Error", e);
            }
        }

        const systemPrompt = `
        당신은 20년 경력의 '냉철한 사주 명리학 분석가'이자 '전문 심리분석가'입니다. 
        당신의 목표는 근거 없는 위로나 모호한 답변을 배제하고, 오직 데이터(사주와 MBTI)에 기반하여 날카롭고 객관적인 심층 상담을 제공하는 것입니다.

        **페르소나 및 어투 가이드**:
        1. **정체성**: 운명의 부호(사주)와 심리 패턴(MBTI)의 상관관계를 해독하는 전문가입니다.
        2. **톤앤매너**: 단호하고 냉정하며 객관적입니다. 현상을 있는 그대로 짚어주며, 예의를 갖추되 직설적으로 말합니다. (~해요 체를 사용하되 분석은 매우 엄격해야 합니다.)
        3. **비판적 현실 직시**: 사용자에게 단순히 좋은 말만 해주는 것이 아니라, 데이터가 가리키는 한계와 문제점을 가감 없이 지적하세요. 그 끝에 현실적인 개선책을 제시합니다.
        4. **융합 분석**: MBTI 유형과 사주 오행/일간의 특성을 반드시 하나로 엮어서 분석하세요. 
           (예: "철저한 계획형인 INTJ의 특성이 사주의 목(木) 기운 부족과 결합하여, 생각만 많고 실행력이 떨어지는 상태를 유발하고 있습니다.")

        **핵심 규칙 (절대 준수)**:
        - 사용자의 질문에 대해 최소 3~4개의 명확한 관점(예: 성격 결함, 운의 흐름, 대처 전략 등)을 포함하여 깊이 있게 분석하세요.
        - 답변의 분량은 공백 포함 800자 이상의 상세한 심층 상담이어야 합니다.
        - **마크다운 강조 금지**: 답변 어디에도 별표 두 개(**)를 절대로 사용하지 마세요. 가독성을 위해 문단 구분, 줄바꿈, 이모지(🌿, 🔥, 💧, ✨), 글머리 기호(•, 1., 2.)만 사용하세요.
        - 언어: 한국어만 사용하세요.

        **사용자 프로필**:
        - 성함: ${name || '사용자'}
        - MBTI: ${mbti || '알 수 없음'}
        - 성별: ${gender || '알 수 없음'}
        - 생년월일시: ${birthDate} ${birthTime || ''}
        
        **사주 데이터**:
        ${sajuInfo}

        ${pastContext ? `**과거 상담 이력**:
        사용자와의 이전 대화 요약입니다:
        ${pastContext}\n` : ''}
        `;


        
        const coreMessages = messages ? await convertToModelMessages(messages.slice(-10)) : [];
        if (coreMessages.length === 0 || (coreMessages[coreMessages.length - 1] as any).role !== 'user') {
            (coreMessages as any).push({ role: 'user', content: message });
        }

        try {
            let lastError;
            for (let attempt = 0; attempt < 4; attempt++) {
                try {
                    const { model, name } = getAIProvider(attempt);
                    const result = await streamText({
                        model,
                        system: systemPrompt,
                        messages: coreMessages as any,
                    });
                    return result.toTextStreamResponse({ 
                        headers: corsHeaders 
                    });
                } catch (error) {
                    lastError = error;
                    console.warn(`Attempt ${attempt + 1} (${getAIProvider(attempt).name}) failed for chat:`, error);
                    if (!isRetryableAIError(error)) break;
                }
            }
            throw lastError;
        } catch (error: any) {
    } catch (error: any) {
        console.error('ChatServer Error:', error);
        return new Response(JSON.stringify({ error: error.message || "채팅 분석 중 오류가 발생했습니다." }), { status: 500, headers: corsHeaders });
    }
};
