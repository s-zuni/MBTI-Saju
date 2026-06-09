import { Solar, Lunar } from 'lunar-javascript';

export interface SajuResult {
    ganZhi: {
        year: string;
        month: string;
        day: string;
        hour: string;
    };
    dayMaster: {
        korean: string;
        chinese: string;
        element: string;
        polarity: string;
        description: string;
    };
    pillars: {
        year: PillarInfo;
        month: PillarInfo;
        day: PillarInfo;
        hour: PillarInfo;
    };
    elements: {
        wood: number;
        fire: number;
        earth: number;
        metal: number;
        water: number;
    };
    elementRatio: {
        wood: number;
        fire: number;
        earth: number;
        metal: number;
        water: number;
    };
}

export interface PillarInfo {
    gan: string;
    zhi: string;
    ganElement: string;
    zhiElement: string;
    ganShiShen: string;
    zhiShiShen: string;
    hiddenStems: string[];
    twelveStages: string;
    twelveSpirits: string;
}

const GAN_MAP: { [key: string]: { element: string; polarity: string; korean: string } } = {
    '甲': { element: 'wood', polarity: '+', korean: '갑목' },
    '乙': { element: 'wood', polarity: '-', korean: '을목' },
    '丙': { element: 'fire', polarity: '+', korean: '병화' },
    '丁': { element: 'fire', polarity: '-', korean: '정화' },
    '戊': { element: 'earth', polarity: '+', korean: '무토' },
    '己': { element: 'earth', polarity: '-', korean: '기토' },
    '庚': { element: 'metal', polarity: '+', korean: '경금' },
    '辛': { element: 'metal', polarity: '-', korean: '신금' },
    '壬': { element: 'water', polarity: '+', korean: '임수' },
    '癸': { element: 'water', polarity: '-', korean: '계수' },
};

const ZHI_MAP: { [key: string]: { element: string; polarity: string; korean: string } } = {
    '子': { element: 'water', polarity: '+', korean: '자수' }, // Rat
    '丑': { element: 'earth', polarity: '-', korean: '축토' }, // Ox
    '寅': { element: 'wood', polarity: '+', korean: '인목' }, // Tiger
    '卯': { element: 'wood', polarity: '-', korean: '묘목' }, // Rabbit
    '辰': { element: 'earth', polarity: '+', korean: '진토' }, // Dragon
    '巳': { element: 'fire', polarity: '-', korean: '사화' }, // Snake
    '午': { element: 'fire', polarity: '+', korean: '오화' }, // Horse
    '未': { element: 'earth', polarity: '-', korean: '미토' }, // Goat
    '申': { element: 'metal', polarity: '+', korean: '신금' }, // Monkey
    '酉': { element: 'metal', polarity: '-', korean: '유금' }, // Rooster
    '戌': { element: 'earth', polarity: '+', korean: '술토' }, // Dog
    '亥': { element: 'water', polarity: '-', korean: '해수' }, // Pig
};

// Translation Maps for Korean/Hanja 병기
const SHISHEN_TRANSLATE: Record<string, string> = {
    '比肩': '비견(比肩)',
    '劫財': '겁재(劫財)', '劫财': '겁재(劫財)',
    '食神': '식신(食神)',
    '傷官': '상관(傷官)', '伤官': '상관(傷官)',
    '偏財': '편재(偏財)', '偏财': '편재(偏財)',
    '正財': '정재(正財)', '正财': '정재(正財)',
    '偏官': '편관(偏官)',
    '七殺': '편관(七殺)', '七杀': '편관(七殺)',
    '正官': '정관(正官)',
    '偏印': '편인(偏印)',
    '正印': '정인(正印)'
};

const STAGE_TRANSLATE: Record<string, string> = {
    '长生': '장생(長生)', '長生': '장생(長生)',
    '沐浴': '목욕(沐浴)',
    '冠带': '관대(冠帶)', '冠帶': '관대(冠帶)',
    '临官': '건록(建祿)', '臨官': '건록(建祿)',
    '帝旺': '제왕(帝旺)',
    '衰': '쇠(衰)',
    '病': '병(病)',
    '死': '사(死)',
    '墓': '묘(墓)',
    '绝': '절(絶)', '絶': '절(絶)',
    '胎': '태(胎)',
    '养': '양(養)', '養': '양(養)'
};

