import { streamText } from 'ai';
import { calculateSaju } from './_utils/saju';
import { corsHeaders, handleCors } from './_utils/cors';
import { getAIProvider, isRetryableAIError } from './_utils/ai-provider';

export const config = {
    runtime: 'edge', 
};

const GAN_MAP: Record<string, { korean: string; element: string; desc: string }> = {
    '甲': { korean: '갑목', element: '목(木)', desc: '양의 목. 큰 나무, 대들보. 곧고 강한 리더십, 고집, 개척정신' },
    '乙': { korean: '을목', element: '목(木)', desc: '음의 목. 화초, 덩굴. 유연하고 적응력 강함, 끈기, 현실적 처세' },
    '丙': { korean: '병화', element: '화(火)', desc: '양의 화. 태양. 밝고 열정적, 공명정대, 화려함과 관대함' },
    '丁': { korean: '정화', element: '화(火)', desc: '음의 화. 촛불, 달빛. 은은한 집중력, 헌신, 예민한 감수성' },
    '戊': { korean: '무토', element: '토(土)', desc: '양의 토. 큰 산, 넓은 대지. 묵직한 포용력, 신용, 중재' },
    '己': { korean: '기토', element: '토(土)', desc: '음의 토. 논밭, 정원. 실속형, 어머니의 마음, 자기방어 본능' },
    '庚': { korean: '경금', element: '금(金)', desc: '양의 금. 바위, 무쇠. 결단력, 의리, 개혁, 강인함과 냉정함' },
    '辛': { korean: '신금', element: '금(金)', desc: '음의 금. 보석, 칼. 예리함, 섬세함, 깔끔함, 냉철한 판단' },
    '壬': { korean: '임수', element: '수(水)', desc: '양의 수. 바다, 큰 강. 지혜와 포용, 총명함, 흐르는 유연함' },
    '癸': { korean: '계수', element: '수(水)', desc: '음의 수. 비, 시냇물. 섬세한 지혜, 참모형, 아이디어의 샘' },
};

const ZHI_MAP: Record<string, { korean: string; element: string; animal: string }> = {
    '子': { korean: '자', element: '수(水)', animal: '쥐' },
    '丑': { korean: '축', element: '토(土)', animal: '소' },
    '寅': { korean: '인', element: '목(木)', animal: '호랑이' },
    '卯': { korean: '묘', element: '목(木)', animal: '토끼' },
    '辰': { korean: '진', element: '토(土)', animal: '용' },
    '巳': { korean: '사', element: '화(火)', animal: '뱀' },
    '午': { korean: '오', element: '화(火)', animal: '말' },
    '未': { korean: '미', element: '토(土)', animal: '양' },
    '申': { korean: '신', element: '금(金)', animal: '원숭이' },
    '酉': { korean: '유', element: '금(金)', animal: '닭' },
    '戌': { korean: '술', element: '토(土)', animal: '개' },
    '亥': { korean: '해', element: '수(水)', animal: '돼지' },
};

const SHISHEN_MAP: Record<string, string> = {
    '比肩': '비견(나와 같은 기운·자존심·독립)', '劫財': '겁재(경쟁·승부욕·재물쟁탈)', '劫财': '겁재(경쟁·승부욕·재물쟁탈)',
    '食神': '식신(재능발현·여유·식복)', '傷官': '상관(창의·반항·날카로운 표현)', '伤官': '상관(창의·반항·날카로운 표현)',
    '偏財': '편재(변동재물·투기·아버지)', '偏财': '편재(변동재물·투기·아버지)', '正財': '정재(안정재물·근면·아내)', '正财': '정재(안정재물·근면·아내)',
    '偏官': '편관(권위·압박·도전)', '七殺': '편관(권위·압박·도전)', '正官': '정관(명예·질서·직장)',
    '偏印': '편인(편학·독창성·고독)', '正印': '정인(학문·인덕·어머니)',
};

function translateShiShen(s: any): string {
    if (!s || s === '-') return '-';
    let result = Array.isArray(s) ? s.join('') : String(s);
    for (const [zh, ko] of Object.entries(SHISHEN_MAP)) {
        result = result.replace(new RegExp(zh, 'g'), ko);
    }
    return result.trim();
}

