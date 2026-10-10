/**
 * 절기월(節氣月) 시작일 계산.
 * 월운(月運)은 양력 월이 아니라 절기(입춘·경칩·청명…) 기준이라, 고정 날짜표 대신 연도별 절입일을 계산한다.
 * 21세기(2001~2100) 절기 근사식: floor(Y×0.2422 + C) − L (Y: 연도 뒤 두 자리). 절입 '일자'는 거의 정확하나
 * 절입 시각은 반영하지 않으므로 경계일 전후 ±1일 오차는 있을 수 있다.
 */

interface TermDef {
    /** 해당 절기월이 시작되는 양력 월 (12번째 절기월 소한은 이듬해 1월) */
    month: number;
    c: number;
    /** 소한·입춘은 윤년 보정에 (Y−1)/4 를 쓴다 */
    earlyYear?: boolean;
}

// 절기월 1~12 = 입춘, 경칩, 청명, 입하, 망종, 소서, 입추, 백로, 한로, 입동, 대설, 소한
const TERMS: TermDef[] = [
    { month: 2, c: 3.87, earlyYear: true },
    { month: 3, c: 5.63 },
    { month: 4, c: 4.81 },
    { month: 5, c: 5.52 },
    { month: 6, c: 5.678 },
    { month: 7, c: 7.108 },
    { month: 8, c: 7.5 },
    { month: 9, c: 7.646 },
    { month: 10, c: 8.318 },
    { month: 11, c: 7.438 },
    { month: 12, c: 7.18 },
    { month: 1, c: 5.4055, earlyYear: true },
];

export const TERM_NAMES = ['입춘', '경칩', '청명', '입하', '망종', '소서', '입추', '백로', '한로', '입동', '대설', '소한'];

export interface MonthTerm {
    /** 절기월 번호 1~12 (1 = 인월, 입춘 시작) */
    index: number;
    termName: string;
    /** 시작 양력 연·월·일 (12번째는 이듬해 1월) */
    year: number;
    month: number;
    day: number;
}

export function getMonthTerm(year: number, index: number): MonthTerm {
    const def = TERMS[index - 1]!;
    const calYear = index === 12 ? year + 1 : year;
    const yy = calYear % 100;
    const leap = def.earlyYear ? Math.floor((yy - 1) / 4) : Math.floor(yy / 4);
    const day = Math.floor(yy * 0.2422 + def.c) - leap;
    return { index, termName: TERM_NAMES[index - 1]!, year: calYear, month: def.month, day };
}

export const termLabel = (t: MonthTerm) => `${t.month}/${t.day}`;
