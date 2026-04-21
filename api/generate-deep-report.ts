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
   [SAJU_DATA_JSON: ${JSON.stringify({ userSaju, partnerSaju })}]
2. 위 데이터 블록 이후에 리포트 내용을 시작하세요. 이 데이터는 프론트엔드 시각화 엔진에서 사용됩니다.

[리포트 핵심 요구사항]
1. **전문성 및 신뢰성**: 단순한 운세 풀이가 아닌, 명리학적 근거(원국, 신살, 용신, 대운 등)를 바탕으로 한 심도 있는 분석을 제공하세요.
2. **분량**: A4 용지 기준 10페이지에 달하는 방대한 분량을 목표로 하세요. 각 섹션을 대충 요약하지 말고, 구체적인 사례와 해석을 곁들여 매우 길고 상세하게 서술하세요.
3. **용어 사용**: 모든 오행 및 명리 용어는 **한글과 한자 병기** (예: 화(火), 목(木), 토(土))를 철저히 지키세요. 영어 표현은 배제하세요.
4. **시각적 데이터 활용**: 당신이 하단에 작성할 텍스트 리포트는 상단에 자동으로 생성될 '만세력 표'와 '오행 분석 차트'를 보조하고 심화 해석하는 역할을 합니다. 표에 나온 데이터를 언급하며 전문성을 높이세요.

[리포트 구성 목차 (Markdown)]
# 📜 프리미엄 운명 심층 분석 리포트
## [내담자: ${name || '고객'}님]

### 1. 🔮 사주 원국 및 오행 정밀 분석
- (제공된 시각화 데이터를 기반으로 원국의 특성을 깊이 있게 해석하세요)

### 2. 🌟 본질과 잠재력: 인생의 총체적 분석
- (내면의 기운과 겉으로 드러나는 기질에 대한 상세 서술)

### 3. 🧠 심리학적 관점의 MBTI x 사주 시너지
- (MBTI ${mbti || '미입력'} 성향과 타고난 명리적 성향의 결합 분석)

### 4. 📈 대운(大運) 및 세운(歲運) 분석
- (현재의 운 흐름과 핵심 변곡점)

### 5. 📅 향후 1년 월별 운세 및 솔루션 (1월~12월)
- (각 월별 기운의 변화와 대처법을 상세히 기술)

### 6. 💖 관계 및 궁합 분석 (상대방 정보 있을 시 필수)
- (에너지 조화, 상생 관계, 갈등 관리 방안)

### 7. 💼 분야별 전문 가이드 (재물/직업/건강)

### 8. 💡 수석 분석가의 최종 제언`;

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
