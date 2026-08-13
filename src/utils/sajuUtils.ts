import {
    calculateFourPillars,
    BirthInfo,
    DayBoundary,
    FourPillarsDetail
} from 'manseryeok';

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

const STEM_INFO: Record<string, { korean: string; hanja: string; element: string; polarity: string }> = {
    '갑': { korean: '갑목', hanja: '甲', element: 'wood', polarity: '+' },
    '을': { korean: '을목', hanja: '乙', element: 'wood', polarity: '-' },
    '병': { korean: '병화', hanja: '丙', element: 'fire', polarity: '+' },
    '정': { korean: '정화', hanja: '丁', element: 'fire', polarity: '-' },
    '무': { korean: '무토', hanja: '戊', element: 'earth', polarity: '+' },
    '기': { korean: '기토', hanja: '己', element: 'earth', polarity: '-' },
    '경': { korean: '경금', hanja: '庚', element: 'metal', polarity: '+' },
    '신': { korean: '신금', hanja: '辛', element: 'metal', polarity: '-' },
    '임': { korean: '임수', hanja: '壬', element: 'water', polarity: '+' },
    '계': { korean: '계수', hanja: '癸', element: 'water', polarity: '-' },
    '甲': { korean: '갑목', hanja: '甲', element: 'wood', polarity: '+' },
    '乙': { korean: '을목', hanja: '乙', element: 'wood', polarity: '-' },
    '丙': { korean: '병화', hanja: '丙', element: 'fire', polarity: '+' },
    '丁': { korean: '정화', hanja: '丁', element: 'fire', polarity: '-' },
    '戊': { korean: '무토', hanja: '戊', element: 'earth', polarity: '+' },
    '己': { korean: '기토', hanja: '己', element: 'earth', polarity: '-' },
    '庚': { korean: '경금', hanja: '庚', element: 'metal', polarity: '+' },
    '辛': { korean: '신금', hanja: '辛', element: 'metal', polarity: '-' },
    '壬': { korean: '임수', hanja: '壬', element: 'water', polarity: '+' },
    '癸': { korean: '계수', hanja: '癸', element: 'water', polarity: '-' },
};

const BRANCH_INFO: Record<string, { korean: string; hanja: string; element: string; polarity: string }> = {
    '자': { korean: '자수', hanja: '子', element: 'water', polarity: '+' },
    '축': { korean: '축토', hanja: '丑', element: 'earth', polarity: '-' },
    '인': { korean: '인목', hanja: '寅', element: 'wood', polarity: '+' },
    '묘': { korean: '묘목', hanja: '卯', element: 'wood', polarity: '-' },
    '진': { korean: '진토', hanja: '辰', element: 'earth', polarity: '+' },
    '사': { korean: '사화', hanja: '巳', element: 'fire', polarity: '-' },
    '오': { korean: '오화', hanja: '午', element: 'fire', polarity: '+' },
    '미': { korean: '미토', hanja: '未', element: 'earth', polarity: '-' },
    '신': { korean: '신금', hanja: '申', element: 'metal', polarity: '+' },
    '유': { korean: '유금', hanja: '酉', element: 'metal', polarity: '-' },
    '술': { korean: '술토', hanja: '戌', element: 'earth', polarity: '+' },
    '해': { korean: '해수', hanja: '亥', element: 'water', polarity: '-' },
    '子': { korean: '자수', hanja: '子', element: 'water', polarity: '+' },
    '丑': { korean: '축토', hanja: '丑', element: 'earth', polarity: '-' },
    '寅': { korean: '인목', hanja: '寅', element: 'wood', polarity: '+' },
    '卯': { korean: '묘목', hanja: '卯', element: 'wood', polarity: '-' },
    '辰': { korean: '진토', hanja: '辰', element: 'earth', polarity: '+' },
    '巳': { korean: '사화', hanja: '巳', element: 'fire', polarity: '-' },
    '午': { korean: '오화', hanja: '午', element: 'fire', polarity: '+' },
    '未': { korean: '미토', hanja: '未', element: 'earth', polarity: '-' },
    '申': { korean: '신금', hanja: '申', element: 'metal', polarity: '+' },
    '酉': { korean: '유금', hanja: '酉', element: 'metal', polarity: '-' },
    '戌': { korean: '술토', hanja: '戌', element: 'earth', polarity: '+' },
    '亥': { korean: '해수', hanja: '亥', element: 'water', polarity: '-' },
};

