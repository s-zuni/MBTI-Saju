import { Solar } from 'lunar-javascript';

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
    const partsDate = birthDate.split('-').map(Number);
    let year = partsDate[0] || 1990;
    let month = partsDate[1] || 1;
    let day = partsDate[2] || 1;
    let hour = 12; // 태어난 시간을 모를 경우 정오(12시) 기준으로 계산하여 일진 오차 최소화
    let minute = 0;
    let isTimeUnknown = true;

    if (birthTime) {
        const parts = birthTime.split(':').map(Number);
        hour = parts[0] ?? 0;
        minute = parts[1] ?? 0;
        isTimeUnknown = false;

        // 한국 표준시(KST) 자연시 보정
        // 동경 135도 기준시에서 서울 127도 기준 진짜 태양시로 변환 (약 -30분 적용)
        // 이를 통해 야자시/명자시 및 절기 교입 시각의 오차를 줄임
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

    // Gan-Zhi (Heavenly Stems and Earthly Branches)
    const yearGan = eightChar.getYearGan();
    const yearZhi = eightChar.getYearZhi();
    const monthGan = eightChar.getMonthGan();
    const monthZhi = eightChar.getMonthZhi();
    const dayGan = eightChar.getDayGan();
    const dayZhi = eightChar.getDayZhi();
    const timeGan = isTimeUnknown ? '모름' : eightChar.getTimeGan();
    const timeZhi = isTimeUnknown ? '모름' : eightChar.getTimeZhi();

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
