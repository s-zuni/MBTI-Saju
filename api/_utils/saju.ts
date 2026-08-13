import {
    calculateFourPillars,
    BirthInfo,
    DayBoundary,
    FourPillarsDetail,
    FiveElement,
    EarthlyBranch,
    HeavenlyStem,
    getBranchTenGod
} from 'manseryeok';
import {
    PreciseSajuData,
    SajuInput,
    PillarDetail,
    DayMasterInfo,
    FiveElementsCount,
    FiveElementsRatio,
    LuckPillarsData
} from '../types';

/**
 * ============================================================================
 * [한국 기준 만세력 사주 엔진 - manseryeok 기반 결정론적 계산 모듈]
 * 
 * 주요 기능:
 * 1. 한국천문연구원(KASI) 기반 오픈소스 라이브러리 `manseryeok` 활용
 * 2. 동경 127.5도 기준 한국 진태양시(True Solar Time) 및 균시차(Equation of Time) 자동 보정
 * 3. 한국 명리학 표준 야자시(夜子時, 23:00~24:00) / 조자시(朝子時) 구분 적용 ('jasi' 경계)
 * 4. 사주 4주 8자(천간/지지 한글 및 한자), 오행 비율/개수, 십신(十神), 지장간(地藏干),
 *    12운성(十二運星), 12신살(十二神煞), 공망(空亡), 대운(大運) 데이터 제공
 * ============================================================================
 */

// 천간 한글/한자/오행/음양 매핑
const STEM_INFO: Record<string, { korean: string; hanja: string; element: 'wood' | 'fire' | 'earth' | 'metal' | 'water'; elementKo: string; polarity: '+' | '-' }> = {
    '갑': { korean: '갑목', hanja: '甲', element: 'wood', elementKo: '목', polarity: '+' },
    '을': { korean: '을목', hanja: '乙', element: 'wood', elementKo: '목', polarity: '-' },
    '병': { korean: '병화', hanja: '丙', element: 'fire', elementKo: '화', polarity: '+' },
    '정': { korean: '정화', hanja: '丁', element: 'fire', elementKo: '화', polarity: '-' },
    '무': { korean: '무토', hanja: '戊', element: 'earth', elementKo: '토', polarity: '+' },
    '기': { korean: '기토', hanja: '己', element: 'earth', elementKo: '토', polarity: '-' },
    '경': { korean: '경금', hanja: '庚', element: 'metal', elementKo: '금', polarity: '+' },
    '신': { korean: '신금', hanja: '辛', element: 'metal', elementKo: '금', polarity: '-' },
    '임': { korean: '임수', hanja: '壬', element: 'water', elementKo: '수', polarity: '+' },
    '계': { korean: '계수', hanja: '癸', element: 'water', elementKo: '수', polarity: '-' },
    '甲': { korean: '갑목', hanja: '甲', element: 'wood', elementKo: '목', polarity: '+' },
    '乙': { korean: '을목', hanja: '乙', element: 'wood', elementKo: '목', polarity: '-' },
    '丙': { korean: '병화', hanja: '丙', element: 'fire', elementKo: '화', polarity: '+' },
    '丁': { korean: '정화', hanja: '丁', element: 'fire', elementKo: '화', polarity: '-' },
    '戊': { korean: '무토', hanja: '戊', element: 'earth', elementKo: '토', polarity: '+' },
    '己': { korean: '기토', hanja: '己', element: 'earth', elementKo: '토', polarity: '-' },
    '庚': { korean: '경금', hanja: '庚', element: 'metal', elementKo: '금', polarity: '+' },
    '辛': { korean: '신금', hanja: '辛', element: 'metal', elementKo: '금', polarity: '-' },
    '壬': { korean: '임수', hanja: '壬', element: 'water', elementKo: '수', polarity: '+' },
    '癸': { korean: '계수', hanja: '癸', element: 'water', elementKo: '수', polarity: '-' },
};

