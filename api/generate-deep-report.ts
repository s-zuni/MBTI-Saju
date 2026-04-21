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
당신은 반드시 아래의 JSON 스키마 형식에 맞추어 하나의 유효한 JSON 블록을 반환해야 합니다. 다른 사족이나 마크다운 형식은 모두 제외하고 오직 [SAJU_DATA_JSON: { ... }] 블록 하나만 반환하세요.
PDF 렌더링 레이아웃이 깨지지 않도록 각 분석 내용(Analysis)은 **반드시 300자 ~ 400자 사이의 길이**로 작성되어야 합니다.

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

[중요 지침]
- 위 [SAJU_DATA_JSON: ...] 블록은 반드시 응답의 **가장 마지막**에 위치해야 합니다.
- JSON 내부의 텍스트에서 큰따옴표(")나 대괄호([])는 가급적 피하고, 필요하다면 적절히 이스케이프 처리하세요.
- 각 분석 항목은 반드시 300자 이상의 충분한 분량으로 작성하세요.

[작성 가이드라인]
1. 결론 우선: 각 항목의 문장은 [분석 요약]결론을 먼저 말한 후 이유를 설명하세요.
2. 명리학과 심리학(MBTI)의 결합: 전문적인 사주 용어(한자 병기)와 MBTI 심리를 적절히 혼합하여 신뢰감을 주어야 합니다.
3. 모든 Analysis 필드는 엄격히 300~400자 분량을 지키세요. 이 분량을 벗어나면 49,000원짜리 고객용 프린트물이 깨집니다.`;

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