const SPIRIT_TRANSLATE: Record<string, string> = {
    '지살': '지살(地煞)',
    '연살': '연살(年煞)',
    '월살': '월살(月煞)',
    '망신살': '망신살(亡神)',
    '장성살': '장성살(將星)',
    '반안살': '반안살(攀鞍)',
    '역마살': '역마살(驛馬)',
    '육해살': '육해살(六害)',
    '화개살': '화개살(華蓋)',
    '겁살': '겁살(劫煞)',
    '재살': '재살(災煞)',
    '천살': '천살(天煞)'
};

// 12 Sinsal (Spirits) Mapping based on Triple Combinations (삼합)
const SPIRIT_ORDER = ['지살', '연살', '월살', '망신살', '장성살', '반안살', '역마살', '육해살', '화개살', '겁살', '재살', '천살'];
const ZHI_ORDER = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

function getTwelveSpirits(baseZhi: string, targetZhi: string): string {
    const TRIPLE_COMBO_START: { [key: string]: string } = {
        '寅': '寅', '午': '寅', '戌': '寅', // Fire combo
        '申': '申', '子': '申', '辰': '申', // Water combo
        '亥': '亥', '卯': '亥', '未': '亥', // Wood combo
        '巳': '巳', '酉': '巳', '丑': '巳', // Metal combo
    };

    const startZhi = TRIPLE_COMBO_START[baseZhi];
    if (!startZhi) return '-';

    const startIndex = ZHI_ORDER.indexOf(startZhi);
    const targetIndex = ZHI_ORDER.indexOf(targetZhi);
    
    const distance = (targetIndex - startIndex + 12) % 12;
    const spirit = SPIRIT_ORDER[distance] || '-';
    return SPIRIT_TRANSLATE[spirit] || spirit;
}

