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
PDF 렌더링을 위해 반드시 아래의 JSON 스키마 형식에 맞추어 [SAJU_DATA_JSON: { ... }] 블록을 반환해야 합니다. 다른 마크다운(backticks)이나 사족은 최소화하고 특히 JSON 내부에는 절대 사용하지 마세요.

[SAJU_DATA_JSON: ${JSON.stringify({ 
  userSaju, 
  partnerSaju,
  quarterlyLuck: [
    { period: "1분기", summary: "핵심 요약", point: "조언" },
    { period: "2분기", summary: "핵심 요약", point: "조언" },
    { period: "3분기", summary: "핵심 요약", point: "조언" },
    { period: "4분기", summary: "핵심 요약", point: "조언" }
  ],
  congenitalSummary: "(필수: 300~400자) 선천적 기질 요약 및 MBTI 시너지",
  wealthAnalysis: "(필수: 300~400자) 재물 흐름 및 직업적 성취 가이드",
  relationshipAnalysis: "(필수: 300~400자) 대인관계 및 애정운 분석",
  healthAnalysis: "(필수: 300~400자) 건강 상태 예측 및 개선점",
  timelineRoadmap: "(필수: 300~400자) 인생 타임라인 및 분기별 최종 행동 지침"
})}]

[작성 수칙]
1. 위 JSON 데이터 블록은 반드시 응답의 **가장 마지막**에 배치하세요.
2. JSON 블록 앞뒤에 마크다운 코드 블록(예: \`\`\`json)을 절대 사용하지 마세요.
3. 모든 분석 항목은 반드시 300~400자 사이의 충분한 분량으로 작성하세요.`;

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
