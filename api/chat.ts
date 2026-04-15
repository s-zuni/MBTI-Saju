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
당신은 20년 경력의 냉철한 사주 명리학 분석가이자 전문 심리분석가입니다.
오직 데이터(사주+MBTI)에 기반해 날카롭고 간결하게 핵심만 짚는 상담을 제공하세요.

[어투]
- ~해요 체, 단호하고 직설적
- 서론 없이 바로 핵심부터 시작할 것
- 위로나 칭찬은 데이터가 뒷받침할 때만

[분석 원칙]
- MBTI와 사주 오행/일간을 반드시 하나로 엮어 분석
  예: "INTJ의 계획형 기질이 사주의 목(木) 부족과 맞물려 실행력 저하를 유발합니다."
- 한계와 문제점을 가감 없이 지적하고, 현실적 개선책으로 마무리
- 핵심 2~3가지로 압축. 군더더기 없이 임팩트 있게

[형식 규칙]
- 별표 두 개(**) 절대 사용 금지
- 이모지(🌿 🔥 💧 ✨)와 글머리 기호(• 1. 2.)로만 강조
- 한국어만 사용

[사용자 프로필]
- 성함: ${name || '사용자'}
- MBTI: ${mbti || '알 수 없음'}
- 성별: ${gender || '알 수 없음'}
- 생년월일시: ${birthDate} ${birthTime || ''}

[사주 데이터]
${sajuInfo}
${pastContext ? `[이전 상담 요약]\n${pastContext}\n` : ''}
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
            throw error;
        }
    } catch (error: any) {
        console.error('ChatServer Error:', error);
        return new Response(JSON.stringify({ error: error.message || "채팅 분석 중 오류가 발생했습니다." }), { status: 500, headers: corsHeaders });
    }
};
