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
    // birthDate format: YYYY-MM-DD
    const [year, month, day] = birthDate.split('-').map(Number);
    let hour = 0;
    let minute = 0;

    if (birthTime) {
        [hour, minute] = birthTime.split(':').map(Number);
    } else {
        // If unknown, typically set to Sas (09:30-11:30) or treat specially.
        // For simplicity, we might default to 00:00 or handle 'unknown' logically in prompt 
        // but 'lunar-javascript' needs specific time. 
        // Let's use 12:00 if unknown for calculation purpose, or pass unknown to AI.
        // However, user specifically asked for Saju calculation. 
        // Let's default to a middle time if null, but note that accuracy drops.
        hour = 12;
    }

    const solar = Solar.fromYmdHms(year, month, day, hour, minute, 0);
    const lunar = solar.getLunar();
    const eightChar = lunar.getEightChar();

    // Gan-Zhi (Heavenly Stems and Earthly Branches)
    const yearGan = eightChar.getYearGan();
    const yearZhi = eightChar.getYearZhi();
    const monthGan = eightChar.getMonthGan();
    const monthZhi = eightChar.getMonthZhi();
    const dayGan = eightChar.getDayGan();
    const dayZhi = eightChar.getDayZhi();
    const timeGan = eightChar.getTimeGan();
    const timeZhi = eightChar.getTimeZhi();

    const dayMasterKorean = GAN_MAP[dayGan]?.korean || dayGan;

    // Calculate Element Distribution
    const elements = {
        wood: 0,
        fire: 0,
        earth: 0,
        metal: 0,
        water: 0,
    };

    const pillars = [
        { gan: yearGan, zhi: yearZhi },
        { gan: monthGan, zhi: monthZhi },
        { gan: dayGan, zhi: dayZhi },
        { gan: timeGan, zhi: timeZhi },
    ];

    pillars.forEach(p => {
        const ganElem = GAN_MAP[p.gan]?.element;
        if (ganElem) elements[ganElem as keyof typeof elements]++;

        const zhiElem = ZHI_MAP[p.zhi]?.element;
        if (zhiElem) elements[zhiElem as keyof typeof elements]++;
    });

    const total = 8;
    const elementRatio = {
        wood: Math.round((elements.wood / total) * 100),
        fire: Math.round((elements.fire / total) * 100),
        earth: Math.round((elements.earth / total) * 100),
        metal: Math.round((elements.metal / total) * 100),
        water: Math.round((elements.water / total) * 100),
    };

    return {
        ganZhi: {
            year: `${yearGan}${yearZhi}`,
            month: `${monthGan}${monthZhi}`,
            day: `${dayGan}${dayZhi}`,
            hour: `${timeGan}${timeZhi}`,
        },
        dayMaster: {
            korean: dayMasterKorean,
            chinese: dayGan,
            element: GAN_MAP[dayGan]?.element || '',
            polarity: GAN_MAP[dayGan]?.polarity || '',
            description: DAY_MASTER_DESC[dayMasterKorean] || ''
        },
        elements,
        elementRatio
    };
}