// 지지 한글/한자/오행/음양/동물 매핑
const BRANCH_INFO: Record<string, { korean: string; hanja: string; element: 'wood' | 'fire' | 'earth' | 'metal' | 'water'; elementKo: string; polarity: '+' | '-'; animal: string }> = {
    '자': { korean: '자수', hanja: '子', element: 'water', elementKo: '수', polarity: '+', animal: '쥐' },
    '축': { korean: '축토', hanja: '丑', element: 'earth', elementKo: '토', polarity: '-', animal: '소' },
    '인': { korean: '인목', hanja: '寅', element: 'wood', elementKo: '목', polarity: '+', animal: '호랑이' },
    '묘': { korean: '묘목', hanja: '卯', element: 'wood', elementKo: '목', polarity: '-', animal: '토끼' },
    '진': { korean: '진토', hanja: '辰', element: 'earth', elementKo: '토', polarity: '+', animal: '용' },
    '사': { korean: '사화', hanja: '巳', element: 'fire', elementKo: '화', polarity: '-', animal: '뱀' },
    '오': { korean: '오화', hanja: '午', element: 'fire', elementKo: '화', polarity: '+', animal: '말' },
    '미': { korean: '미토', hanja: '未', element: 'earth', elementKo: '토', polarity: '-', animal: '양' },
    '신': { korean: '신금', hanja: '申', element: 'metal', elementKo: '금', polarity: '+', animal: '원숭이' },
    '유': { korean: '유금', hanja: '酉', element: 'metal', elementKo: '금', polarity: '-', animal: '닭' },
    '술': { korean: '술토', hanja: '戌', element: 'earth', elementKo: '토', polarity: '+', animal: '개' },
    '해': { korean: '해수', hanja: '亥', element: 'water', elementKo: '수', polarity: '-', animal: '돼지' },
    '子': { korean: '자수', hanja: '子', element: 'water', elementKo: '수', polarity: '+', animal: '쥐' },
    '丑': { korean: '축토', hanja: '丑', element: 'earth', elementKo: '토', polarity: '-', animal: '소' },
    '寅': { korean: '인목', hanja: '寅', element: 'wood', elementKo: '목', polarity: '+', animal: '호랑이' },
    '卯': { korean: '묘목', hanja: '卯', element: 'wood', elementKo: '목', polarity: '-', animal: '토끼' },
    '辰': { korean: '진토', hanja: '辰', element: 'earth', elementKo: '토', polarity: '+', animal: '용' },
    '巳': { korean: '사화', hanja: '巳', element: 'fire', elementKo: '화', polarity: '-', animal: '뱀' },
    '午': { korean: '오화', hanja: '午', element: 'fire', elementKo: '화', polarity: '+', animal: '말' },
    '未': { korean: '미토', hanja: '未', element: 'earth', elementKo: '토', polarity: '-', animal: '양' },
    '申': { korean: '신금', hanja: '申', element: 'metal', elementKo: '금', polarity: '+', animal: '원숭이' },
    '酉': { korean: '유금', hanja: '酉', element: 'metal', elementKo: '금', polarity: '-', animal: '닭' },
    '戌': { korean: '술토', hanja: '戌', element: 'earth', elementKo: '토', polarity: '+', animal: '개' },
    '亥': { korean: '해수', hanja: '亥', element: 'water', elementKo: '수', polarity: '-', animal: '돼지' },
};

// 지장간 매핑
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

// 12운성 (Twelve Stages) 계산표
const STAGES_ORDER = ['장생(長生)', '목욕(沐浴)', '관대(冠帶)', '건록(建祿)', '제왕(帝旺)', '쇠(衰)', '병(病)', '사(死)', '묘(墓)', '절(絶)', '태(胎)', '양(養)'];
const ZHI_ORDER = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];

// 일간별 장생 시작 지지 인덱스
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

    let offset = 0;
    if (config.forward) {
        offset = (targetIndex - startIndex + 12) % 12;
    } else {
        offset = (startIndex - targetIndex + 12) % 12;
    }
    return STAGES_ORDER[offset] || '-';
}

// 12신살 (Twelve Spirits) 계산
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

