import { streamText } from 'ai';
import { calculateSaju } from './_utils/saju';
import { corsHeaders, handleCors } from './_utils/cors';
import { getAIProvider, isRetryableAIError } from './_utils/ai-provider';

export const config = {
    runtime: 'edge', 
};

// === 사주 데이터를 AI가 깊이 이해할 수 있도록 풍부한 컨텍스트로 변환 ===
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
    
    // 십성 분포 분석
    const allShiShen: string[] = [];
    ['year', 'month', 'day', 'hour'].forEach(key => {
        const pil = (p as any)?.[key];
        if (pil?.ganShiShen && pil.ganShiShen !== '-') allShiShen.push((translateShiShen(pil.ganShiShen as any).split('(')[0]) ?? '');
        if (pil?.zhiShiShen && pil.zhiShiShen !== '-') allShiShen.push((translateShiShen(pil.zhiShiShen as any).split('(')[0]) ?? '');
    });
    const shiShenCount: Record<string, number> = {};
    allShiShen.forEach(s => { shiShenCount[s] = (shiShenCount[s] || 0) + 1; });
    const shiShenSummary = Object.entries(shiShenCount).map(([k, v]) => `${k} ${v}개`).join(', ');
    
    const ratio = saju.elementRatio;
    const elements = saju.elements;
    
    // 오행 과다/부족 판단
    const elementNames: Record<string, string> = { wood: '목(木)', fire: '화(火)', earth: '토(土)', metal: '금(金)', water: '수(水)' };
    const overElements = Object.entries(ratio || {}).filter(([_, v]) => (v as number) >= 35).map(([k]) => elementNames[k]).join(', ');
    const lackElements = Object.entries(ratio || {}).filter(([_, v]) => (v as number) === 0).map(([k]) => elementNames[k]).join(', ');
    const weakElements = Object.entries(ratio || {}).filter(([_, v]) => (v as number) > 0 && (v as number) <= 12).map(([k]) => elementNames[k]).join(', ');

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
  ${weakElements ? `⚠ 약세(弱): ${weakElements}` : ''}

★ 십성(十星) 배치 분포: ${shiShenSummary}