const HIDDEN_STEMS: Record<string, string[]> = {
    '자': ['계'], '子': ['계'],
    '축': ['계', '신', '기'], '丑': ['계', '신', '기'],
    '인': ['무', '병', '갑'], '寅': ['무', '병', '갑'],
    '묘': ['갑', '을'], '卯': ['갑', '을'],
    '진': ['을', '계', '무'], '辰': ['을', '계', '무'],
    '사': ['무', '경', '병'], '巳': ['무', '경', '병'],
    '오': ['병', '기', '정'], '午': ['병', '기', '정'],
    '미': ['정', '을', '기'], '未': ['정', '을', '기'],
    '신': ['무', '임', '경'], '申': ['무', '임', '경'],
    '유': ['경', '신'], '酉': ['경', '신'],
    '술': ['신', '정', '무'], '戌': ['신', '정', '무'],
    '해': ['무', '갑', '임'], '亥': ['무', '갑', '임'],
};

const STAGES_ORDER = ['장생(長生)', '목욕(沐浴)', '관대(冠帶)', '건록(建祿)', '제왕(帝旺)', '쇠(衰)', '병(病)', '사(死)', '묘(墓)', '절(絶)', '태(胎)', '양(養)'];
const ZHI_ORDER = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];

const DAY_MASTER_CHANGSHENG: Record<string, { startZhi: string; forward: boolean }> = {
    '갑': { startZhi: '해', forward: true },
    '을': { startZhi: '오', forward: false },
    '병': { startZhi: '인', forward: true },
    '정': { startZhi: '유', forward: false },
    '무': { startZhi: '인', forward: true },
    '기': { startZhi: '유', forward: false },
    '경': { startZhi: '사', forward: true },
    '신': { startZhi: '자', forward: false },
    '임': { startZhi: '신', forward: true },
    '계': { startZhi: '묘', forward: false },
};

function getTwelveStage(dayStemKo: string, zhiKo: string): string {
    const config = DAY_MASTER_CHANGSHENG[dayStemKo];
    if (!config || zhiKo === '?') return '-';
    const startIndex = ZHI_ORDER.indexOf(config.startZhi);
    const targetIndex = ZHI_ORDER.indexOf(zhiKo);
    if (startIndex === -1 || targetIndex === -1) return '-';

    const offset = config.forward
        ? (targetIndex - startIndex + 12) % 12
        : (startIndex - targetIndex + 12) % 12;
    return STAGES_ORDER[offset] || '-';
}

const SPIRIT_ORDER = ['지살(地煞)', '연살(年煞)', '월살(月煞)', '망신살(亡神)', '장성살(將星)', '반안살(攀鞍)', '역마살(驛馬)', '육해살(六害)', '화개살(華蓋)', '겁살(劫煞)', '재살(災煞)', '천살(天煞)'];
const TRIPLE_COMBO_START: Record<string, string> = {
    '인': '인', '오': '인', '술': '인',
    '신': '신', '자': '신', '진': '신',
    '해': '해', '묘': '해', '미': '해',
    '사': '사', '유': '사', '축': '사',
};

function getTwelveSpirits(baseZhiKo: string, targetZhiKo: string): string {
    const startZhi = TRIPLE_COMBO_START[baseZhiKo];
    if (!startZhi || targetZhiKo === '?') return '-';
    const startIndex = ZHI_ORDER.indexOf(startZhi);
    const targetIndex = ZHI_ORDER.indexOf(targetZhiKo);
    if (startIndex === -1 || targetIndex === -1) return '-';
    const distance = (targetIndex - startIndex + 12) % 12;
    return SPIRIT_ORDER[distance] || '-';
}