/**
 * 사용자의 생년월일시 및 성별을 입력받아 한국 진태양시 보정 및 야자시/조자시가 적용된 정확한 사주 원국 데이터를 산출합니다.
 */
export function getPreciseSajuData(input: SajuInput): PreciseSajuData {
    const { birthDate, birthTime, gender, isLunar, isLeapMonth, longitude, dayBoundary } = input;

    // 1. 날짜 및 시간 파싱
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

    // 성별 정규화 ('male' | 'female')
    const normalizedGender = (gender === 'female' || gender === '여성' || gender === 'F') ? 'female' : 'male';

    /**
     * 야자시(夜子時)/조자시(朝子時) 처리 기준:
     * 한국 전통/현대 만세력 표준에 맞춰 23:00~24:00 출생 시 23:00부터 자시(야자시)로 넘어가 일주/시주를 계산하는 'jasi' 경계를 일관되게 적용합니다.
     */
    const selectedDayBoundary: DayBoundary = dayBoundary || 'jasi';

    // 2. manseryeok BirthInfo 구성 (진태양시 경도 127.5도 적용)
    const birthInfo: BirthInfo = {
        year,
        month,
        day,
        hour,
        minute,
        isLunar: !!isLunar,
        isLeapMonth: !!isLeapMonth,
        gender: normalizedGender,
        dayBoundary: selectedDayBoundary,
        trueSolarTime: {
            longitude: longitude || 127.5,
            applyEquationOfTime: true,
            applyHistoricalDst: true
        }
    };

    // 3. 만세력 엔진 실행
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

    const dayMasterInfo: DayMasterInfo = {
        korean: dayMasterKo,
        chinese: dayMasterChinese,
        element: STEM_INFO[dayStemKo]?.element || 'wood',
        polarity: STEM_INFO[dayStemKo]?.polarity || '+',
        description: DAY_MASTER_DESC[dayMasterKo] || ''
    };

    const makePillarDetail = (
        stemKo: string,
        branchKo: string,
        stemHanja: string,
        branchHanja: string,
        tenGodStemRaw: string,
        tenGodBranchRaw: string
    ): PillarDetail => {
        const isUnknown = stemKo === '?';
        const stemMeta = STEM_INFO[stemKo] || { hanja: '?', element: 'wood', korean: stemKo };
        const branchMeta = BRANCH_INFO[branchKo] || { hanja: '?', element: 'wood', korean: branchKo };

        return {
            gan: isUnknown ? '?' : stemKo,
            zhi: isUnknown ? '?' : branchKo,
            ganHanja: isUnknown ? '?' : stemHanja,
            zhiHanja: isUnknown ? '?' : branchHanja,
            ganKorean: isUnknown ? '?' : stemMeta.korean,
            zhiKorean: isUnknown ? '?' : branchMeta.korean,
            ganElement: isUnknown ? '-' : stemMeta.element,
            zhiElement: isUnknown ? '-' : branchMeta.element,
            ganShiShen: isUnknown ? '-' : (tenGodStemRaw === '일간' ? '일간(日干)' : `${tenGodStemRaw}`),
            zhiShiShen: isUnknown ? '-' : `${tenGodBranchRaw}`,
            hiddenStems: isUnknown ? [] : HIDDEN_STEMS[branchKo] || [],
            twelveStages: isUnknown ? '-' : getTwelveStage(dayStemKo, branchKo),
            twelveSpirits: isUnknown ? '-' : getTwelveSpirits(dayBranchKo, branchKo)
        };
    };

    const pillars = {
        year: makePillarDetail(
            yearStemKo, yearBranchKo,
            detail.yearHanja.charAt(0), detail.yearHanja.charAt(1),
            detail.tenGods.year.stem, detail.tenGods.year.branch
        ),
        month: makePillarDetail(
            monthStemKo, monthBranchKo,
            detail.monthHanja.charAt(0), detail.monthHanja.charAt(1),
            detail.tenGods.month.stem, detail.tenGods.month.branch
        ),
        day: makePillarDetail(
            dayStemKo, dayBranchKo,
            detail.dayHanja.charAt(0), detail.dayHanja.charAt(1),
            '일간', detail.tenGods.day.branch
        ),
        hour: makePillarDetail(
            hourStemKo, hourBranchKo,
            isTimeUnknown ? '?' : detail.hourHanja.charAt(0),
            isTimeUnknown ? '?' : detail.hourHanja.charAt(1),
            isTimeUnknown ? '-' : detail.tenGods.hour.stem,
            isTimeUnknown ? '-' : detail.tenGods.hour.branch
        )
    };

    // 4. 오행 분포 계산
    const elements: FiveElementsCount = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
    const validPillars = [
        { stem: yearStemKo, branch: yearBranchKo },
        { stem: monthStemKo, branch: monthBranchKo },
        { stem: dayStemKo, branch: dayBranchKo },
        ...(isTimeUnknown ? [] : [{ stem: hourStemKo, branch: hourBranchKo }])
    ];

    validPillars.forEach(p => {
        const sElem = STEM_INFO[p.stem]?.element;
        if (sElem) elements[sElem]++;
        const bElem = BRANCH_INFO[p.branch]?.element;
        if (bElem) elements[bElem]++;
    });

    const totalCount = validPillars.length * 2 || 8;
    const elementRatio: FiveElementsRatio = {
        wood: Math.round((elements.wood / totalCount) * 100) || 0,
        fire: Math.round((elements.fire / totalCount) * 100) || 0,
        earth: Math.round((elements.earth / totalCount) * 100) || 0,
        metal: Math.round((elements.metal / totalCount) * 100) || 0,
        water: Math.round((elements.water / totalCount) * 100) || 0,
    };

    // 5. 대운 산출 (LuckPillars)
    let luckPillarsData: LuckPillarsData | undefined = undefined;
    if (detail.luckPillars) {
        luckPillarsData = {
            forward: detail.luckPillars.forward,
            startAge: detail.luckPillars.startAge,
            startYears: detail.luckPillars.startYears,
            startMonths: detail.luckPillars.startMonths,
            pillars: detail.luckPillars.pillars.map(lp => {
                const stem = lp.pillar.heavenlyStem;
                const branch = lp.pillar.earthlyBranch;
                const stemHanja = STEM_INFO[stem]?.hanja || stem;
                const branchHanja = BRANCH_INFO[branch]?.hanja || branch;
                return {
                    age: lp.age,
                    stem,
                    branch,
                    korean: lp.korean,
                    hanja: `${stemHanja}${branchHanja}`
                };
            })
        };
    }

    return {
        ganZhi: {
            year: `${yearStemKo}${yearBranchKo}`,
            month: `${monthStemKo}${monthBranchKo}`,
            day: `${dayStemKo}${dayBranchKo}`,
            hour: isTimeUnknown ? '모름' : `${hourStemKo}${hourBranchKo}`
        },
        ganZhiHanja: {
            year: detail.yearHanja,
            month: detail.monthHanja,
            day: detail.dayHanja,
            hour: isTimeUnknown ? '未知' : detail.hourHanja
        },
        dayMaster: dayMasterInfo,
        pillars,
        elements,
        elementRatio,
        voidBranches: detail.voidBranches || [],
        luckPillars: luckPillarsData,
        trueSolarTimeApplied: true,
        dayBoundaryRule: selectedDayBoundary
    };
}

