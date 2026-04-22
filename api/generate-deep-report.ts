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
반드시 아래의 JSON 구조에 맞춰 **순수한 JSON 객체 하나만** 응답하세요. 모든 분석은 '개조식(bullet points)'으로 작성하며, 각 섹션의 분량을 현재보다 1.5배 늘려 매우 상세하게 기술합니다.

[JSON 스키마]
{
  "userSaju": { /* 전달된 사주 데이터를 그대로 포함 */ },
  "luckyItems": {
    "color": "행운의 색상과 활용법",
    "number": "행운의 숫자와 의미",
    "direction": "도움되는 방향",
    "habit": "일상 습관 1가지"
  },
  "congenitalSummary": "▶ 소주제\\n- 개조식 내용1...\\n- 개조식 내용2...",
  "congenitalKeywords": ["키워드1", "키워드2", "키워드3"],
  "wealthAnalysis": "▶ 재물 및 직업 상세 분석\\n- 내용...",
  "wealthKeywords": ["직업운", "재물축적", "투자성향"],
  "relationshipAnalysis": "▶ 대인관계 및 애정 상세 분석\\n- 내용...",
  "relationshipKeywords": ["인복", "연애운", "사회성"],
  "healthAnalysis": "▶ 건강 및 생체리듬 상세 분석\\n- 내용...",
  "healthKeywords": ["주의기관", "에너지", "관리법"],
  "macroDecadeTrend": "▶ 대운의 흐름 분석\\n- 내용...",
  "macroDecadeKeywords": ["대운흐름", "전성기", "준비기"],
  "yearlyLuckDetail": "▶ 추후 3개년 상세 흐름\\n- 내용...",
  "yearlyLuckKeywords": ["내년운세", "내후년운세", "3년전략"],
  "riskAnalysis": "▶ 리스크 관리 및 방어 전략\\n- 내용...",
  "riskKeywords": ["주의사항", "방어기제", "해결책"],
  "coreLifeMission": "▶ 삶의 사명과 과업\\n- 내용...",
  "coreLifeKeywords": ["사명", "목표", "가치"],
${specialRequestSchema}
  "strategicDirective": "▶ 마스터 핵심 지침\\n- 지침1\\n- 지침2...",
  "strategicKeywords": ["핵심지침1", "핵심지침2", "핵심지침3"],
  "quarterlyLuck": [
    { "period": "1분기", "summary": "흐름 요약", "point": "행동 지침" },
    { "period": "2분기", "summary": "흐름 요약", "point": "행동 지침" },
    { "period": "3분기", "summary": "흐름 요약", "point": "행동 지침" },
    { "period": "4분기", "summary": "흐름 요약", "point": "행동 지침" }
  ]
}

[작성 수칙 - 엄수]
1. **영어 사용 금지**: 제목, 부제목, 내용 모두 한글만 사용합니다. (예: 'Your Personal Lucky Totems' -> '나의 행운 요소')
2. **메타 텍스트 출력 금지**: "(1,000자 이상)", "(상세 분석)" 등 요구사항 텍스트는 절대 출력하지 마세요.
3. **분량 확대**: 각 분석 필드는 최소 1,500자 이상, 매우 구체적이고 깊이 있게 작성하세요.
4. **개조식 작성**: 모든 내용은 '▶ 소주제'와 '- 불렛포인트'를 활용한 개조식으로 작성하여 가독성을 높이세요.
5. **오행 표기**: Wood, Fire 등 영어 표기 대신 '목(木)', '화(火)', '토(土)', '금(金)', '수(水)' 한글(한자) 조합으로만 표기하세요.
6. **사주 데이터**: 'userSaju' 필드에는 아래 제공되는 [사주 데이터] JSON을 그대로 복사해서 넣으세요.
7. 오직 JSON만 출력하세요.`;

        const sajuContext = `[사주 데이터 JSON]
${JSON.stringify(userSaju, null, 2)}

[사주 요약] 일간: ${userSaju?.dayMaster?.chinese}(${userSaju?.dayMaster?.korean}), 오행분포: 목${userSaju?.elementRatio?.wood} 화${userSaju?.elementRatio?.fire} 토${userSaju?.elementRatio?.earth} 금${userSaju?.elementRatio?.metal} 수${userSaju?.elementRatio?.water}`;
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
