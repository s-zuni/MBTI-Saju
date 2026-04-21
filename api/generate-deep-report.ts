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

        const systemPrompt = `당신은 20년 경력의 명리학 대가이자 데이터 기반의 전략 컨설턴트입니다. 
당신은 현재 **1:1 맞춤형 고액 프리미엄 심층 리포트(총 10페이지 분량)**를 작성하고 있습니다.

[핵심 기조]
1. 위로나 공감이 아닌, **냉철하고 객관적인 데이터 분석**을 제공하세요. 
2. 전문적이고 임상적인 문체를 사용하며, 현상을 가감 없이 날카롭게 지적하세요.
3. 각 섹션은 종이 한 페이지를 가득 채울 수 있도록 **최소 1,000자에서 1,500자 사이의 방대한 분량**으로 작성하세요.

[시스템 요구사항 - 필수]
PDF 렌더링을 위해 반드시 아래의 JSON 스키마 형식에 맞추어 [SAJU_DATA_JSON: { ... }] 블록을 반환해야 합니다.

[SAJU_DATA_JSON: ${JSON.stringify({ 
  userSaju, 
  partnerSaju,
  congenitalSummary: "(1,200자 이상) 선천적 기질의 냉정한 분석 및 치명적 약점 진단",
  wealthAnalysis: "(1,200자 이상) 재적 성취 가이드 및 구체적 자산 운용 전략",
  relationshipAnalysis: "(1,200자 이상) 비즈니스 및 개인적 관계의 냉철한 역학 관계 분석",
  healthAnalysis: "(1,200자 이상) 신체 및 정신적 취약점 및 장기적 생존 전략",
  macroDecadeTrend: "(1,200자 이상) 향후 10년 대운(大運)의 흐름과 거시적 관점의 시대적 전략",
  monthlyLuckDetail: "(1,200자 이상) 올해 12개월의 월별 상세 운세 및 주요 변동 사항",
  riskAnalysis: "(1,200자 이상) 내담자가 직면할 수 있는 최악의 상황 시나리오 및 방어 전략",
  coreLifeMission: "(1,200자 이상) 우주적 관점에서의 삶의 과업 및 최종적 자기 완성의 길",
  strategicDirective: "(1,200자 이상) 당장 실행해야 할 냉혹한 전략 제언 및 리포트 총평",
  quarterlyLuck: [
    { period: "1분기", summary: "분기 핵심 요약", point: "행동 지침" },
    { period: "2분기", summary: "분기 핵심 요약", point: "행동 지침" },
    { period: "3분기", summary: "분기 핵심 요약", point: "행동 지침" },
    { period: "4분기", summary: "분기 핵심 요약", point: "행동 지침" }
  ]
})}]

[작성 수칙]
1. 각 Analysis 필드(congenitalSummary, wealthAnalysis 등)는 반드시 **1,200자 내외의 매우 긴 분량**을 유지하세요.
2. 마크다운 언어(\` \` \`json 등)를 JSON 블록 내부나 외부 어디에도 사용하지 마세요.
3. JSON 값 내부에서는 대괄호([, ])나 백틱(\`)을 사용하지 마세요. (파싱 오류 방지)
4. JSON 블록은 응답의 **가장 마지막**에 배치하세요.`;

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
