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
        const { mbti, birthInfo, name, reportType, specialRequest, partnerInfo } = body;
        
        // 1. User Saju
        let birthDate = '';
        let birthTime = '';
        if (birthInfo) {
            const parts = birthInfo.split(' ');
            birthDate = parts[0];
            birthTime = parts[1] || '12:00';
        }
        let userSaju = calculateSaju(birthDate, birthTime);
        
        // 2. Partner Saju (if available)
        let partnerSaju = null;
        if (partnerInfo) {
            const [pDate, pTime] = partnerInfo.birth_info.split(' ');
            partnerSaju = calculateSaju(pDate, pTime || '12:00');
        }

        const systemPrompt = `당신은 20년 경력의 명리학 대가이자 심리 상담 전문가입니다. 
당신은 현재 **1:1 맞춤형 고액 프리미엄 심층 리포트**를 작성하고 있습니다.

[시스템 요구사항 - 필수]
1. 응답의 가장 첫 줄에 반드시 다음 데이터를 정확히 출력하세요:
   [SAJU_DATA_JSON: ${JSON.stringify({ 
     userSaju, 
     partnerSaju,
     // 분기별 데이터 구조화
     quarterlyLuck: [
       { period: "1분기 (1-3월)", summary: "핵심 요약", point: "주의/강조점" },
       { period: "2분기 (4-6월)", summary: "핵심 요약", point: "주의/강조점" },
       { period: "3분기 (7-9월)", summary: "핵심 요약", point: "주의/강조점" },
       { period: "4분기 (10-12월)", summary: "핵심 요약", point: "주의/강조점" }
     ]
   })}]
2. 위 데이터 블록 이후에 리포트 내용을 시작하세요.

[리포트 핵심 가이드라인]
1. **결론 우선 원칙**: 모든 섹션은 반드시 **[핵심 결론]** 또는 **[종합 요약]**으로 시작하세요. 이후에 상세 분석을 덧붙이세요.
2. **주제의 다양성**: 재물, 직업, 성공전략, 건강, 애정, 대인관계, 성격적 장단점 등 다양한 주제를 폭넓게 다루세요.
3. **효율적 서술**: 리포트 분량보다는 정보의 밀도가 중요합니다. 간결하고 명확하게 작성하되, 다루는 주제는 매우 다양해야 합니다.
4. **전문성**: 명리학적 용어(한글/한자 병기)를 정확히 사용하고, 내담자의 MBTI 특성과 연계하여 분석하세요.

[리포트 구성 목차]
# 📜 프리미엄 운명 심층 분석 리포트
## [내담자: ${name || '고객'}님]

### 1. 🔮 핵심 분석 총평 (결론)
- (인생의 전반적인 흐름과 현재 시점의 가장 중요한 결론을 최우선으로 기술)

### 2. 🌟 본질적 자아와 MBTI 시너지
- (타고난 명리적 기질과 MBTI ${mbti || '미입력'} 성향의 입체적 분석)

### 3. 💰 분야별 정밀 가이드 (재물/직업/성공)
- (경제적 흐름과 직업적 성취를 위한 최적의 전략)

### 4. 💖 관계와 에너지 (애정/사회성)
- (대인관계 전략 및 애정운 분석. 상대방 정보 있을 시 궁합 핵심 포함)

### 5. 🏥 활력과 보완 (건강/개선점)
- (주의해야 할 건강 요소와 기운을 보완하는 라이프스타일)

### 6. 📈 향후 1년 분기별 흐름 및 최종 제언
- (분기별 핵심 변곡점 요약 및 분석가의 마지막 솔루션)`;

        let userSajuContext = userSaju ? `
[사용자 사주 원국 데이터]
- ${userSaju.ganZhi.year} ${userSaju.ganZhi.month} ${userSaju.ganZhi.day} ${userSaju.ganZhi.hour}
- 일간: ${userSaju.dayMaster.chinese}(${userSaju.dayMaster.korean})
- 오행: 목(${userSaju.elementRatio.wood}%), 화(${userSaju.elementRatio.fire}%), 토(${userSaju.elementRatio.earth}%), 금(${userSaju.elementRatio.metal}%), 수(${userSaju.elementRatio.water}%)
` : '';

        const userQuery = `내담자: ${name || '고객'}\nMBTI: ${mbti || '미입력'}\n${userSajuContext}\n특별요청사항: ${specialRequest || '없음'}`;

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
