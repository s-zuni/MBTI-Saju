import { streamText } from 'ai';
import { calculateSaju } from './_utils/saju';
import { corsHeaders, handleCors } from './_utils/cors';
import { getAIProvider, isRetryableAIError } from './_utils/ai-provider';

export const config = {
    // Edge runtime doesn't have maxDuration limit for streaming
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

    try {
        const body = await req.json();
        const { mbti, birthInfo, name, reportType, specialRequest } = body;
        
        let birthDate = '';
        let birthTime = '';
        if (birthInfo) {
            const parts = birthInfo.split(' ');
            birthDate = parts[0];
            birthTime = parts[1] || '12:00';
        }

        let finalSaju = calculateSaju(birthDate, birthTime);
        const sajuContext = finalSaju ? `사주 원국: ${finalSaju.ganZhi.year} ${finalSaju.ganZhi.month} ${finalSaju.ganZhi.day} ${finalSaju.ganZhi.hour} (일간: ${finalSaju.dayMaster.korean})` : '(사주 정보 계산 불가)';

        const systemPrompt = `당신은 10년 이상의 경력을 가진 수석 운명 분석가이자 심리학 관점의 명리학 전문가입니다.
사용자의 MBTI, 사주 원국 정보, 특별 요청사항을 바탕으로 **A4 용지 5페이지 분량 수준의 매우 상세하고, 논리적이고, 통찰력 있는 '심층 결합 분석 리포트'**를 작성해야 합니다.

[작성 지침]
1. 전문가적이고 신뢰감을 주는 어조를 유지하되, 트렌디하고 감각적인 비유를 섞어 사용하세요.
2. 결과물을 마크다운(Markdown) 포맷으로 완벽하게 체계화하여 반환하세요. (#, ##, -, ** 등 다양한 마크다운 포맷 활용)
3. 각 섹션마다 충분한 길이를 할애해 사용자가 이 리포트를 통해 깊은 통찰을 얻게 하세요. 대충 요약하지 말고 최대한 구체적으로 길게 서술하세요.

[필수 리포트 구성 목차]
# 🔮 MBTI x 사주 결합 심층 솔루션 리포트

## 1. 내담자 기본 분석 요약
- 사주 원국 요약
- MBTI 및 기운의 상관관계

## 2. 🌟 본질과 잠재력 (총평)
(기운의 조화와 성향이 만들어내는 아우라에 대한 매우 상세한 서술)

## 3. 🧠 MBTI 심리 모델 분석
(당신의 인지 기능과 행동 성향에 대한 심층적이고 구체적인 설명)

## 4. 📜 사주 명리학 집중 분석
(일간, 오행의 불균형, 용신, 신살 등 구체적 명리 이론을 바탕으로 한 당신만의 타고난 무기와 약점 서술)

## 5. ♾️ MBTI x 사주 시너지 분석
(두 성향이 만났을 때 폭발하는 화학적 반응, 상호 보완점, 내적 갈등 요소 등 깊이 있는 서술)

## 6. 🎯 분야별 심층 솔루션
### 💼 직업 및 재물운
(어떤 직무, 방향성이 맞을지, 자산 관리는 어떻게 해야 하는지 구체적인 가이드)
### 💖 인간관계 및 연애운
(어떤 사람을 만나야 시너지가 나고, 어떤 사람을 피해야 하는지)

## 7. 💡 특별 요청사항 심층 분석
(내담자의 특별 요청사항이 있다면 이에 대한 명쾌하고 따뜻하며 구체적인 답변. 요청사항이 없다면 이 부분은 하반기 운세 예측으로 대체 대체)`;

        const userQuery = `사용자(내담자): ${name || '고객'}\nMBTI: ${mbti || '미입력'}\n${sajuContext}\n생년월일시: ${birthInfo || '모름'}\n리포트 타입: ${reportType}\n특별요청사항: ${specialRequest ? specialRequest : '없음'}`;

        let lastError;
        for (let attempt = 0; attempt < 4; attempt++) {
            try {
                const { model } = getAIProvider(attempt);
                const result = await streamText({
                    model,
                    system: systemPrompt,
                    prompt: userQuery,
                    maxRetries: 0, 
                });
                return result.toTextStreamResponse({ headers: corsHeaders });
            } catch (error) {
                lastError = error;
                console.warn(`Attempt ${attempt + 1} (${getAIProvider(attempt).name}) failed for deep report:`, error);
                if (!isRetryableAIError(error)) break;
            }
        }
        throw lastError;
    } catch (error: any) {
        console.error('[Generate Deep Report Error]:', error);
        return new Response(JSON.stringify({ error: "분석 생성 중 오류가 발생했습니다.", details: error.message }), { 
            status: 500, 
            headers: corsHeaders 
        });
    }
}
