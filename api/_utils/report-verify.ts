import type { PreciseSajuData } from '../types';
import { getYearPillarKo } from './report-years';
import { monthPillar } from './report-score';
import { hanjaOfBranch, hanjaOfStem } from './report-relations';

/**
 * 생성된 본문의 사실 검증기.
 * 본문에 등장한 한자 간지(예: 丙午)와 연도가 프롬프트에 주입된 결정론적 데이터(원국·대운·세운·월운)에
 * 존재하는지 대조한다. 어긋나면 해당 항목만 오류 목록과 함께 재생성한다.
 */

export interface AllowedFacts {
    ganji: Set<string>;
    years: Set<number>;
}

const GANJI_RE = /([甲乙丙丁戊己庚辛壬癸])([子丑寅卯辰巳午未申酉戌亥])/g;
const YEAR_RE = /((?:19|20)\d{2})\s*년/g;
const STEMS = '甲乙丙丁戊己庚辛壬癸';
const BRANCHES = '子丑寅卯辰巳午未申酉戌亥';

const isValidSexagenary = (stem: string, branch: string) => STEMS.indexOf(stem) % 2 === BRANCHES.indexOf(branch) % 2;

export function createAllowedFacts(): AllowedFacts {
    return { ganji: new Set(), years: new Set() };
}

export function addSajuFacts(f: AllowedFacts, saju: PreciseSajuData, birthYear: number) {
    f.years.add(birthYear);
    for (const k of ['year', 'month', 'day', 'hour'] as const) {
        const h = saju.ganZhiHanja[k];
        if (h && h.length === 2) f.ganji.add(h);
    }
    for (const lp of saju.luckPillars?.pillars ?? []) {
        f.ganji.add(lp.hanja);
        f.years.add(birthYear + lp.age - 1);
    }
}

/** 연도(세운)와 그 해의 월운 12개 간지를 허용 목록에 추가 */
export function addYearFacts(f: AllowedFacts, year: number) {
    f.years.add(year);
    const { stem, branch } = getYearPillarKo(year);
    f.ganji.add(`${hanjaOfStem(stem)}${hanjaOfBranch(branch)}`);
    for (let i = 1; i <= 12; i++) {
        const m = monthPillar(stem, i);
        f.ganji.add(`${hanjaOfStem(m.stem)}${hanjaOfBranch(m.branch)}`);
    }
}

export function findFactErrors(text: string, f: AllowedFacts): string[] {
    const errors: string[] = [];
    const seen = new Set<string>();

    for (const m of text.matchAll(GANJI_RE)) {
        const gj = m[0];
        if (seen.has(gj)) continue;
        seen.add(gj);
        if (!isValidSexagenary(m[1]!, m[2]!)) errors.push(`${gj}은(는) 존재하지 않는 간지입니다`);
        else if (!f.ganji.has(gj)) errors.push(`${gj}은(는) 제공된 데이터에 없는 간지입니다`);
    }
    for (const m of text.matchAll(YEAR_RE)) {
        const y = Number(m[1]);
        if (!f.years.has(y) && !seen.has(`y${y}`)) {
            seen.add(`y${y}`);
            errors.push(`${y}년은(는) 제공된 데이터에 없는 연도입니다`);
        }
    }
    return errors;
}