const DAY_MASTER_DESC: { [key: string]: string } = {
    '갑목': '대들보, 거목, 리더십, 성장, 시작, 고집',
    '을목': '화초, 덩굴, 적응력, 유연함, 끈기, 현실적',
    '병화': '태양, 확산, 열정, 예의, 공명정대, 화려함',
    '정화': '촛불, 달빛, 은은함, 헌신, 감수성, 집중력',
    '무토': '큰 산, 넓은 땅, 포용력, 신용, 묵직함, 중화',
    '기토': '논밭, 정원, 실속, 포용, 어머니 같은 마음, 자기방어',
    '경금': '바위, 무쇠, 결단력, 의리, 개혁, 강인함',
    '신금': '보석, 칼, 예리함, 섬세함, 깔끔함, 냉철함',
    '임수': '바다, 큰 물, 지혜, 유연함, 포용, 총명함',
    '계수': '비, 시냇물, 지혜, 섬세함, 참모, 아이디어',
};
export function calculateSaju(birthDate: string, birthTime: string | null): SajuResult {
    const partsDate = birthDate.includes('-') ? birthDate.split('-').map(Number) :
                     birthDate.includes('.') ? birthDate.split('.').map(Number) :
                     birthDate.includes('/') ? birthDate.split('/').map(Number) :
                     [Number(birthDate.substring(0, 4)), Number(birthDate.substring(4, 6)), Number(birthDate.substring(6, 8))];
    
    let year = partsDate[0];
    let month = partsDate[1];
    let day = partsDate[2];

    if (year === undefined || month === undefined || day === undefined || 
        isNaN(year) || isNaN(month) || isNaN(day)) {
        throw new Error(`Invalid date parts: ${birthDate}`);
    }

    year = year || 1990;
    month = month || 1;
    day = day || 1;
    let hour = 12;
    let minute = 0;
    let isTimeUnknown = !birthTime;

    if (birthTime) {
        let timeStr = birthTime.trim();
        if (timeStr.includes('-')) {
            timeStr = timeStr.split('-')[0]!.trim();
        }
        
        const parts = timeStr.split(':').map(Number);
        hour = parts[0] ?? 0;
        minute = parts[1] ?? 0;
        
        if (isNaN(hour) || isNaN(minute)) {
            hour = 12;
            minute = 0;
            isTimeUnknown = true;
        }

        const dateObj = new Date(year, month - 1, day, hour, minute);
        dateObj.setMinutes(dateObj.getMinutes() - 30);

        year = dateObj.getFullYear();
        month = dateObj.getMonth() + 1;
        day = dateObj.getDate();
        hour = dateObj.getHours();
        minute = dateObj.getMinutes();
    }

    const solar = Solar.fromYmdHms(year, month, day, hour, minute, 0);
    const lunar = solar.getLunar();
    const eightChar = lunar.getEightChar();

    const yearGan = eightChar.getYearGan();
    const yearZhi = eightChar.getYearZhi();
    const monthGan = eightChar.getMonthGan();
    const monthZhi = eightChar.getMonthZhi();
    const dayGan = eightChar.getDayGan();
    const dayZhi = eightChar.getDayZhi();
    const timeGan = isTimeUnknown ? '?' : eightChar.getTimeGan();
    const timeZhi = isTimeUnknown ? '?' : eightChar.getTimeZhi();

    const dayMasterKorean = GAN_MAP[dayGan]?.korean || dayGan;

    const createPillar = (gan: string, zhi: string, type: 'Year' | 'Month' | 'Day' | 'Time'): PillarInfo => {
        const isUnknown = gan === '?';
        const ganRaw = isUnknown ? '-' : (eightChar as any)[`get${type}ShiShenGan`]() || '-';
        const zhiRaw = isUnknown ? '-' : (eightChar as any)[`get${type}ShiShenZhi`]() || '-';
        const stageRaw = isUnknown ? '-' : (eightChar as any)[`get${type}DiShi`]() || '-';
        return {
            gan,
            zhi,
            ganElement: GAN_MAP[gan]?.element || '',
            zhiElement: ZHI_MAP[zhi]?.element || '',
            ganShiShen: isUnknown ? '-' : SHISHEN_TRANSLATE[ganRaw] || ganRaw,
            zhiShiShen: isUnknown ? '-' : SHISHEN_TRANSLATE[zhiRaw] || zhiRaw,
            hiddenStems: isUnknown ? [] : (eightChar as any)[`get${type}HideGan`]() || [],
            twelveStages: isUnknown ? '-' : STAGE_TRANSLATE[stageRaw] || stageRaw,
            twelveSpirits: isUnknown ? '-' : getTwelveSpirits(dayZhi, zhi)
        };
    };

    const pillars = {
        year: createPillar(yearGan, yearZhi, 'Year'),
        month: createPillar(monthGan, monthZhi, 'Month'),
        day: createPillar(dayGan, dayZhi, 'Day'),
        hour: createPillar(timeGan, timeZhi, 'Time'),
    };

    const elements = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
    const allPillars = [
        { gan: yearGan, zhi: yearZhi },
        { gan: monthGan, zhi: monthZhi },
        { gan: dayGan, zhi: dayZhi },
        { gan: timeGan, zhi: timeZhi },
    ];

    allPillars.forEach(p => {
        const ganElem = GAN_MAP[p.gan]?.element;
        if (ganElem) elements[ganElem as keyof typeof elements]++;

        const zhiElem = ZHI_MAP[p.zhi]?.element;
        if (zhiElem) elements[zhiElem as keyof typeof elements]++;
    });

    const total = allPillars.reduce((acc, p) => acc + (p.gan !== '?' ? 1 : 0) + (p.zhi !== '?' ? 1 : 0), 0) || 8;
    const elementRatio = {
        wood: Math.round((elements.wood / total) * 100) || 0,
        fire: Math.round((elements.fire / total) * 100) || 0,
        earth: Math.round((elements.earth / total) * 100) || 0,
        metal: Math.round((elements.metal / total) * 100) || 0,
        water: Math.round((elements.water / total) * 100) || 0,
    };

    return {
        ganZhi: {
            year: `${yearGan}${yearZhi}`,
            month: `${monthGan}${monthZhi}`,
            day: `${dayGan}${dayZhi}`,
            hour: isTimeUnknown ? '모름' : `${timeGan}${timeZhi}`,
        },
        dayMaster: {
            korean: dayMasterKorean,
            chinese: dayGan,
            element: GAN_MAP[dayGan]?.element || '',
            polarity: GAN_MAP[dayGan]?.polarity || '',
            description: DAY_MASTER_DESC[dayMasterKorean] || ''
        },
        pillars,
        elements,
        elementRatio
    };
}

