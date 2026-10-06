// 심층 리포트 로드맵 연도 계산 (올해 제외, 내년부터 3개년)

const STEMS_HANJA = '甲乙丙丁戊己庚辛壬癸';
const STEMS_KO = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];
const BRANCHES_HANJA = '子丑寅卯辰巳午未申酉戌亥';
const BRANCHES_KO = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];

export const ROADMAP_YEAR_COUNT = 3;

export interface RoadmapYear {
    year: number;
    /** 예: "병오(丙午)" */
    ganji: string;
}

export function getYearGanji(year: number): string {
    const s = (((year - 4) % 10) + 10) % 10;
    const b = (((year - 4) % 12) + 12) % 12;
    return `${STEMS_KO[s]}${BRANCHES_KO[b]}(${STEMS_HANJA[s]}${BRANCHES_HANJA[b]})`;
}

/** 올해를 제외하고 내년부터 3개년 */
export function getRoadmapYears(now: Date = new Date()): RoadmapYear[] {
    const start = now.getFullYear() + 1;
    return Array.from({ length: ROADMAP_YEAR_COUNT }, (_, i) => {
        const year = start + i;
        return { year, ganji: getYearGanji(year) };
    });
}

export function getRoadmapTitle(years: RoadmapYear[]): string {
    return `06. 향후 3개년(${years[0]!.year}~${years[years.length - 1]!.year}) 심층 로드맵`;
}
