import { createClient } from '@supabase/supabase-js';
import { generateText } from 'ai';
import { calculateSaju } from './_utils/saju';
import { getAIProvider } from './_utils/ai-provider';

type VercelRequest = any;
type VercelResponse = any;

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

const ZHI_MAP_LOCAL: Record<string, { korean: string; element: string; animal: string }> = {
    '子': { korean: '자', element: '수(水)', animal: '쥐' }, '丑': { korean: '축', element: '토(土)', animal: '소' },
    '寅': { korean: '인', element: '목(木)', animal: '호랑이' }, '卯': { korean: '묘', element: '목(木)', animal: '토끼' },
    '辰': { korean: '진', element: '토(土)', animal: '용' }, '巳': { korean: '사', element: '화(火)', animal: '뱀' },
    '午': { korean: '오', element: '화(火)', animal: '말' }, '未': { korean: '미', element: '토(土)', animal: '양' },
    '申': { korean: '신', element: '금(金)', animal: '원숭이' }, '酉': { korean: '유', element: '금(金)', animal: '닭' },
    '戌': { korean: '술', element: '토(土)', animal: '개' }, '亥': { korean: '해', element: '수(水)', animal: '돼지' },
};

const SS_MAP: Record<string, string> = {
    '比肩': '비견(나와 같은 기운)', '劫財': '겁재(경쟁·승부)', '劫财': '겁재(경쟁·승부)',
    '食神': '식신(재능·여유)', '傷官': '상관(창의·반항)', '伤官': '상관(창의·반항)',
    '偏財': '편재(변동재물)', '偏财': '편재(변동재물)', '正財': '정재(안정재물)', '正财': '정재(안정재물)',
    '偏官': '편관(권위·압박)', '七殺': '편관(권위·압박)', '正官': '정관(명예·질서)',
    '偏印': '편인(독창·편학)', '正印': '정인(학문·인덕)',
};

function trSS(s: any): string {
    if (!s || s === '-') return '-';
    let r = Array.isArray(s) ? s.join('') : String(s);
    for (const [zh, ko] of Object.entries(SS_MAP)) r = r.replace(new RegExp(zh, 'g'), ko);
    return r.trim();
}

