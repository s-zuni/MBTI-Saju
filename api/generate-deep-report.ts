import { streamText } from 'ai';
import { calculateSaju } from './_utils/saju';
import { corsHeaders, handleCors } from './_utils/cors';
import { getAIProvider, isRetryableAIError } from './_utils/ai-provider';

export const config = {
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
        
        let birthDate = '';
        let birthTime = '';
        if (birthInfo) {
            const parts = birthInfo.split(' ');
            birthDate = parts[0];
            birthTime = parts[1] || '12:00';
        }
        let userSaju = calculateSaju(birthDate, birthTime);
        
        let partnerSaju = null;
        if (partnerInfo) {
            const [pDate, pTime] = partnerInfo.birth_info.split(' ');
            partnerSaju = calculateSaju(pDate, pTime || '12:00');
        }

        const isMbtiMode = reportType && reportType.includes('MBTI');
        const hasMbti = isMbtiMode && mbti && mbti !== '미입력';
        const hasSpecialRequest = specialRequest && specialRequest.trim() !== '' && specialRequest !== '없음';

        const expertPersona = isMbtiMode
            ? `당신은 명리학 35년 경력의 현직 역술인이자 공인 MBTI 전문가입니다.`
            : `당신은 명리학 35년 경력의 현직 역술인입니다.`;

        const specialRequestSchema = hasSpecialRequest
            ? `  "specialRequestAnalysis": "(500자 이상 상세 분석)",\n  "specialRequestKeywords": ["핵심1", "핵심2", "핵심3"],`
            : `  "specialRequestAnalysis": "",\n  "specialRequestKeywords": [],`;

        const systemPrompt = `${expertPersona} 프리미엄 심층 리포트를 작성합니다.

[핵심 요구사항]
반드시 아래의 JSON 구조에 맞춰 **순수한 JSON 객체 하나만** 응답하세요.

[JSON 스키마]
{
  "luckyItems": {
    "color": "행운의 색상과 활용법",
    "number": "행운의 숫자와 의미",
    "direction": "도움되는 방향",
    "habit": "일상 습관 1가지"
  },
  "congenitalSummary": "▶ 소주제1\\n내용... (1,000자 이상)",
  "congenitalKeywords": ["키워드1", "키워드2", "키워드3"],
  "wealthAnalysis": "(전체 1,000자 이상)",
  "wealthKeywords": ["직업운", "재물축적", "투자성향"],
  "relationshipAnalysis": "(전체 1,000자 이상)",
  "relationshipKeywords": ["인복", "연애운", "사회성"],
  "healthAnalysis": "(전체 1,000자 이상)",
  "healthKeywords": ["주의기관", "에너지", "관리법"],
  "macroDecadeTrend": "(전체 1,000자 이상)",
  "macroDecadeKeywords": ["대운흐름", "전성기", "준비기"],
  "yearlyLuckDetail": "(추후 3년 간의 연도별 상세 흐름 및 전략. 전체 1,000자 이상)",
  "yearlyLuckKeywords": ["내년운세", "내후년운세", "3년전략"],
  "riskAnalysis": "(전체 1,000자 이상)",
  "riskKeywords": ["주의사항", "방어기제", "해결책"],
  "coreLifeMission": "(전체 1,000자 이상)",
  "coreLifeKeywords": ["사명", "목표", "가치"],
${specialRequestSchema}
  "strategicDirective": "▶ 지침1\\n내용... (체크리스트용 구체적 지침들)",
  "strategicKeywords": ["핵심지침1", "핵심지침2", "핵심지침3"],
  "quarterlyLuck": [
    { "period": "1분기", "summary": "흐름 요약", "point": "행동 지침" },
    { "period": "2분기", "summary": "흐름 요약", "point": "행동 지침" },
    { "period": "3분기", "summary": "흐름 요약", "point": "행동 지침" },
    { "period": "4분기", "summary": "흐름 요약", "point": "행동 지침" }
  ]
}

[작성 수칙]
1. 모든 분석 필드는 1,000자 이상으로 매우 상세하게 작성.
2. 각 필드별 'Keywords'는 해당 분석 내용을 관통하는 가장 중요한 단어 3개를 선정.
3. 'luckyItems'는 내담자의 사주 오행과 MBTI를 고려하여 실질적으로 도움이 되는 것을 추천.
4. 모든 텍스트는 전문적이면서도 내담자가 바로 실천할 수 있는 현실적인 조언 위주로 작성.
5. 오직 JSON만 출력.`;

        const sajuContext = `[사주] 일간: ${userSaju?.dayMaster?.chinese}(${userSaju?.dayMaster?.korean}), 오행분포: 목${userSaju?.elementRatio?.wood} 화${userSaju?.elementRatio?.fire} 토${userSaju?.elementRatio?.earth} 금${userSaju?.elementRatio?.metal} 수${userSaju?.elementRatio?.water}`;
        const userQuery = `이름: ${name}, MBTI: ${mbti}, 생년월일시: ${birthInfo}, 유형: ${reportType}, 요청: ${specialRequest}\n${sajuContext}`;

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
                if (!isRetryableAIError(error)) break;
            }
        }
        throw lastError;
    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
    }
}