export function buildRichSajuContext(saju: any): string {
    const GAN_MAP_DESC: Record<string, { korean: string; element: string; desc: string }> = {
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

    const ZHI_MAP_DESC: Record<string, { korean: string; element: string; animal: string }> = {
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

    const SS_MAP_DESC: Record<string, string> = {
        '比肩': '비견(나와 같은 기운·자존심·독립)', '劫財': '겁재(경쟁·승부욕·재물쟁탈)', '劫财': '겁재(경쟁·승부욕·재물쟁탈)',
        '食神': '식신(재능발현·여유·식복)', '傷官': '상관(창의·반항·날카로운 표현)', '伤官': '상관(창의·반항·날카로운 표현)',
        '偏財': '편재(변동재물·투기·아버지)', '偏财': '편재(변동재물·투기·아버지)', '正財': '정재(안정재물·근면·아내)', '正财': '정재(안정재물·근면·아내)',
        '偏官': '편관(권위·압박·도전)', '七殺': '편관(권위·압박·도전)', '正官': '정관(명예·질서·직장)',
        '偏印': '편인(편학·독창성·고독)', '正印': '정인(학문·인덕·어머니)',
    };

    const translateShiShen = (s: any): string => {
        if (!s || s === '-') return '-';
        let result = Array.isArray(s) ? s.join('') : String(s);
        for (const [zh, ko] of Object.entries(SS_MAP_DESC)) {
            result = result.replace(new RegExp(zh, 'g'), ko);
        }
        return result.trim();
    };

    if (!saju) return '';
    const p = saju.pillars;
    const dm = saju.dayMaster;

    const describePillar = (label: string, meaning: string, pillar: any) => {
        if (!pillar) return '';
        const ganInfo = GAN_MAP_DESC[pillar.gan] || { korean: pillar.gan, element: '?', desc: '?' };
        const zhiInfo = ZHI_MAP_DESC[pillar.zhi] || { korean: pillar.zhi, element: '?', animal: '?' };
        const ganSS = translateShiShen(pillar.ganShiShen);
        const zhiSS = translateShiShen(pillar.zhiShiShen);
        const stages = pillar.twelveStages || '-';
        const spirits = pillar.twelveSpirits || '-';
        const hidden = pillar.hiddenStems?.length > 0 
            ? pillar.hiddenStems.map((s: string) => GAN_MAP_DESC[s]?.korean || s).join(', ')
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
    const over = Object.entries(ratio || {}).filter(([_, v]) => (v as number) >= 35).map(([k]) => elementNames[k]).join(', ');
    const lack = Object.entries(ratio || {}).filter(([_, v]) => (v as number) === 0).map(([k]) => elementNames[k]).join(', ');
    const weak = Object.entries(ratio || {}).filter(([_, v]) => (v as number) > 0 && (v as number) <= 12).map(([k]) => elementNames[k]).join(', ');

    // Calculate ShiShen count dynamically
    const allShiShen: string[] = [];
    ['year', 'month', 'day', 'hour'].forEach(key => {
        const pil = (p as any)?.[key];
        if (pil?.ganShiShen && pil.ganShiShen !== '-') {
            const translated = translateShiShen(pil.ganShiShen).split('(')[0];
            if (translated) allShiShen.push(translated);
        }
        if (pil?.zhiShiShen && pil.zhiShiShen !== '-') {
            const translated = translateShiShen(pil.zhiShiShen).split('(')[0];
            if (translated) allShiShen.push(translated);
        }
    });
    const shiShenCount: Record<string, number> = {};
    allShiShen.forEach(s => { shiShenCount[s] = (shiShenCount[s] || 0) + 1; });
    const shiShenSummary = Object.entries(shiShenCount).map(([k, v]) => `${k}(${v}개)`).join(', ');

    return `
[내담자 사주팔자(四柱八字) 정밀 분석 데이터]

★ 일간(日干·본인의 본질): ${dm?.chinese || dm} (${GAN_MAP_DESC[dm?.chinese || dm]?.korean || dm} - ${GAN_MAP_DESC[dm?.chinese || dm]?.desc || ''})

${yearDesc}

${monthDesc}

${dayDesc}

${hourDesc}

★ 오행(五행) 에너지 분포:
  목(木) ${ratio?.wood || 0}% (${elements?.wood || 0}개) / 화(火) ${ratio?.fire || 0}% (${elements?.fire || 0}개) / 토(土) ${ratio?.earth || 0}% (${elements?.earth || 0}개) / 금(金) ${ratio?.metal || 0}% (${elements?.metal || 0}개) / 수(水) ${ratio?.water || 0}% (${elements?.water || 0}개)
  ${over ? `⚠ 과다(偏重): ${over}` : ''}
  ${lack ? `⚠ 결핍(缺): ${lack}` : ''}
  ${weak ? `⚠ 약세(弱): ${weak}` : ''}

★ 십성(十星) 배치 분포: ${shiShenSummary}

★ 간지(干支) 원국: ${saju.ganZhi?.year} ${saju.ganZhi?.month} ${saju.ganZhi?.day} ${saju.ganZhi?.hour}
`;
}