/**
 * 기존 API 호환용 래퍼 함수
 */
export function calculateSaju(birthDate: string, birthTime: string | null, gender?: string): PreciseSajuData {
    return getPreciseSajuData({
        birthDate,
        birthTime,
        gender
    });
}

/**
 * LLM 시스템 프롬프트 주입용 결정론적 사주 데이터 컨텍스트 텍스트 생성
 */
export function buildRichSajuContext(saju: PreciseSajuData): string {
    if (!saju) return '';

    const p = saju.pillars;
    const dm = saju.dayMaster;
    const ratio = saju.elementRatio;
    const elements = saju.elements;

    const describePillar = (label: string, meaning: string, pillar: PillarDetail) => {
        if (!pillar || pillar.gan === '?') return `■ ${label} (${meaning}): 모름`;
        const hiddenStr = pillar.hiddenStems.length > 0 ? pillar.hiddenStems.map(s => STEM_INFO[s]?.korean || s).join(', ') : '없음';
        return `■ ${label} (${meaning}): ${pillar.ganHanja}${pillar.zhiHanja} (${pillar.ganKorean} ${pillar.zhiKorean})
  - 천간: ${pillar.ganHanja} (${pillar.ganKorean}) / 지지: ${pillar.zhiHanja} (${pillar.zhiKorean})
  - 천간십성: ${pillar.ganShiShen} / 지지십성: ${pillar.zhiShiShen}
  - 12운성: ${pillar.twelveStages} / 12신살: ${pillar.twelveSpirits}
  - 지장간(숨은 기운): ${hiddenStr}`;
    };

    const yearDesc = describePillar('년주(年柱)', '조상운·유년기·사회적 환경', p.year);
    const monthDesc = describePillar('월주(月柱)', '부모운·청년기·직업 토대', p.month);
    const dayDesc = describePillar('일주(日柱)', '본인·배우자운·핵심 성격', p.day);
    const hourDesc = describePillar('시주(時柱)', '자녀운·말년운·내면 욕구', p.hour);

    const elementNames: Record<string, string> = { wood: '목(木)', fire: '화(火)', earth: '토(土)', metal: '금(金)', water: '수(水)' };
    const over = Object.entries(ratio || {}).filter(([_, v]) => (v as number) >= 35).map(([k]) => elementNames[k]).join(', ');
    const lack = Object.entries(ratio || {}).filter(([_, v]) => (v as number) === 0).map(([k]) => elementNames[k]).join(', ');
    const weak = Object.entries(ratio || {}).filter(([_, v]) => (v as number) > 0 && (v as number) <= 12).map(([k]) => elementNames[k]).join(', ');

    let daewunStr = '없음';
    if (saju.luckPillars && saju.luckPillars.pillars.length > 0) {
        const direction = saju.luckPillars.forward ? '순행' : '역행';
        const startAge = saju.luckPillars.startAge;
        const listStr = saju.luckPillars.pillars.slice(0, 8).map(lp => `${lp.age}세 ${lp.hanja}(${lp.korean})`).join(' -> ');
        daewunStr = `대운수 ${startAge} (${direction}): ${listStr}`;
    }

    const voidStr = saju.voidBranches.length > 0 ? saju.voidBranches.join(', ') : '없음';

    return `
[System Context: Deterministic Saju Data]
※ 아래 데이터는 한국천문연구원(KASI) 기준 오픈소스 만세력 코드 엔진(manseryeok)이 계산한 100% 검증된 수치 및 원국 정보입니다.

★ 내담자 일간(日干): ${dm.chinese} (${dm.korean}) — ${dm.description}
★ 간지 원국 (한자): ${saju.ganZhiHanja.year} ${saju.ganZhiHanja.month} ${saju.ganZhiHanja.day} ${saju.ganZhiHanja.hour}
★ 간지 원국 (한글): ${saju.ganZhi.year} ${saju.ganZhi.month} ${saju.ganZhi.day} ${saju.ganZhi.hour}

${yearDesc}

${monthDesc}

${dayDesc}

${hourDesc}

★ 오행(五行) 에너지 분포 (진태양시 보정 완료):
  - 목(木): ${ratio.wood}% (${elements.wood}개)
  - 화(火): ${ratio.fire}% (${elements.fire}개)
  - 토(土): ${ratio.earth}% (${elements.earth}개)
  - 금(金): ${ratio.metal}% (${elements.metal}개)
  - 수(水): ${ratio.water}% (${elements.water}개)
  ${over ? `⚠ 과다(偏重): ${over}` : ''}
  ${lack ? `⚠ 결핍(缺): ${lack}` : ''}
  ${weak ? `⚠ 약세(弱): ${weak}` : ''}

★ 공망(空亡): ${voidStr}
★ 대운(大運) 정보: ${daewunStr}
`;
}
