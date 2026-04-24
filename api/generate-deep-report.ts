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

[절대 준수 규칙 — 위반 시 무효]
1. **영어 단어 사용 완전 금지**: 본문, 제목, 불렛포인트, 키워드 어디에도 영어를 사용하지 마세요.
   - 금지 예시: water → 수(水), fire → 화(火), wood → 목(木), metal → 금(金), earth → 토(土)
   - 방향도 한글: North → 북, South → 남, East → 동, West → 서
2. **오직 JSON만 출력**: 마크다운 코드블록, 설명 텍스트 없이 순수 JSON만 응답하세요.
3. **메타 텍스트 금지**: "(이상)", "(분량)", "(상세 분석)" 등 지시문 텍스트는 절대 출력 금지.
4. **문단 구분 필수**: 각 소주제 사이에는 반드시 빈 줄(\\n\\n)로 구분하고, 불렛포인트는 각각 개행(\\n- )으로 구분하세요.
5. **오행 표기**: 목(木), 화(火), 토(土), 금(金), 수(水) — 한글(한자) 조합만 사용.

[JSON 스키마]
{
  "userSaju": { /* 전달된 사주 데이터를 그대로 포함 */ },
  "luckyItems": {
    "color": "행운의 색상과 구체적인 활용 방법",
    "number": "행운의 숫자와 그 의미 및 활용법",
    "direction": "도움이 되는 방향 및 이유",
    "habit": "일상에서 실천할 핵심 습관 1가지"
  },
  "congenitalSummary": "▶ 선천 기질 핵심\\n\\n- 내용1\\n- 내용2\\n\\n▶ 일간의 특성과 운명적 기질\\n\\n- 내용1\\n- 내용2\\n\\n▶ 오행 에너지 분포와 삶의 패턴\\n\\n- 내용1\\n- 내용2",
  "congenitalKeywords": ["키워드1", "키워드2", "키워드3"],

  "wealthAnalysis": "▶ 재물운의 근본 구조\\n\\n- 이 사람의 사주에서 재성(財星)의 위치와 강약을 분석\\n- 내용2\\n\\n▶ 직업 적성 및 유망 분야\\n\\n- 이 사람의 일간과 용신을 고려한 최적 직군\\n- 내용2\\n\\n▶ 재물 축적 전략\\n\\n- 내용1\\n- 내용2\\n\\n▶ 투자 성향 및 주의 사항\\n\\n- 내용1\\n- 내용2\\n\\n▶ 직업운 피크 시기와 저조 시기\\n\\n- 내용1",
  "wealthKeywords": ["직업운", "재물축적", "투자성향"],

  "relationshipAnalysis": "▶ 대인관계 전반 분석\\n\\n- 이 사람이 사람들과 관계 맺는 방식의 근본 패턴\\n- 사주와 MBTI가 대인관계에 미치는 영향\\n\\n▶ 강점과 매력 포인트\\n\\n- 타인이 이 사람에게서 느끼는 첫인상과 매력\\n- 장기적으로 신뢰를 쌓는 방식\\n\\n▶ 관계에서 나타나는 특징과 패턴\\n\\n- 친밀한 관계에서의 행동 패턴\\n- 갈등 상황에서의 반응 방식 (예시 포함)\\n\\n▶ 종합 주의사항\\n\\n- 대인관계에서 반드시 주의해야 할 함정\\n- 특정 사람 유형과의 관계에서 나타나는 위험 신호\\n\\n▶ 실전 관계 전략 (구체적 예시 포함)\\n\\n- 직장에서의 전략적 행동 지침 (예: ~한 상황에서는 ~하게 대처하라)\\n- 친구 관계 유지 전략\\n- 갈등 해소를 위한 구체적 대화법\\n\\n▶ 연애 및 이성 관계 분석\\n\\n- 연애 패턴의 특성\\n- 이상적인 연애 방식과 주의사항\\n\\n▶ 인복(人福) 분석\\n\\n- 이 사람 주변에 모이는 사람들의 성격 유형\\n- 귀인을 만나는 시기와 환경",
  "relationshipKeywords": ["인복", "연애운", "사회성"],

  "healthAnalysis": "▶ 사주로 보는 체질과 건강 기반\\n\\n- 오행 에너지 분포에 따른 체질 분석\\n- 선천적으로 취약한 장기와 신체 부위\\n\\n▶ 주의해야 할 건강 위험 요소\\n\\n- 내용1\\n- 내용2\\n\\n▶ 에너지 리듬과 생체 사이클\\n\\n- 하루 중 가장 에너지가 높은 시간대\\n- 계절별 에너지 변화 패턴\\n\\n▶ 정신 건강 및 스트레스 관리\\n\\n- 이 사람이 겪는 주된 스트레스 유형\\n- 심리적 소진 징후와 회복 방법\\n\\n▶ 식이 요법 및 운동 권고\\n\\n- 오행에 맞는 음식과 피해야 할 음식\\n- 체질에 맞는 운동 종류와 강도\\n\\n▶ 건강 관리 실천 로드맵\\n\\n- 일상에서 반드시 실천해야 할 건강 습관\\n- 정기적으로 점검해야 할 건강 지표",
  "healthKeywords": ["주의기관", "에너지", "관리법"],

  "macroDecadeTrend": "▶ 향후 3개년 대운(大運)의 핵심 흐름\\n\\n- 이 사람의 인생에서 현재 3개년이 갖는 특별한 의미와 대운의 변화 양상 개요 (2,000자 이상)\\n\\n▶ 2027년 (정미년) 운세 및 전략\\n\\n- 운의 흐름: 상세 분석\\n- 길조: 내용\\n- 주의사항 및 흉조: 내용 (삼재 등 위험 요소 포함)\\n- 핵심 전략: 구체적인 행동 지침\\n\\n▶ 2028년 (무신년) 운세 및 전략\\n\\n- 운의 흐름: 상세 분석\\n- 길조: 내용\\n- 주의사항 및 흉조: 내용\\n- 핵심 전략: 구체적인 행동 지침\\n\\n▶ 2029년 (기유년) 운세 및 전략\\n\\n- 운의 흐름: 상세 분석\\n- 길조: 내용\\n- 주의사항 및 흉조: 내용\\n- 핵심 전략: 구체적인 행동 지침\\n\\n▶ 3개년 종합 전략 선언\\n\\n- 3년간의 전체 흐름 요약 및 성공을 위한 최종 마스터 플랜",
  "macroDecadeKeywords": ["향후3년", "운명전환점", "핵심전략"],

  "partnerAnalysis": "▶ 이 사람과 잘 맞는 파트너 유형\\n\\n- 사주와 오행 관점에서 시너지가 나는 성격 및 기질\\n- 함께 있을 때 에너지가 올라가는 유형의 특징\\n- 추천 MBTI 유형과 그 이유 (한글로 설명, 영어 유형명은 사용 가능)\\n\\n▶ 직장 및 사회 관계에서 곁에 두어야 할 유형\\n\\n- 직장 동료로 최적인 성격 유형 구체 서술\\n- 멘토 혹은 귀인이 될 수 있는 유형\\n\\n▶ 연애·결혼 파트너로 적합한 유형\\n\\n- 장기적 관계에서 안정을 주는 상대방의 특성\\n- 이 사람의 부족한 부분을 채워주는 유형\\n\\n▶ 반드시 피해야 할 파트너 유형\\n\\n- 사주 충(沖)·극(剋) 관계에서 나타나는 위험 유형\\n- 이 사람의 에너지를 소모시키는 성격 유형 특징\\n- 함께할 때 반복적으로 갈등이 생기는 유형의 패턴\\n\\n▶ 직장에서 피해야 할 인물 유형\\n\\n- 관계에서 독이 되는 동료 또는 상하관계 유형\\n\\n▶ 냉정한 관계 진단 기준\\n\\n- 이 사람이 관계 지속/단절을 판단하는 객관적 기준\\n- 관계에서 반드시 지켜야 할 원칙",
  "partnerKeywords": ["맞춤파트너", "피해야할유형", "관계전략"],

  "riskAnalysis": "▶ 대인관계 리스크\\n\\n- 이 사람의 사주에서 비롯되는 대인관계 주요 위험 요소\\n- 관계에서 반복적으로 겪는 패턴과 함정\\n- 방어 전략: 구체적인 행동 지침\\n\\n▶ 연애 및 결혼 리스크\\n\\n- 연애에서 반복적으로 나타나는 실수와 위험 패턴\\n- 결혼 후 발생할 수 있는 갈등 요소\\n- 방어 전략: 사전에 차단하는 방법\\n\\n▶ 재물 및 투자 리스크\\n\\n- 이 사람이 특히 조심해야 할 재물 손실 상황\\n- 충동적 소비나 잘못된 투자의 패턴\\n- 방어 전략: 재산 보호를 위한 구체적 지침\\n\\n▶ 건강 리스크\\n\\n- 사주에서 나타나는 건강 위험 시기\\n- 정신적 번아웃이나 신체적 소진의 징후\\n- 방어 전략: 리스크 최소화 방법\\n\\n▶ 커리어 및 사업 리스크\\n\\n- 직업 및 사업에서 조심해야 할 함정\\n- 실패하기 쉬운 결정 패턴\\n- 방어 전략: 구체적인 리스크 관리 방안\\n\\n▶ 종합 방어 전략 및 위기 탈출 플랜\\n\\n- 위기 상황에서의 즉각 대처 방법\\n- 장기적 리스크를 줄이는 근본 전략",
  "riskKeywords": ["주의사항", "방어기제", "해결책"],

  "coreLifeMission": "▶ 이 사람의 운명적 본질\\n\\n- 사주 원국에서 드러나는 이 사람의 근본 운명\\n- 태어날 때부터 타고난 삶의 테마와 과업\\n\\n▶ 삶의 핵심 사명\\n\\n- 이 생에서 반드시 이루어야 할 과업\\n- 이 사람이 세상에 기여할 수 있는 고유한 가치\\n\\n▶ 삶을 대하는 올바른 자세\\n\\n- 이 운명을 살아가기 위해 가져야 할 마음가짐\\n- 무엇을 기준으로 삶의 선택을 해야 하는가\\n- 어떤 가치를 중심에 두어야 하는가\\n\\n▶ 구체적 행동 강령\\n\\n- 지금 당장 실천해야 할 행동 강령 1: 상세 설명\\n- 행동 강령 2: 상세 설명\\n- 행동 강령 3: 상세 설명\\n- 행동 강령 4: 상세 설명\\n- 행동 강령 5: 상세 설명\\n\\n▶ 인생의 중요한 결정을 내릴 때 기준\\n\\n- 이 사람만의 의사결정 철학\\n- 후회 없는 선택을 위한 3가지 원칙\\n\\n▶ 운명을 개척하는 핵심 전략\\n\\n- 타고난 기질을 최대로 살리는 방법\\n- 약점을 극복하고 강점을 극대화하는 장기 전략\\n\\n▶ 이 운명이 주는 최종 메시지\\n\\n- 이 사람에게 삶이 전하는 궁극적인 메시지",
  "coreLifeKeywords": ["사명", "목표", "가치"],

${specialRequestSchema}
  "strategicDirective": "▶ 이 사람은 누구인가\\n\\n- 사주와 MBTI를 종합한 이 사람의 정의\\n- 이 사람만의 고유한 강점과 잠재력\\n\\n▶ 핵심 운명 전략\\n\\n- 이 운명에 최적화된 삶의 전략 1: 상세 설명\\n- 전략 2: 상세 설명\\n- 전략 3: 상세 설명\\n\\n▶ 반드시 명심해야 할 사항\\n\\n- 명심사항 1: 설명\\n- 명심사항 2: 설명\\n- 명심사항 3: 설명\\n\\n▶ 절대 하지 말아야 할 것\\n\\n- 주의사항 1: 설명\\n- 주의사항 2: 설명\\n\\n▶ 10년 내 반드시 이루어야 할 과업\\n\\n- 과업 1: 설명\\n- 과업 2: 설명\\n\\n▶ 최종 선언\\n\\n- 이 사람이 마음에 새겨야 할 한 줄의 좌우명",
  "strategicKeywords": ["핵심지침1", "핵심지침2", "핵심지침3"],
  "quarterlyLuck": [
    { "period": "1분기 (1~3월)", "summary": "이 시기 대운 흐름과 에너지 패턴 상세 설명", "point": "이 분기에 집중해야 할 구체적 행동 지침" },
    { "period": "2분기 (4~6월)", "summary": "이 시기 대운 흐름과 에너지 패턴 상세 설명", "point": "이 분기에 집중해야 할 구체적 행동 지침" },
    { "period": "3분기 (7~9월)", "summary": "이 시기 대운 흐름과 에너지 패턴 상세 설명", "point": "이 분기에 집중해야 할 구체적 행동 지침" },
    { "period": "4분기 (10~12월)", "summary": "이 시기 대운 흐름과 에너지 패턴 상세 설명", "point": "이 분기에 집중해야 할 구체적 행동 지침" }
  ]
}

[작성 수칙 — 엄수]
1. 영어 단어 절대 사용 금지 (MBTI 유형명 4글자 표기는 예외).
2. 메타 텍스트("(이상)", "(분량)", "(상세 분석)" 등) 출력 절대 금지.
3. 각 필드 최소 분량: congenitalSummary 1,500자, wealthAnalysis 1,800자, relationshipAnalysis 3,000자, healthAnalysis 2,000자, macroDecadeTrend 3,500자, partnerAnalysis 2,500자, riskAnalysis 2,500자, coreLifeMission 3,500자, strategicDirective 2,500자. (특히 macroDecadeTrend는 3개년 분석인 만큼 매우 구체적이고 깊이 있게 작성하세요.)
4. 모든 ▶ 소주제 이후에는 반드시 빈 줄(\\n\\n)로 구분하고, 불렛포인트는 각각 \\n- 로 시작.
5. 사주 데이터: 'userSaju' 필드에는 아래 제공되는 [사주 데이터] JSON을 그대로 복사.
6. 오직 JSON만 출력.`;

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
                    maxTokens: 12000,
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