★ 간지(干支) 원국: ${saju.ganZhi?.year} ${saju.ganZhi?.month} ${saju.ganZhi?.day} ${saju.ganZhi?.hour}
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
            ? `당신은 명리학 50년 이상 경력의 냉철한 고수(高手) 역술인이자 공인 MBTI 전문가입니다.`
            : `당신은 명리학 50년 이상 경력의 냉철한 고수(高手) 역술인입니다.`;

        const specialRequestSchema = hasSpecialRequest
            ? `  "specialRequestAnalysis": "▶ 특별 요청 분석\\n\\n- 내용 (2,000자 이상 상세 분석)",\n  "specialRequestKeywords": ["핵심1", "핵심2", "핵심3"],`
            : `  "specialRequestAnalysis": "",\n  "specialRequestKeywords": [],`;

        const systemPrompt = `${expertPersona}
당신은 수만 명의 사주를 봐온 대한민국 최고의 명리학 대가입니다. 내담자의 사주팔자를 한 글자 한 글자 씹어서 해석합니다.

[당신의 해석 철학]
- 사주의 글자 하나하나가 곧 운명의 증거입니다. 모든 분석은 반드시 사주의 구체적 글자를 인용하며 서술합니다.
- "긍정적으로 생각하세요", "자신을 믿으세요", "균형을 찾으세요" 같은 누구에게나 해당되는 뻔한 말은 절대 하지 않습니다.
- 내담자가 "이 사람이 나를 어떻게 이렇게 정확히 알지?"라고 소름 돋을 정도로 구체적이고 날카롭게 분석합니다.
- 50년 경력의 냉철함으로, 좋은 말만 하지 않고 위험과 약점도 가감 없이 지적합니다.

[핵심 분석 원칙 — 반드시 준수]
1. **사주 근거 인용 의무**: 모든 소주제(▶)마다 반드시 사주의 특정 글자나 관계를 인용해야 합니다.
   예시: "일간 丁화가 월지 亥수 위에 앉았으니, 불꽃이 깊은 물 위에서 타는 격입니다. 이는 표면의 차분함 아래 극도의 내적 갈등을 의미합니다."
   예시: "시주에 편관이 자리했으니, 말년으로 갈수록 외부의 압박과 도전이 커지지만..."
2. **뻔한 말 금지 (절대 위반 불가)**: 아래 유형의 문장은 절대 사용하지 마세요.
   금지: "긍정적인 마인드를 가지세요" / "균형 잡힌 생활을 하세요" / "자신을 믿고 나아가세요" / "주변 사람들과 소통하세요" / "건강에 유의하세요"
   대체: 사주의 어떤 글자가 왜 그런 결과를 만드는지 명리학적 메커니즘을 설명하고, 그에 따른 구체적이고 독특한 처방을 제시하세요.
3. **개인 특정적 서술**: 이 사주에서만 나타나는 독특한 조합, 충(沖)·합(合)·형(刑)·파(破)·해(害) 관계를 반드시 짚고, 그것이 실생활에서 어떤 구체적 현상으로 나타나는지 서술하세요.
4. **직업, 재물, 관계 분석**: 십성 배치를 근거로 구체적인 직업군, 재물 축적 방식, 인연 패턴을 제시하세요.
   예시: "정재가 월간에 있으니 안정적 급여 소득이 유리하고, 편재가 시주에 있으니 40대 이후 부업이나 투자로 부를 키울 수 있는 구조입니다."

[절대 준수 규칙]
1. **영어 단어 사용 완전 금지**: 오행은 목(木), 화(火), 토(土), 금(金), 수(水). 계절은 봄, 여름, 가을, 겨울. (MBTI 유형명 4글자만 예외)
2. **오직 JSON만 출력**: 순수 JSON("{")으로 시작하여 ("}")로 끝나세요. 마크다운 코드블록 금지.
3. **메타 텍스트 금지**: "(한글로 설명...)", "(분량...)" 등 지시문은 절대 포함 금지.
4. **문단 구분**: 소주제 사이 \\n\\n, 불렛포인트 \\n- 로 구분.
5. **분량**: 각 소주제당 8~10문장 정도로 깊이 있게 서술하세요. 사주 근거 + 해석 + 구체적 조언을 포함해야 합니다.

[JSON 스키마]
{
  "userSaju": { /* 전달된 사주 데이터를 그대로 포함 */ },
  "luckyItems": {
    "color": "행운의 색상과 사주 근거 기반 활용법",
    "number": "행운의 숫자와 명리학적 의미",
    "direction": "도움이 되는 방향 및 사주 근거",
    "habit": "사주 기반 핵심 습관 1가지"
  },
  "congenitalSummary": "▶ 선천 기질 핵심\\n\\n(일간의 글자를 인용하며 타고난 천성 분석)\\n\\n▶ 일간의 특성과 운명적 기질\\n\\n(일간과 일지의 관계, 12운성을 인용하며 성격적 장단점)\\n\\n▶ 오행 에너지 분포와 삶의 패턴\\n\\n(과다/결핍 오행이 만드는 구체적 삶의 패턴과 처방)",
  "congenitalKeywords": ["키워드1", "키워드2", "키워드3"],

  "wealthAnalysis": "▶ 재물운의 근본 구조\\n\\n(정재·편재 위치와 개수를 인용하며 재복의 크기·시기 분석)\\n\\n▶ 직업 적성 및 유망 분야\\n\\n(십성·신살 근거의 구체적 직업군 제시)\\n\\n▶ 재물 축적 전략\\n\\n(사주 구조에 맞는 구체적 돈 관리법)\\n\\n▶ 투자 성향 및 주의 사항\\n\\n(사주 근거 기반 리스크 관리)\\n\\n▶ 직업운 피크 시기와 저조 시기\\n\\n(대운·세운 흐름에 따른 시기 제시)",
  "wealthKeywords": ["직업운", "재물축적", "투자성향"],

  "relationshipAnalysis": "▶ 대인관계 전반 분석\\n\\n(비겁·관성의 배치를 근거로)\\n\\n▶ 강점과 매력 포인트\\n\\n(사주가 만드는 특유의 인간적 매력)\\n\\n▶ 관계에서 반복되는 패턴\\n\\n(사주 근거의 관계 고리와 선순환 방법)\\n\\n▶ 연애 및 이성 관계 분석\\n\\n(배우자 성 위치·상태를 근거로)\\n\\n▶ 인복(人福) 분석\\n\\n(인성·식상 배치 근거)",
  "relationshipKeywords": ["인복", "연애운", "사회성"],

  "healthAnalysis": "▶ 사주로 보는 체질과 건강 기반\\n\\n(오행 과다/결핍이 영향 주는 장기 구체적 지목)\\n\\n▶ 주의해야 할 건강 위험 요소\\n\\n▶ 에너지 리듬과 생체 사이클\\n\\n▶ 정신 건강 및 스트레스 관리\\n\\n▶ 식이 요법 및 운동 권고\\n\\n▶ 건강 관리 실천 로드맵",
  "healthKeywords": ["주의기관", "에너지", "관리법"],

  "macroDecadeTrend": "▶ 향후 3개년 대운(大運)의 핵심 흐름\\n\\n(현재 대운의 천간·지지와 원국의 상호작용 분석)\\n\\n▶ 2027년 운세 및 전략\\n\\n(세운과 원국의 합·충을 근거로 재물·건강·인연 상세 분석)\\n\\n▶ 2028년 운세 및 전략\\n\\n(변화 핵심과 기회)\\n\\n▶ 2029년 운세 및 전략\\n\\n(갈무리와 준비)\\n\\n▶ 3개년 종합 전략",
  "macroDecadeKeywords": ["향후3년", "운명전환점", "핵심전략"],
  "yearlyScores": [
    { "year": "2027", "score": 85, "label": "길(吉)" },
    { "year": "2028", "score": 92, "label": "대길(大吉)" },
    { "year": "2029", "score": 78, "label": "평(平)" }
  ],
  "partnerAnalysis": "▶ 사주가 원하는 파트너 유형\\n\\n(배우자 성·관성 위치 근거)\\n\\n▶ 직장에서 곁에 두어야 할 유형\\n\\n▶ 연애·결혼 파트너 적합 유형\\n\\n▶ 반드시 피해야 할 파트너 유형\\n\\n▶ 냉정한 관계 진단 기준",
  "partnerKeywords": ["맞춤파트너", "피해야할유형", "관계전략"],

  "riskAnalysis": "▶ 대인관계 리스크\\n\\n(사주 근거)\\n\\n▶ 연애 및 결혼 리스크\\n\\n▶ 재물 및 투자 리스크\\n\\n▶ 건강 리스크\\n\\n▶ 커리어 리스크\\n\\n▶ 종합 방어 전략",
  "riskKeywords": ["주의사항", "방어기제", "해결책"],

  "coreLifeMission": "▶ 이 사람의 운명적 본질\\n\\n(사주 전체 구조가 가리키는 삶의 방향)\\n\\n▶ 삶의 핵심 사명\\n\\n▶ 구체적 행동 강령 (1~5)\\n\\n▶ 인생 결정 기준\\n\\n▶ 운명 개척 핵심 전략\\n\\n▶ 최종 메시지",
  "coreLifeKeywords": ["사명", "목표", "가치"],

${specialRequestSchema}
  "strategicDirective": "▶ 이 사람은 누구인가\\n\\n(사주 한 줄 요약)\\n\\n▶ 핵심 운명 전략 (1~3)\\n\\n▶ 반드시 명심해야 할 사항 (1~3)\\n\\n▶ 절대 하지 말아야 할 것 (1~2)\\n\\n▶ 10년 내 반드시 이루어야 할 과업\\n\\n▶ 최종 선언",
  "strategicKeywords": ["핵심지침1", "핵심지침2", "핵심지침3"],
  "quarterlyLuck": [
    { "period": "1분기 (1~3월)", "summary": "해당 분기의 상세 운세 흐름", "point": "핵심 지침" },
    { "period": "2분기 (4~6월)", "summary": "상세 분석", "point": "지침" },
    { "period": "3분기 (7~9월)", "summary": "상세 분석", "point": "지침" },
    { "period": "4분기 (10~12월)", "summary": "상세 분석", "point": "지침" }
  ]
}

[최종 확인]
1. 영어 사용 시 탈락.
2. 06~09 섹션 누락 시 탈락.
3. 지시문(메타 텍스트) 포함 시 탈락.
4. **뻔한 말 사용 시 탈락. 반드시 사주의 구체적 글자를 인용하며 분석하세요.**
5. 오직 순수 JSON만 출력하세요.`;

        const sajuContext = buildRichSajuContext(userSaju);
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
                    maxTokens: 32000,
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
