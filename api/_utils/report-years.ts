import { getMonthTerm } from './report-terms';

// 심층 리포트 연도 계산 (로드맵: 올해 제외 내년부터 3개년 / 적중 확인: 지난 3개년)

const STEMS_HANJA = '甲乙丙丁戊己庚辛壬癸';
const STEMS_KO = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];
const BRANCHES_HANJA = '子丑寅卯辰巳午未申酉戌亥';
const BRANCHES_KO = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];

export const ROADMAP_YEAR_COUNT = 3;
/** 적중 확인(지나온 길)에 쓰는 과거 연도 수 — 올해 포함 최근 N년 */
export const PAST_YEAR_COUNT = 3;

export const STEMS_KO_LIST = STEMS_KO;

export function getYearPillarKo(year: number): { stem: string; branch: string } {
    return {
        stem: STEMS_KO[(((year - 4) % 10) + 10) % 10]!,
        branch: BRANCHES_KO[(((year - 4) % 12) + 12) % 12]!,
    };
}

/** 이미 지나간 최근 N년 — 작년부터 거슬러 (오래된 순). 올해는 아직 끝나지 않았으므로 제외 */
export function getPastYears(now: Date = new Date()): RoadmapYear[] {
    const end = getReportBaseYear(now) - 1;
    return Array.from({ length: PAST_YEAR_COUNT }, (_, i) => {
        const year = end - (PAST_YEAR_COUNT - 1) + i;
        return { year, ganji: getYearGanji(year) };
    });
}

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

const dateKey = (month: number, day: number) => month * 100 + day;

/**
 * 사주상 '올해'. 한 해는 입춘(양력 2월 초)에 바뀌므로, 입춘 전(1월~2월 초)에는 아직 작년이다.
 */
export function getReportBaseYear(now: Date = new Date()): number {
    const y = now.getFullYear();
    const ipchun = getMonthTerm(y, 1);
    return dateKey(now.getMonth() + 1, now.getDate()) < dateKey(ipchun.month, ipchun.day) ? y - 1 : y;
}

/** 지금이 속한 절기월 번호(1~12). baseYear 는 getReportBaseYear 결과. */
export function getCurrentTermIndex(now: Date = new Date()): number {
    const base = getReportBaseYear(now);
    const nowKey = now.getFullYear() * 10000 + dateKey(now.getMonth() + 1, now.getDate());
    for (let i = 12; i >= 1; i--) {
        const t = getMonthTerm(base, i);
        if (nowKey >= t.year * 10000 + dateKey(t.month, t.day)) return i;
    }
    return 1;
}

/** 올해 남은 절기월 번호들: 지금 속한 달부터 12번째(소한월, 새해 직전)까지 */
export function getRemainingTermIndices(now: Date = new Date()): number[] {
    const cur = getCurrentTermIndex(now);
    return Array.from({ length: 12 - cur + 1 }, (_, i) => cur + i);
}

/** 사주상 올해(남은 기간) */
export function getCurrentYear(now: Date = new Date()): RoadmapYear {
    const year = getReportBaseYear(now);
    return { year, ganji: getYearGanji(year) };
}

/** 올해(사주 기준)를 제외하고 내년부터 3개년 */
export function getRoadmapYears(now: Date = new Date()): RoadmapYear[] {
    const start = getReportBaseYear(now) + 1;
    return Array.from({ length: ROADMAP_YEAR_COUNT }, (_, i) => {
        const year = start + i;
        return { year, ganji: getYearGanji(year) };
    });
}

export function getRoadmapTitle(years: RoadmapYear[]): string {
    return `08. 앞으로 3년의 이야기 (${years[0]!.year}~${years[years.length - 1]!.year})`;
}
