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
            ? `  "specialRequestAnalysis": "▶ 특별 요청 분석\\n\\n- 내용 (2,000자 이상 상세 분석)",\n  "specialRequestKeywords": ["핵심1", "핵심2", "핵심3"],`
            : `  "specialRequestAnalysis": "",\n  "specialRequestKeywords": [],`;

        const systemPrompt = `${expertPersona} 이 사람만을 위한 프리미엄 심층 분석 리포트를 작성합니다.

[절대 준수 규칙 — 위반 시 계약 해지 및 무효 처리]
1. **영어 단어 사용 완전 금지**: 본문, 제목, 불렛포인트, 키워드 어디에도 영어를 사용하지 마세요. 특히 오행(목, 화, 토, 금, 수)과 계절(봄, 여름, 가을, 겨울)을 영어로 쓰면 절대 안 됩니다. (예외: MBTI 유형명 4글자는 가능)
   - 금지 예시: wood, fire, earth, metal, water, spring, summer, autumn, winter, health, wealth, risk 등 모든 영단어 금지.
   - 대체 예시: 목(木), 화(火), 토(土), 금(金), 수(水)와 같이 한글 뒤에 한자를 병기하는 형식을 적극 사용하세요.
2. **오직 JSON만 출력**: 마크다운 코드블록(\`\`\`json), 설명 텍스트 없이 순수 JSON(\"{\")으로 시작하여 (\"}\")로 끝나는 데이터만 응답하세요.
3. **메타 텍스트 및 지시문 노출 금지**: "(한글로 설명...)", "(분량...)", "(상세 분석...)", "(이전 지침...)" 등 프롬프트의 지시 내용을 리포트에 포함하지 마세요. 오직 내담자에게 전달할 상담 내용만 작성하세요.
4. **문단 구분 필수**: 각 소주제 사이에는 반드시 빈 줄(\\n\\n)로 구분하고, 불렛포인트는 각각 개행(\\n- )으로 구분하세요.
5. **최대 분량 및 상세성 보장**: 총 9개의 섹션을 반드시 포함하되, 각 섹션 내의 소주제들은 **최대한 상세하고 풍부하게(각 소주제당 10줄 이상의 구체적인 분석)** 작성하세요. 핵심만 요약하지 말고, 내담자가 감동할 정도로 깊이 있는 조언과 명리학적 근거를 제시하세요.
6. **개인 중심의 분석**: 특별 요청 사항이 없는 한, 단체나 팀 단위의 활동보다는 개인의 운기 흐름, 기운, 개인적인 성취를 중심으로 서술하세요. 명리학적 관점에서 내담자 개인의 '부(富), 연애, 재물운, 명예' 등에 집중하십시오.
7. **3개년 운세 구체성**: 향후 3년 전망은 '프로젝트 완수'와 같은 사회적 성취보다 '재물운의 상승', '인연의 흐름', '심적 안정' 등 명리학에 기반한 개인의 복(福)과 화(禍)를 구체적으로 다루세요.

[JSON 스키마]
{
  "userSaju": { /* 전달된 사주 데이터를 그대로 포함 */ },
  "luckyItems": {
    "color": "행운의 색상과 활용 방법",
    "number": "행운의 숫자와 의미",
    "direction": "도움이 되는 방향 및 이유",
    "habit": "핵심 습관 1가지"
  },
  "congenitalSummary": "▶ 선천 기질 핵심\\n\\n(내담자의 타고난 천성을 꿰뚫는 깊이 있는 분석...)\\n\\n▶ 일간의 특성과 운명적 기질\\n\\n(일간의 오행적 특성이 삶에 미치는 영향과 성격적 장단점 상세 서술...)\\n\\n▶ 오행 에너지 분포와 삶의 패턴\\n\\n(부족한 기운과 과한 기운을 어떻게 다스려야 하는지 구체적인 로드맵 제시...)",
  "congenitalKeywords": ["키워드1", "키워드2", "키워드3"],

  "wealthAnalysis": "▶ 재물운의 근본 구조\\n\\n(사주에 나타난 재복의 크기와 시기, 재물을 다루는 타고난 성향 상세 분석...)\\n\\n▶ 직업 적성 및 유망 분야\\n\\n(명리학적 신살과 육친을 바탕으로 한 최적의 직업군과 그 이유 상세 서술...)\\n\\n▶ 재물 축적 전략\\n\\n(언제 돈을 모으고 언제 투자해야 하는지, 어떤 자산 형태가 유리한지 구체적 코칭...)\\n\\n▶ 투자 성향 및 주의 사항\\n\\n(리스크 관리 방법과 절대 피해야 할 투자 방식 상세 가이드...)\\n\\n▶ 직업운 피크 시기와 저조 시기\\n\\n(인생의 황금기와 고비를 넘기는 지혜 상세 서술)",
  "wealthKeywords": ["직업운", "재물축적", "투자성향"],

  "relationshipAnalysis": "▶ 대인관계 전반 분석\\n\\n(사람들과의 관계에서 나타나는 기질과 사회적 위치 분석...)\\n\\n▶ 강점과 매력 포인트\\n\\n(타인에게 어필하는 타고난 기운과 이를 활용하는 법...)\\n\\n▶ 관계에서 나타나는 특징과 패턴\\n\\n(반복되는 인간관계의 고리를 어떻게 선순환으로 바꿀지 상세 서술...)\\n\\n▶ 종합 주의사항\\n\\n▶ 실전 관계 전략\\n\\n▶ 연애 및 이성 관계 분석\\n\\n▶ 인복(人福) 분석",
  "relationshipKeywords": ["인복", "연애운", "사회성"],

  "healthAnalysis": "▶ 사주로 보는 체질과 건강 기반\\n\\n▶ 주의해야 할 건강 위험 요소\\n\\n▶ 에너지 리듬과 생체 사이클\\n\\n▶ 정신 건강 및 스트레스 관리\\n\\n▶ 식이 요법 및 운동 권고\\n\\n▶ 건강 관리 실천 로드맵",
  "healthKeywords": ["주의기관", "에너지", "관리법"],

  "macroDecadeTrend": "▶ 향후 3개년 대운(大運)의 핵심 흐름\\n\\n(3년간의 전체적인 기운 변화를 서사적으로 풀어서 설명...)\\n\\n▶ 2027년 (정미년) 운세 및 전략\\n\\n(재물, 건강, 인연 등 분야별로 매우 상세하게 분석...)\\n\\n▶ 2028년 (무신년) 운세 및 전략\\n\\n(변화의 핵심과 기회를 잡는 방법 상세 분석...)\\n\\n▶ 2029년 (기유년) 운세 및 전략\\n\\n(갈무리와 다음 운을 준비하는 지혜...)\\n\\n▶ 3개년 종합 전략 선언",
  "macroDecadeKeywords": ["향후3년", "운명전환점", "핵심전략"],
  "yearlyScores": [
    { "year": "2027", "score": 85, "label": "길(吉)" },
    { "year": "2028", "score": 92, "label": "대길(大吉)" },
    { "year": "2029", "score": 78, "label": "평(平)" }
  ],
  "partnerAnalysis": "▶ 이 사람과 잘 맞는 파트너 유형\\n\\n▶ 직장 및 사회 관계에서 곁에 두어야 할 유형\\n\\n▶ 연애·결혼 파트너로 적합한 유형\\n\\n▶ 반드시 피해야 할 파트너 유형\\n\\n▶ 직장에서 피해야 할 인물 유형\\n\\n▶ 냉정한 관계 진단 기준",
  "partnerKeywords": ["맞춤파트너", "피해야할유형", "관계전략"],

  "riskAnalysis": "▶ 대인관계 리스크\\n\\n▶ 연애 및 결혼 리스크\\n\\n▶ 재물 및 투자 리스크\\n\\n▶ 건강 리스크\\n\\n▶ 커리어 및 사업 리스크\\n\\n▶ 종합 방어 전략 및 위기 탈출 플랜",
  "riskKeywords": ["주의사항", "방어기제", "해결책"],

  "coreLifeMission": "▶ 이 사람의 운명적 본질\\n\\n▶ 삶의 핵심 사명\\n\\n▶ 삶을 대하는 올바른 자세\\n\\n▶ 구체적 행동 강령 (1~5)\\n\\n▶ 인생의 중요한 결정을 내릴 때 기준\\n\\n▶ 운명을 개척하는 핵심 전략\\n\\n▶ 이 운명이 주는 최종 메시지",
  "coreLifeKeywords": ["사명", "목표", "가치"],

${specialRequestSchema}
  "strategicDirective": "▶ 이 사람은 누구인가\\n\\n▶ 핵심 운명 전략 (1~3)\\n\\n▶ 반드시 명심해야 할 사항 (1~3)\\n\\n▶ 절대 하지 말아야 할 것 (1~2)\\n\\n▶ 10년 내 반드시 이루어야 할 과업 (1~2)\\n\\n▶ 최종 선언",
  "strategicKeywords": ["핵심지침1", "핵심지침2", "핵심지침3"],
  "quarterlyLuck": [
    { "period": "1분기 (1~3월)", "summary": "해당 분기의 상세한 운세 흐름과 재물, 건강, 인연 등 종합 분석 (최소 5줄 이상)", "point": "이 시기에 실천해야 할 핵심 지침" },
    { "period": "2분기 (4~6월)", "summary": "상세 분석", "point": "지침" },
    { "period": "3분기 (7~9월)", "summary": "상세 분석", "point": "지침" },
    { "period": "4분기 (10~12월)", "summary": "상세 분석", "point": "지침" }
  ]
}

[최종 확인]
1. 영어 사용 시 탈락.
2. 06~09 섹션 누락 시 탈락.
3. 지시문(메타 텍스트) 포함 시 탈락.
4. **분량 부족 시 탈락. 최대한 상세하게 작성하세요.**
5. 오직 순수 JSON만 출력하세요.`;

        const sajuContext = `[사주 데이터 JSON]
${JSON.stringify(userSaju, null, 2)}

[사주 요약] 일간: ${userSaju?.dayMaster?.chinese}(${userSaju?.dayMaster?.korean}), 오행분포: 목(木)${userSaju?.elementRatio?.wood}% 화(火)${userSaju?.elementRatio?.fire}% 토(土)${userSaju?.elementRatio?.earth}% 금(金)${userSaju?.elementRatio?.metal}% 수(水)${userSaju?.elementRatio?.water}%`;
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
                    maxTokens: 16384,
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