function buildRichSajuContext(saju: any): string {
    if (!saju) return '';
    const p = saju.pillars;
    const dm = saju.dayMaster;
    
    const describePillar = (label: string, meaning: string, pillar: any) => {
        if (!pillar) return '';
        const ganInfo = GAN_MAP[pillar.gan] || { korean: pillar.gan, element: '?', desc: '?' };
        const zhiInfo = ZHI_MAP[pillar.zhi] || { korean: pillar.zhi, element: '?', animal: '?' };
        const ganSS = translateShiShen(pillar.ganShiShen);
        const zhiSS = translateShiShen(pillar.zhiShiShen);
        const stages = pillar.twelveStages || '-';
        const spirits = pillar.twelveSpirits || '-';
        const hidden = pillar.hiddenStems?.length > 0 
            ? pillar.hiddenStems.map((s: string) => GAN_MAP[s]?.korean || s).join(', ')
            : '없음';
        return `■ ${label} (${meaning}): ${pillar.gan}${pillar.zhi}
  - 천간: ${pillar.gan} ${ganInfo.korean} ${ganInfo.element} — ${ganInfo.desc}
  - 지지: ${pillar.zhi} ${zhiInfo.korean}(${zhiInfo.animal}) ${zhiInfo.element}
  - 천간십성: ${ganSS} / 지지십성: ${zhiSS}
  - 12운성: ${stages} / 12신살: ${spirits}
  - 지장간(숨은 기운): ${hidden}`;
    };
    
    const yearDesc = describePillar('년주(年柱)', '조상운·유년기·사회적 환경', p?.year);
    const monthDesc = describePillar('월주(月柱)', '부모운·청년기·직업·사회성의 토대', p?.month);
    const dayDesc = describePillar('일주(日柱)', '본인·배우자운·핵심 성격', p?.day);
    const hourDesc = describePillar('시주(時柱)', '자녀운·말년운·내면의 욕구', p?.hour);
    
    const ratio = saju.elementRatio;
    const elements = saju.elements;
    
    const elementNames: Record<string, string> = { wood: '목(木)', fire: '화(火)', earth: '토(土)', metal: '금(金)', water: '수(水)' };
    const overElements = Object.entries(ratio || {}).filter(([_, v]) => (v as number) >= 35).map(([k]) => elementNames[k]).join(', ');
    const lackElements = Object.entries(ratio || {}).filter(([_, v]) => (v as number) === 0).map(([k]) => elementNames[k]).join(', ');

    return `
[내담자 사주팔자(四柱八字) 정밀 분석 데이터]

★ 일간(日干·본인의 본질): ${dm?.chinese} ${dm?.korean} — ${GAN_MAP[dm?.chinese]?.desc || dm?.description}

${yearDesc}

${monthDesc}

${dayDesc}

${hourDesc}

★ 오행(五行) 에너지 분포:
  목(木) ${ratio?.wood || 0}% (${elements?.wood || 0}개) / 화(火) ${ratio?.fire || 0}% (${elements?.fire || 0}개) / 토(土) ${ratio?.earth || 0}% (${elements?.earth || 0}개) / 금(金) ${ratio?.metal || 0}% (${elements?.metal || 0}개) / 수(水) ${ratio?.water || 0}% (${elements?.water || 0}개)
  ${overElements ? `⚠ 과다(偏重): ${overElements}` : ''}
  ${lackElements ? `⚠ 결핍(缺): ${lackElements}` : ''}
`;
}

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
        const { mbti, birthInfo, name } = body;
        
        let birthDate = '';
        let birthTime = '';
        if (birthInfo) {
            const parts = birthInfo.split(' ');
            birthDate = parts[0];
            birthTime = parts[1] || '12:00';
        }
        let userSaju = calculateSaju(birthDate, birthTime);
        
        const sajuContext = buildRichSajuContext(userSaju);

        const expertPersona = `너는 대한민국 최상위 1% VIP를 대상으로 명리학(사주)과 심리학(MBTI)을 융합하여 프리미엄 라이프 컨설팅 보고서를 작성하는 수석 애널리스트이자 전문 카피라이터다.
고객이 제공한 사주 원국 데이터와 MBTI 성향을 분석하여, 반드시 아래 정의된 JSON 형식으로만 응답하라. 보고서의 단가는 49,000원이므로, 고객이 압도적인 통찰력과 가치를 느낄 수 있도록 철저히 분석하고 유려한 문장으로 작성해야 한다.`;

                const systemPrompt = \`${expertPersona}

[!!! 절대 준수 규칙 3가지 !!!]
1. MBTI 제외 영어 사용 절대 금지: 'MBTI'라는 단어를 제외한 어떠한 영단어(Career, Wealth, Action Plan, Synergy, Risk 등)도 본문에 노출해서는 안 된다. 모두 고급스러운 한국어로 번역하여 작성하라. (예: 라이프스타일 -> 삶의 양식, 마인드셋 -> 마음가짐, 커리어 -> 직업적 행보)
2. 명리학 용어 표기법 (한자+한글 병기): 사주원국 분석을 포함하여 사주 전문 용어(십성, 오행, 지지 등)를 사용할 때는 반드시 한글 뒤에 한자를 병기하라. (예: 목(木), 화(火), 정관(正官), 상관(傷官), 일간(日干)). 또한, 천간, 지지, 오행의 의미를 철저히 설명하라. 단, 본문 설명은 유려한 현대 한국어로 작성하라.
3. 분량 극대화 (핵심 요구사항): 현재 요구되는 분량은 기존 대비 3배 이상이다. 
   - 각 대주제당 최소 4개의 개연성 있는 소주제(details)를 작성하라.
   - 글머리표(-, • 등)와 개조식을 적극적으로 활용하여 가독성을 높여라.
   - 내용의 깊이를 더해, 각 대주제가 출력 시 최소 2페이지 이상을 차지할 수 있도록 각 소주제의 'content' 길이를 매우 길게(최소 10~15문장 이상) 작성하라.
4. 3개년 핵심 사주: 다가올 3년의 핵심 운세를 냉정하고 분석적으로 서술하되, 각 연도당 2페이지 분량이 나올 수 있도록 월별/분기별 디테일 및 분야별(재물, 대인관계, 건강) 상세 분석을 극대화하라.
5. 오행 명칭: Wood, Water, Fire 등의 영어 명칭을 절대 사용하지 마라. 오직 목(木), 화(火), 토(土), 금(金), 수(水)만 사용하라.

[출력 JSON 스키마 (JSON 응답 구조)]
반드시 아래의 JSON 키(Key) 값을 유지하되, 값(Value)은 모두 매우 상세한 한국어로 작성하라. 마크다운 백틱 없이 순수 JSON만 출력하라.

{
  "cover": {
    "mainTitle": "고객의 사주와 MBTI를 관통하는 은유적이고 묵직한 메인 카피",
    "subTitle": "고객의 핵심 운명을 요약하는 한 줄 카피"
  },
  "natalChartAnalysis": {
    "title": "00. 사주원국(四柱原局) 심층 분석",
    "details": [
      { "subtitle": "천간(天干)의 기운과 겉으로 드러난 본질", "content": "한자/한글을 병기하여 사주의 천간 기운과 그 의미를 매우 상세히 해설 (10문장 이상). 개조식과 글머리표 적극 활용." },
      { "subtitle": "지지(地支)의 기운과 내면의 잠재력", "content": "한자/한글 병기. 지지에 깔린 현실적 환경과 내면의 본능 상세 해설 (10문장 이상)." },
      { "subtitle": "오행(五行)의 분포와 에너지 균형", "content": "한자/한글 병기. 오행의 조화와 부족한 기운, 그리고 이를 보완할 방법 상세 해설 (10문장 이상)." },
      { "subtitle": "사주원국을 관통하는 핵심 기운과 사명", "content": "전체 사주를 아우르는 통찰과 인생의 사명 (10문장 이상)." }
    ]
  },
  "coreIdentity": {
    "title": "01. 선천적 기질 및 운명적 본질",
    "details": [
      { "subtitle": "기질적 시너지 분석 (MBTI와 사주의 결합)", "content": "MBTI와 사주 오행이 결합되었을 때 나타나는 독보적인 강점 상세 서술 (10문장 이상)." },
      { "subtitle": "무의식적 욕망과 방어기제", "content": "심리적 깊숙한 곳의 방어기제와 이를 활용하는 방법 (10문장 이상)." },
      { "subtitle": "타고난 삶의 사명과 지향점", "content": "인생을 살아가며 좇아야 할 본질적인 가치와 방향성 (10문장 이상)." },
      { "subtitle": "잠재적 리스크 관리 (위험 요소 대비)", "content": "본성 깊은 곳에 숨겨진 리스크와 극복을 위한 심리적 조언 (10문장 이상)." }
    ]
  },
  "wealthAndCareer": {
    "title": "02. 재물 그릇의 크기와 사회적 성취",
    "details": [
      { "subtitle": "최적의 직업적 환경과 포지셔닝", "content": "강점을 증폭시킬 직업적 환경 상세 서술 (10문장 이상)." },
      { "subtitle": "재물 축적 방식 및 자산 관리 전략", "content": "타고난 財星(재성)의 흐름 바탕 재물 축적 방식 (10문장 이상)." },
      { "subtitle": "성취를 앞당기는 구체적 전략", "content": "사회적 성공을 위한 현실적이고 구체적인 액션 플랜 (10문장 이상)." },
      { "subtitle": "재물 및 직업적 흉운을 피하는 방법", "content": "파재(破財)를 피하고 커리어 슬럼프를 예방하는 법 (10문장 이상)." }
    ]
  },
  "relationship": {
    "title": "03. 인연의 지형도와 감정의 흐름",
    "details": [
      { "subtitle": "대인관계 역학 및 귀인 활용법", "content": "사회적 관계망에서의 특징과 귀인을 알아보는 방법 (10문장 이상)." },
      { "subtitle": "감정의 패턴과 최적의 파트너십", "content": "애정 관계에서의 패턴, 심리적 안정감을 주는 파트너 특징 (10문장 이상)." },
      { "subtitle": "운명적 귀인과 악연의 특징", "content": "반드시 곁에 두어야 할 사람과 끊어내야 할 인연의 특징 (10문장 이상)." },
      { "subtitle": "대인관계 갈등 극복 및 소통 방식", "content": "오해를 풀고 관계를 우상향으로 이끄는 구체적 조언 (10문장 이상)." }
    ]
  },
  "threeYearRoadmap": {
    "title": "04. 핵심 3개년 냉철한 심층 분석",
    "details": [
      {
        "year": 2026,
        "yearlyTheme": "2026년 병오(丙午)년의 핵심 테마 카피",
        "subtopics": [
          { "subtitle": "연간 총평 및 거시적 흐름", "content": "해당 연도의 전체 운의 흐름과 냉철한 분석 (10문장 이상)." },
          { "subtitle": "재물 및 직업적 성취", "content": "승부처, 투자운, 직업적 이동수 등을 상/하반기 등 분기별로 나누어 상세 서술 (10문장 이상)." },
          { "subtitle": "대인관계 및 애정 흐름", "content": "해당 연도의 인연법, 피해야 할 사람 등 인간관계의 변화 상세 서술 (10문장 이상)." },
          { "subtitle": "건강 관리 및 개운 전략", "content": "신체/정신적 건강 관리법과 흉운을 피하는 디테일한 개운법 (10문장 이상)." }
        ]
      },
      {
        "year": 2027,
        "yearlyTheme": "2027년 정미(丁未)년의 핵심 테마 카피",
        "subtopics": [
          { "subtitle": "연간 총평 및 거시적 흐름", "content": "해당 연도의 전체 운의 흐름과 냉철한 분석 (10문장 이상)." },
          { "subtitle": "재물 및 직업적 성취", "content": "승부처, 투자운, 직업적 이동수 등을 상/하반기 등 분기별로 나누어 상세 서술 (10문장 이상)." },
          { "subtitle": "대인관계 및 애정 흐름", "content": "해당 연도의 인연법, 피해야 할 사람 등 인간관계의 변화 상세 서술 (10문장 이상)." },
          { "subtitle": "건강 관리 및 개운 전략", "content": "신체/정신적 건강 관리법과 흉운을 피하는 디테일한 개운법 (10문장 이상)." }
        ]
      },
      {
        "year": 2028,
        "yearlyTheme": "2028년 무신(戊申)년의 핵심 테마 카피",
        "subtopics": [
          { "subtitle": "연간 총평 및 거시적 흐름", "content": "해당 연도의 전체 운의 흐름과 냉철한 분석 (10문장 이상)." },
          { "subtitle": "재물 및 직업적 성취", "content": "승부처, 투자운, 직업적 이동수 등을 상/하반기 등 분기별로 나누어 상세 서술 (10문장 이상)." },
          { "subtitle": "대인관계 및 애정 흐름", "content": "해당 연도의 인연법, 피해야 할 사람 등 인간관계의 변화 상세 서술 (10문장 이상)." },
          { "subtitle": "건강 관리 및 개운 전략", "content": "신체/정신적 건강 관리법과 흉운을 피하는 디테일한 개운법 (10문장 이상)." }
        ]
      }
    ]
  },
  "actionPlan": {
    "title": "05. 운명을 바꾸는 마스터의 마스터플랜",
    "details": [
      { "subtitle": "즉각적 실행 과제", "content": "내일부터 당장 실천해야 할 가장 중요한 현실적 조언 (10문장 이상)." },
      { "subtitle": "운의 흐름 강화 전략", "content": "중장기적으로 운의 그릇을 키우기 위한 습관 및 마음가짐 조언 (10문장 이상)." },
      { "subtitle": "관계적 한계 돌파", "content": "사람과 환경을 내 편으로 만드는 심리적/처세술적 조언 (10문장 이상)." },
      { "subtitle": "마스터의 최종 제언", "content": "최종적으로 도달하게 될 최고의 미래상에 대한 격려와 확신 (10문장 이상)." }
    ]
  }
}

[절대 준수 규칙]
1. 오직 순수 JSON만 출력하십시오.
2. 각 대주제당 2페이지 분량이 나오도록 본문을 극한으로 길게 서술하십시오.
3. 사주 근거 없는 말은 단 한 마디도 하지 마십시오.\`;

        const userQuery = `이름: ${name}, MBTI: ${mbti}, 생년월일시: ${birthInfo}\n${sajuContext}`;

        let lastError;
        for (let attempt = 0; attempt < 4; attempt++) {
            try {
                const { model } = getAIProvider(attempt);
                const result = await streamText({
                    model,
                    system: systemPrompt,
                    prompt: userQuery,
                    maxRetries: 0,
                    maxTokens: 16000,
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
