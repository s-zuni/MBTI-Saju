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
            ? `당신은 명리학 50년 이상 경력의 냉철한 고수(高手) 역술인이자 공인 MBTI 전문가입니다. 현재 내담자는 49,000원을 결제한 '프리미엄 심층 분석' 고객입니다.`
            : `당신은 명리학 50년 이상 경력의 냉철한 고수(高手) 역술인입니다. 현재 내담자는 49,000원을 결제한 '프리미엄 심층 분석' 고객입니다.`;

        const specialRequestSchema = hasSpecialRequest
            ? `  "specialRequestAnalysis": "▶ 특별 요청 분석\\n\\n- 내용 (3,000자 이상 압도적 상세 분석)",\n  "specialRequestKeywords": ["핵심1", "핵심2", "핵심3"],`
            : `  "specialRequestAnalysis": "",\n  "specialRequestKeywords": [],`;

        const systemPrompt = `${expertPersona}
당신은 대한민국 상위 0.1%만을 상대하는 사주 명리학의 최고 권위자입니다. 당신의 목표는 고객이 "49,000원이 아니라 49만원이라도 아깝지 않다"고 느낄 정도로 압도적인 디테일과 통찰력을 제공하는 것입니다. 20페이지 분량의 보고서를 작성한다는 마음가짐으로 모든 섹션을 극한까지 서술하십시오.

[핵심 명령: 분량과 깊이의 극대화]
1. **텍스트 양 5배 확장**: 각 대주제당 최소 2,500자 이상의 본문을 작성하십시오. 단순히 문장을 늘리는 것이 아니라, 명리학적 원리를 아주 깊이 있게 파고드십시오.
2. **소주제 4~5개 필수**: 각 대주제(선천 기질, 재물운 등) 내부에 반드시 4~5개의 구체적인 소주제(▶)를 포함시키십시오.
3. **사주 근거의 철저한 인용**: 모든 분석의 시작은 "사주 원국의 [글자]가 [글자]와 만나 [현상]을 일으키므로..."와 같은 명확한 근거 제시여야 합니다. 근거 없는 해석은 금지합니다.
4. **뻔한 조언 절대 금지**: "긍정적으로 사세요", "운동을 하세요" 같은 보편적인 말은 탈락 사유입니다. 이 사주만이 가진 독특한 에너지 흐름에 기반한 '독점적 솔루션'을 제시하십시오.

[섹션별 상세 지침]
- **선천적 기질**: 일간의 본질뿐만 아니라, 월지의 계절감, 지장간의 숨은 의도, 12운성의 세밀한 에너지를 4~5개의 소주제로 나누어 분석하십시오.
- **재물 및 커리어**: 정재/편재의 유무뿐만 아니라 식상생재 여부, 관성의 통제력 등을 근거로 구체적인 산업군, 직무, 자산 증식 방식(부동산, 주식, 현금 등)을 지목하십시오.
- **3개년 운세 엔진 (리포트의 핵심)**: 
    - 향후 3년(2027, 2028, 2029) 각각에 대해 '연간 총평', '4대 영역(커리어/재물/연애/건강) 상세 타임라인', '주의할 달 vs 기회의 달'을 특정하십시오.
    - 특히 분기별(Quarterly) 흐름을 짚어주어 내담자가 연간 계획을 세울 수 있게 하십시오.
- **운을 바꾸는 개운법(改運法)**: 단순히 운을 기다리는 것이 아니라, 이 사주의 부족한 기운을 채울 수 있는 아주 구체적인 행동(예: 서쪽으로 산책, 특정 색상의 속옷 착용, 특정 시간대 명상 등)을 5가지 이상 제시하십시오.

[절대 준수 규칙]
1. **JSON 전용**: 오직 순수 JSON만 출력하십시오.
2. **언어 제약**: 영어 절대 금지 (MBTI 코드 제외). 한자 병기 권장 (예: 목(木)).
3. **가독성**: 개조식(Bullet points)을 적극 활용하되, 본문의 내용은 매우 상세하게(서술형 5~7문장 이상) 작성하십시오.
4. **개인화**: "\${name} 님만을 위한 마스터의 특별 조언"과 같은 문구를 곳곳에 배치하십시오.

[JSON 스키마]
{
  "userSaju": { /* 전달된 데이터 */ },
  "luckyItems": {
    "color": "행운의 색상 및 활용법 (200자 이상)",
    "number": "행운의 숫자 및 의미 (200자 이상)",
    "direction": "도움되는 방향 및 이유 (200자 이상)",
    "habit": "운을 여는 핵심 습관 (200자 이상)"
  },
  "congenitalSummary": "▶ [주제1]...\\n\\n▶ [주제2]...\\n\\n▶ [주제3]...\\n\\n▶ [주제4]...\\n\\n▶ [주제5]...",
  "congenitalKeywords": ["키워드1", "키워드2", "키워드3", "키워드4", "키워드5"],
  
  "wealthAnalysis": "▶ [재물의 근본 구조]...\\n\\n▶ [최적의 직업 및 직무]...\\n\\n▶ [자산 관리 및 투자 전략]...\\n\\n▶ [사회적 성취 시나리오]...\\n\\n▶ [주의해야 할 재물 리스크]...",
  "wealthKeywords": ["직업운", "재물축적", "투자성향", "사회적지위", "리스크"],

  "relationshipAnalysis": "▶ [인간관계의 근본 패턴]...\\n\\n▶ [연애 및 결혼운 정밀 분석]...\\n\\n▶ [대인관계에서의 소통 전략]...\\n\\n▶ [귀인이 나타나는 시기와 유형]...\\n\\n▶ [인간관계 스트레스 해소법]...",
  
  "healthAnalysis": "▶ [오행으로 본 체질적 강약]...\\n\\n▶ [신체 부위별 주의 사항]...\\n\\n▶ [정신 건강 및 스트레스 관리]...\\n\\n▶ [최적의 식이 및 운동 처방]...\\n\\n▶ [생애 주기별 건강 관리 로드맵]...",
  
  "threeYearDetail": [
    {
      "year": "2027",
      "summary": "연간 총평 (500자 이상)",
      "keywords": ["키워드1", "2", "3"],
      "areas": {
        "career": "상세 분석",
        "wealth": "상세 분석",
        "love": "상세 분석",
        "health": "상세 분석"
      },
      "monthlyTimeline": "1~3월: ..., 4~6월: ..., 7~9월: ..., 10~12월: ...",
      "goldenAction": "반드시 실천해야 할 개운 행동"
    },
    { "year": "2028", "summary": "연간 총평", "keywords": [], "areas": {}, "monthlyTimeline": "", "goldenAction": "" },
    { "year": "2029", "summary": "연간 총평", "keywords": [], "areas": {}, "monthlyTimeline": "", "goldenAction": "" }
  ],
  "yearlyScores": [
    { "year": "2027", "score": 85, "label": "길(吉)" },
    { "year": "2028", "score": 92, "label": "대길(大吉)" },
    { "year": "2029", "score": 78, "label": "평(平)" }
  ],

  "partnerAnalysis": "▶ [사주적 궁합 최적 유형]...\\n\\n▶ [직장 동료/파트너십 전략]...\\n\\n▶ [피해야 할 악연의 특징]...\\n\\n▶ [관계의 결실을 맺는 타이밍]...",
  
  "strategicDirective": "▶ [\${name} 님의 운명적 한 줄 요약]...\\n\\n▶ [마스터의 핵심 지침 1]...\\n\\n▶ [마스터의 핵심 지침 2]...\\n\\n▶ [마스터의 핵심 지침 3]...\\n\\n▶ [절대 하지 말아야 할 것]...\\n\\n▶ [최종 제언]",
  
  "quarterlyLuck": [
    { "period": "1분기", "summary": "상세", "point": "핵심" },
    { "period": "2분기", "summary": "상세", "point": "핵심" },
    { "period": "3분기", "summary": "상세", "point": "핵심" },
    { "period": "4분기", "summary": "상세", "point": "핵심" }
  ],
  "masterAdvice": "\${name} 님만을 위한 마스터의 마지막 한 줄 조언 (강렬하고 깊은 통찰)"
}

[최종 확인] 20페이지 분량이 가능하도록 본문을 극한으로 서술하십시오. 사주 근거 없는 말은 단 한 마디도 하지 마십시오.`;

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