function buildRichContext(saju: any): string {
    if (!saju) return '';
    const p = saju.pillars;
    const dm = saju.dayMaster;
    
    const desc = (label: string, meaning: string, pil: any) => {
        if (!pil) return '';
        const gi = GAN_MAP[pil.gan] || { korean: pil.gan, element: '?', desc: '?' };
        const zi = ZHI_MAP_LOCAL[pil.zhi] || { korean: pil.zhi, element: '?', animal: '?' };
        const ganSS = trSS(pil.ganShiShen);
        const zhiSS = trSS(pil.zhiShiShen);
        const hidden = pil.hiddenStems?.length > 0 
            ? pil.hiddenStems.map((s: string) => GAN_MAP[s]?.korean || s).join(', ')
            : '없음';
        return `■ ${label} (${meaning}): ${pil.gan}${pil.zhi}
  - 천간: ${pil.gan} ${gi.korean} ${gi.element} — ${gi.desc}
  - 지지: ${pil.zhi} ${zi.korean}(${zi.animal}) ${zi.element}
  - 천간십성: ${ganSS} / 지지십성: ${zhiSS}
  - 12운성: ${pil.twelveStages || '-'} / 12신살: ${pil.twelveSpirits || '-'}
  - 지장간(숨은 기운): ${hidden}`;
    };
    
    const yearDesc = desc('년주(年柱)', '조상운·유년기·사회적 환경', p?.year);
    const monthDesc = desc('월주(月柱)', '부모운·청년기·직업·사회성의 토대', p?.month);
    const dayDesc = desc('일주(日柱)', '본인·배우자운·핵심 성격', p?.day);
    const hourDesc = desc('시주(時柱)', '자녀운·말년운·내면의 욕구', p?.hour);

    // 십성 분포 분석
    const allShiShen: string[] = [];
    ['year', 'month', 'day', 'hour'].forEach(key => {
        const pil = (p as any)?.[key];
        if (pil?.ganShiShen && pil.ganShiShen !== '-') allShiShen.push((trSS(pil.ganShiShen).split('(')[0]) ?? '');
        if (pil?.zhiShiShen && pil.zhiShiShen !== '-') allShiShen.push((trSS(pil.zhiShiShen).split('(')[0]) ?? '');
    });
    const shiShenCount: Record<string, number> = {};
    allShiShen.forEach(s => { shiShenCount[s] = (shiShenCount[s] || 0) + 1; });
    const shiShenSummary = Object.entries(shiShenCount).map(([k, v]) => `${k} ${v}개`).join(', ');
    
    const ratio = saju.elementRatio;
    const elements = saju.elements;
    const elementNames: Record<string, string> = { wood: '목(木)', fire: '화(火)', earth: '토(土)', metal: '금(金)', water: '수(水)' };
    const over = Object.entries(ratio || {}).filter(([_, v]) => (v as number) >= 35).map(([k]) => elementNames[k]).join(', ');
    const lack = Object.entries(ratio || {}).filter(([_, v]) => (v as number) === 0).map(([k]) => elementNames[k]).join(', ');
    const weak = Object.entries(ratio || {}).filter(([_, v]) => (v as number) > 0 && (v as number) <= 12).map(([k]) => elementNames[k]).join(', ');

    return `
[내담자 사주팔자(四柱八字) 정밀 분석 데이터]

★ 일간(日干·본인의 본질): ${dm?.chinese} ${dm?.korean} — ${GAN_MAP[dm?.chinese]?.desc || dm?.description}

${yearDesc}

${monthDesc}

${dayDesc}

${hourDesc}

★ 오행(五行) 에너지 분포:
  목(木) ${ratio?.wood || 0}% (${elements?.wood || 0}개) / 화(火) ${ratio?.fire || 0}% (${elements?.fire || 0}개) / 토(土) ${ratio?.earth || 0}% (${elements?.earth || 0}개) / 금(金) ${ratio?.metal || 0}% (${elements?.metal || 0}개) / 수(水) ${ratio?.water || 0}% (${elements?.water || 0}개)
  ${over ? `⚠ 과다(偏重): ${over}` : ''}
  ${lack ? `⚠ 결핍(缺): ${lack}` : ''}
  ${weak ? `⚠ 약세(弱): ${weak}` : ''}

★ 십성(十星) 배치 분포: ${shiShenSummary}

★ 간지(干支) 원국: ${saju.ganZhi?.year} ${saju.ganZhi?.month} ${saju.ganZhi?.day} ${saju.ganZhi?.hour}
`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { orderId } = req.body;
    if (!orderId) {
        return res.status(400).json({ message: 'Missing orderId' });
    }

    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
        const { data: request, error: fetchError } = await supabase
            .from('deep_report_requests')
            .select('*, profiles:user_id(name)')
            .eq('order_id', orderId)
            .single();

        if (fetchError || !request) {
            return res.status(404).json({ message: 'Request not found' });
        }

        if (request.generated_data) {
            return res.status(200).json({ success: true, message: 'Already generated' });
        }

        const name = request.profiles?.name;
        const { mbti, birth_info, report_type, special_requests, partner_info } = request;

        let userSaju = null;
        if (birth_info) {
            const [bDate, bTime] = birth_info.split(' ');
            userSaju = calculateSaju(bDate, bTime || '12:00');
        }

        const isMbtiMode = report_type && report_type.includes('MBTI');
        const hasSpecialRequest = special_requests && special_requests.trim() !== '' && special_requests !== '없음';

        const expertPersona = isMbtiMode
            ? `당신은 명리학 50년 이상 경력의 냉철한 고수 역술인이자 공인 MBTI 전문가입니다.`
            : `당신은 명리학 50년 이상 경력의 냉철한 고수 역술인입니다.`;

        const specialRequestSchema = hasSpecialRequest
            ? `  "specialRequestAnalysis": "▶ 특별 요청 분석\\n\\n- 내용 (2,000자 이상 상세 분석)",\n  "specialRequestKeywords": ["핵심1", "핵심2", "핵심3"],`
            : `  "specialRequestAnalysis": "",\n  "specialRequestKeywords": [],`;

        const systemPrompt = `${expertPersona}
당신은 수만 명의 사주를 봐온 대한민국 최고의 명리학 대가입니다.

[해석 철학]
- 모든 분석은 반드시 사주의 구체적 글자(천간·지지·십성)를 인용하며 서술합니다.
- "긍정적으로 생각하세요", "자신을 믿으세요" 같은 누구에게나 해당되는 뻔한 말은 절대 금지.
- 내담자가 소름 돋을 정도로 구체적이고 날카롭게 분석합니다.
- 좋은 말만 하지 않고 위험과 약점도 냉철히 지적합니다.

[핵심 원칙]
1. **사주 근거 인용 의무**: 모든 소주제(▶)마다 사주의 특정 글자나 관계를 반드시 인용.
   예: "일간 丁화가 월지 亥수 위에 앉아 불꽃이 깊은 물 위에서 타는 격"
2. **뻔한 말 절대 금지**: 사주의 어떤 글자가 왜 그런 결과를 만드는지 메커니즘을 설명하고 독특한 처방 제시.
3. **개인 특정적 서술**: 충·합·형·파·해 관계를 짚고 실생활 현상으로 연결.
4. **직업/재물/관계**: 십성 배치 근거로 구체적인 직업군, 재물 방식, 인연 패턴 제시.

[절대 준수 규칙]
1. 영어 단어 완전 금지. 오행은 목(木), 화(火), 토(土), 금(金), 수(水). (MBTI 유형명 예외)
2. 오직 JSON만 출력. 마크다운 코드블록 금지.
3. 메타 텍스트 금지.
4. 문단 구분: 소주제 사이 \\n\\n, 불렛포인트 \\n- 구분.
5. 각 필드 최소 분량: congenitalSummary 1500자, wealthAnalysis 1800자, relationshipAnalysis 3000자, healthAnalysis 2000자, macroDecadeTrend 2500자, partnerAnalysis 2500자, riskAnalysis 2500자, coreLifeMission 3500자, strategicDirective 2500자.
6. 오직 JSON만 출력.

[JSON 스키마]
{
  "luckyItems": {
    "color": "행운의 색상과 사주 근거 기반 활용법",
    "number": "행운의 숫자와 명리학적 의미",
    "direction": "도움이 되는 방향 및 사주 근거",
    "habit": "사주 기반 핵심 습관"
  },
  "congenitalSummary": "▶ 선천 기질 핵심\\n\\n- 내용\\n\\n▶ 일간의 특성과 운명적 기질\\n\\n- 내용\\n\\n▶ 오행 에너지 분포와 삶의 패턴\\n\\n- 내용",
  "congenitalKeywords": ["키워드1", "키워드2", "키워드3"],
  "wealthAnalysis": "...", "wealthKeywords": [...],
  "relationshipAnalysis": "...", "relationshipKeywords": [...],
  "healthAnalysis": "...", "healthKeywords": [...],
  "macroDecadeTrend": "...", "macroDecadeKeywords": [...],
  "partnerAnalysis": "...", "partnerKeywords": [...],
  "riskAnalysis": "...", "riskKeywords": [...],
  "coreLifeMission": "...", "coreLifeKeywords": [...],
${specialRequestSchema}
  "strategicDirective": "...", "strategicKeywords": [...],
  "quarterlyLuck": [
    { "period": "1분기 (1~3월)", "summary": "...", "point": "..." },
    { "period": "2분기 (4~6월)", "summary": "...", "point": "..." },
    { "period": "3분기 (7~9월)", "summary": "...", "point": "..." },
    { "period": "4분기 (10~12월)", "summary": "...", "point": "..." }
  ]
}

[최종 확인]
1. 영어 사용 시 탈락.
2. 뻔한 말 사용 시 탈락. 반드시 사주의 구체적 글자를 인용하며 분석하세요.
3. 메타 텍스트 포함 시 탈락.
4. 오직 순수 JSON만 출력.`;

        const sajuContext = userSaju ? buildRichContext(userSaju) : '';
        const userQuery = `이름: ${name}, MBTI: ${mbti}, 생년월일시: ${birth_info}, 유형: ${report_type}, 요청: ${special_requests}\n${sajuContext}`;

        const { model } = getAIProvider(0);
        const { text } = await generateText({ model, system: systemPrompt, prompt: userQuery, maxTokens: 24000 } as any);

        let cleanedText = text.trim();
        if (cleanedText.startsWith('```')) {
            cleanedText = cleanedText.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '');
        }

        const parsedData = JSON.parse(cleanedText);
        const dataToSave = { ...parsedData, userSaju, reportType: report_type, mbti, clientName: name, birthInfo: birth_info };

        await supabase.from('deep_report_requests').update({ generated_data: dataToSave, generated_at: new Date().toISOString(), status: 'paid' }).eq('order_id', orderId);

        return res.status(200).json({ success: true, message: 'Generated' });
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message });
    }
}
