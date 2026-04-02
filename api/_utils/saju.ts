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
    return SPIRIT_ORDER[distance] || '-';
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
        return {
            gan,
            zhi,
            ganShiShen: isUnknown ? '-' : (eightChar as any)[`get${type}ShiShenGan`]() || '-',
            zhiShiShen: isUnknown ? '-' : (eightChar as any)[`get${type}ShiShenZhi`]() || '-',
            hiddenStems: isUnknown ? [] : (eightChar as any)[`get${type}HideGan`]() || [],
            twelveStages: isUnknown ? '-' : (eightChar as any)[`get${type}DiShi`]() || '-',
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
