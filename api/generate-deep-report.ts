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

[핵심 요구사항]
반드시 아래의 JSON 구조에 맞춰 **순수한 JSON 객체 하나만** 응답하세요. 
텍스트 서문, 마크다운 코드 블록(\`\`\`json 등), 또는 설명글을 절대 포함하지 마세요. 오직 JSON 데이터만 출력해야 합니다.

[JSON 스키마]
{
  "congenitalSummary": "(1,000자 이상) 선천적 기질 분석 및 치명적 약점 진단",
  "wealthAnalysis": "(1,000자 이상) 재적 성취 가이드 및 자산 운용 전략",
  "relationshipAnalysis": "(1,000자 이상) 사회적 관계의 냉철한 역학 분석",
  "healthAnalysis": "(1,000자 이상) 생체 리듬 및 장기적 생존 전략",
  "macroDecadeTrend": "(1,000자 이상) 향후 10년 대운의 흐름과 시대적 전략",
  "monthlyLuckDetail": "(1,000자 이상) 올해 12개월의 월별 상세 운세",
  "riskAnalysis": "(1,000자 이상) 최악의 시나리오 및 방어 전략",
  "coreLifeMission": "(1,000자 이상) 우주적 미션 및 자기 완성의 길",
  "strategicDirective": "(1,000자 이상) 냉혹한 전략 제언 및 리포트 총평",
  "quarterlyLuck": [
    { "period": "1분기", "summary": "분기 핵심 요약", "point": "행동 지침" },
    { "period": "2분기", "summary": "분기 핵심 요약", "point: "행동 지침" },
    { "period": "3분기", "summary": "분기 핵심 요약", "point: "행동 지침" },
    { "period": "4분기", "summary": "분기 핵심 요약", "point: "행동 지침" }
  ]
}

[작성 수칙]
1. 모든 텍스트 필드(Analysis 등)는 실제 종이 리포트 분량을 위해 **반드시 1,000자 이상의 매우 상세한 내용**을 담아야 합니다.
2. JSON 문법을 완벽히 준수하세요. (따옴표, 콤마 등)
3. 응답 시작부터 끝까지 오직 JSON만 있어야 합니다.`;

        let userSajuContext = userSaju ? `
[사용자 사주 데이터]
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
                    maxTokens: 8192,
                } as any);
                return result.toTextStreamResponse({ headers: corsHeaders });
            } catch (error) {
                lastError = error;
                console.warn(`Attempt ${attempt + 1} (${getAIProvider(attempt).name}) failed:`, error);
                if (!isRetryableAIError(error)) break;
            }
        }

        throw lastError;


        throw lastError;
    } catch (error: any) {
        console.error('[Generate Deep Report Error]:', error);
        return new Response(JSON.stringify({ error: "분석 생성 중 오류가 발생했습니다.", details: error.message }), { 
            status: 500, 
            headers: corsHeaders 
        });
    }
}
