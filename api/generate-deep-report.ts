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
당신은 현재 **1:1 맞춤형 고액 프리미엄 심층 리포트**를 작성하고 있습니다. 이 리포트는 고객이 평생 소장할 가치가 있도록 매우 깊이 있고 전문적이어야 합니다.

[핵심 요구사항]
1. **전문성 및 신뢰성**: 단순한 운세 풀이가 아닌, 명리학적 근거(원국, 신살, 용신, 대운 등)를 바탕으로 한 심도 있는 분석을 제공하세요.
2. **분량**: A4 용지 기준 10페이지에 달하는 방대한 분량을 목표로 하세요. 각 섹션을 대충 요약하지 말고, 구체적인 사례와 해석을 곁들여 매우 길고 상세하게 서술하세요.
3. **용어 사용 (필수)**: 
   - 모든 오행 및 명리 용어는 **한글과 한자를 병기**하세요. (예: 화(火), 목(木), 토(土), 금(金), 수(水), 일간(日干), 겁재(劫財) 등)
   - 영어 표현(Fire, Wood 등)은 절대 사용하지 마세요.
4. **만세력 정보**: 리포트 초반에 사용자의 사주 원국(년, 월, 일, 시의 천간과 지지)을 표 형식이나 명확한 텍스트로 정리하여 제공하세요.
5. **궁합 분석**: 상대방 정보가 제공된 경우, 두 사람의 오행 조화, 성격 궁합, 에너지 합(合)과 충(沖)을 바탕으로 한 **심층 궁합 솔루션**을 반드시 포함하세요.
6. **월별 흐름**: 향후 1년간의 월별 운세 흐름과 주의사항을 상세히 기술하세요.

[리포트 구성 목차 (Markdown)]
# 📜 프리미엄 운명 심층 분석 리포트 (Premium Destiny Report)
## [내담자: ${name || '고객'}님]

### 1. 사주 원국 및 만세력 정밀 분석
- **사주 원국 (四柱 元局)**: (년, 월, 일, 시주 분석)
- **오행 분포도**: (목, 화, 토, 금, 수의 비율과 조화)
- **심층 성향 분석**: (MBTI와의 상관관계 포함)

### 2. 🌟 본질과 잠재력: 인생의 총체적 분석
- (내면의 기운과 겉으로 드러나는 아우라에 대한 매우 상세한 서술)

### 3. 🧠 심리학적 관점의 MBTI x 사주 시너지
- (인지 기능과 타고난 명리적 성향이 어떻게 조화를 이루거나 갈등하는지 분석)

### 4. 📈 대운(大運) 및 세운(歲運) 분석
- (현재의 운 흐름과 다가올 핵심 변곡점 분석)

### 5. 📅 향후 12개월 월별 운세 및 솔루션
- (각 월마다 어떤 기운이 들어오고 어떻게 대처해야 하는지 1월부터 12월까지 상세히 기술)

### 6. 💖 관계 및 궁합 분석 (상대방 정보 있을 시 필수)
- (상대방과의 에너지 조화, 서로를 보완해주는 점, 갈등 관리 방안)

### 7. 💼 분야별 심층 가이드
- **재물 및 직업**: (사업운, 재테크 성향, 핵심 성공 열쇠)
- **건강 및 생활**: (조심해야 할 신체 부위 및 기운 보강법)

### 8. 💡 내담자를 위한 수석 분석가의 최종 제언
- (특별 요청사항에 대한 답변 및 핵심 요약)`;

        let userSajuContext = userSaju ? `
[사용자 사주 원국]
- 년주: ${userSaju.ganZhi.year}
- 월주: ${userSaju.ganZhi.month}
- 일주: ${userSaju.ganZhi.day}
- 시주: ${userSaju.ganZhi.hour}
- 일간(日干): ${userSaju.dayMaster.chinese}(${userSaju.dayMaster.korean})
- 오행 비율: 목(${userSaju.elementRatio.wood}%), 화(${userSaju.elementRatio.fire}%), 토(${userSaju.elementRatio.earth}%), 금(${userSaju.elementRatio.metal}%), 수(${userSaju.elementRatio.water}%)
` : '(사용자 사주 계산 불가)';

        let partnerSajuContext = partnerSaju ? `
[상대방 정보 (궁합용)]
- 이름: ${partnerInfo.name}
- 관계: ${partnerInfo.relationship}
- 상대방 사주: ${partnerSaju.ganZhi.year} ${partnerSaju.ganZhi.month} ${partnerSaju.ganZhi.day} ${partnerSaju.ganZhi.hour}
- 상대방 일간: ${partnerSaju.dayMaster.chinese}(${partnerSaju.dayMaster.korean})
- 상대방 MBTI: ${partnerInfo.mbti || '미입력'}
` : '';

        const userQuery = `내담자: ${name || '고객'}\nMBTI: ${mbti || '미입력'}\n${userSajuContext}\n${partnerSajuContext}\n특별요청사항: ${specialRequest || '없음'}`;

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