const DAY_MASTER_DESC: Record<string, string> = {
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

export function calculateSaju(birthDate: string, birthTime: string | null, gender?: string): SajuResult {
    const cleanDate = birthDate.replace(/[-./]/g, '');
    const year = Number(cleanDate.substring(0, 4)) || 1990;
    const month = Number(cleanDate.substring(4, 6)) || 1;
    const day = Number(cleanDate.substring(6, 8)) || 1;

    let hour = 12;
    let minute = 0;
    let isTimeUnknown = !birthTime;

    if (birthTime) {
        const timeParts = birthTime.trim().split('-')[0]!.split(':').map(Number);
        hour = timeParts[0] ?? 12;
        minute = timeParts[1] ?? 0;
        if (isNaN(hour) || isNaN(minute)) {
            hour = 12;
            minute = 0;
            isTimeUnknown = true;
        }
    }

    const normalizedGender = (gender === 'female' || gender === '여성' || gender === 'F') ? 'female' : 'male';
    const dayBoundary: DayBoundary = 'jasi';

    const birthInfo: BirthInfo = {
        year,
        month,
        day,
        hour,
        minute,
        gender: normalizedGender,
        dayBoundary,
        trueSolarTime: {
            longitude: 127.5,
            applyEquationOfTime: true,
            applyHistoricalDst: true
        }
    };

    const detail: FourPillarsDetail = calculateFourPillars(birthInfo);

    const yearStemKo = detail.year.heavenlyStem;
    const yearBranchKo = detail.year.earthlyBranch;
    const monthStemKo = detail.month.heavenlyStem;
    const monthBranchKo = detail.month.earthlyBranch;
    const dayStemKo = detail.day.heavenlyStem;
    const dayBranchKo = detail.day.earthlyBranch;
    const hourStemKo = isTimeUnknown ? '?' : detail.hour.heavenlyStem;
    const hourBranchKo = isTimeUnknown ? '?' : detail.hour.earthlyBranch;

    const dayMasterKo = STEM_INFO[dayStemKo]?.korean || `${dayStemKo}목`;
    const dayMasterChinese = detail.dayHanja.substring(0, 1) || STEM_INFO[dayStemKo]?.hanja || dayStemKo;

    const makePillarDetail = (
        stemKo: string,
        branchKo: string,
        tenGodStemRaw: string,
        tenGodBranchRaw: string
    ): PillarInfo => {
        const isUnknown = stemKo === '?';
        const stemMeta = STEM_INFO[stemKo] || { hanja: '?', element: 'wood', korean: stemKo };
        const branchMeta = BRANCH_INFO[branchKo] || { hanja: '?', element: 'wood', korean: branchKo };

        return {
            gan: isUnknown ? '?' : stemKo,
            zhi: isUnknown ? '?' : branchKo,
            ganElement: isUnknown ? '-' : stemMeta.element,
            zhiElement: isUnknown ? '-' : branchMeta.element,
            ganShiShen: isUnknown ? '-' : (tenGodStemRaw === '일간' ? '일간' : `${tenGodStemRaw}`),
            zhiShiShen: isUnknown ? '-' : `${tenGodBranchRaw}`,
            hiddenStems: isUnknown ? [] : HIDDEN_STEMS[branchKo] || [],
            twelveStages: isUnknown ? '-' : getTwelveStage(dayStemKo, branchKo),
            twelveSpirits: isUnknown ? '-' : getTwelveSpirits(dayBranchKo, branchKo)
        };
    };

    const pillars = {
        year: makePillarDetail(yearStemKo, yearBranchKo, detail.tenGods.year.stem, detail.tenGods.year.branch),
        month: makePillarDetail(monthStemKo, monthBranchKo, detail.tenGods.month.stem, detail.tenGods.month.branch),
        day: makePillarDetail(dayStemKo, dayBranchKo, '일간', detail.tenGods.day.branch),
        hour: makePillarDetail(
            hourStemKo, hourBranchKo,
            isTimeUnknown ? '-' : detail.tenGods.hour.stem,
            isTimeUnknown ? '-' : detail.tenGods.hour.branch
        )
    };

    const elements = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
    const validPillars = [
        { stem: yearStemKo, branch: yearBranchKo },
        { stem: monthStemKo, branch: monthBranchKo },
        { stem: dayStemKo, branch: dayBranchKo },
        ...(isTimeUnknown ? [] : [{ stem: hourStemKo, branch: hourBranchKo }])
    ];

    validPillars.forEach(p => {
        const sElem = STEM_INFO[p.stem]?.element;
        if (sElem) elements[sElem as keyof typeof elements]++;
        const bElem = BRANCH_INFO[p.branch]?.element;
        if (bElem) elements[bElem as keyof typeof elements]++;
    });

    const totalCount = validPillars.length * 2 || 8;
    const elementRatio = {
        wood: Math.round((elements.wood / totalCount) * 100) || 0,
        fire: Math.round((elements.fire / totalCount) * 100) || 0,
        earth: Math.round((elements.earth / totalCount) * 100) || 0,
        metal: Math.round((elements.metal / totalCount) * 100) || 0,
        water: Math.round((elements.water / totalCount) * 100) || 0,
    };

    return {
        ganZhi: {
            year: `${yearStemKo}${yearBranchKo}`,
            month: `${monthStemKo}${monthBranchKo}`,
            day: `${dayStemKo}${dayBranchKo}`,
            hour: isTimeUnknown ? '모름' : `${hourStemKo}${hourBranchKo}`
        },
        dayMaster: {
            korean: dayMasterKo,
            chinese: dayMasterChinese,
            element: STEM_INFO[dayStemKo]?.element || 'wood',
            polarity: STEM_INFO[dayStemKo]?.polarity || '+',
            description: DAY_MASTER_DESC[dayMasterKo] || ''
        },
        pillars,
        elements,
        elementRatio
    };
}
