import { getTenGod, getBranchTenGod } from 'manseryeok';
import type { PreciseSajuData } from '../types';
import { STEM_INFO, BRANCH_INFO, ZHI_ORDER, getTwelveStage, getTwelveSpirits } from './saju';
import type { RoadmapYear } from './report-years';

/**
 * 세운(歲運)·월운(月運)·대운(大運) 교차 분석용 결정론적 데이터.
 * AI 가 연도 간지·합충 관계를 직접 추정(환각)하지 못하도록, 코드가 계산한 사실만 프롬프트에 주입한다.
 */

const STEMS_KO = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];
const ELEMENT_KO: Record<string, string> = { wood: '목(木)', fire: '화(火)', earth: '토(土)', metal: '금(金)', water: '수(水)' };

const TEN_GOD_HANJA: Record<string, string> = {
    '비견': '비견(比肩)', '겁재': '겁재(劫財)', '식신': '식신(食神)', '상관': '상관(傷官)',
    '편재': '편재(偏財)', '정재': '정재(正財)', '편관': '편관(偏官)', '정관': '정관(正官)',
    '편인': '편인(偏印)', '정인': '정인(正印)',
};
const tg = (name: string) => TEN_GOD_HANJA[name] || name;

const pair = (a: string, b: string) => (x: string, y: string) => (x === a && y === b) || (x === b && y === a);
const BRANCH_RELATIONS: { name: string; test: (x: string, y: string) => boolean }[] = [
    { name: '육합(六合)', test: (x, y) => [['자', '축'], ['인', '해'], ['묘', '술'], ['진', '유'], ['사', '신'], ['오', '미']].some(([a, b]) => pair(a!, b!)(x, y)) },
    { name: '충(沖)', test: (x, y) => [['자', '오'], ['축', '미'], ['인', '신'], ['묘', '유'], ['진', '술'], ['사', '해']].some(([a, b]) => pair(a!, b!)(x, y)) },
    { name: '형(刑)', test: (x, y) => [['인', '사'], ['사', '신'], ['인', '신'], ['축', '술'], ['술', '미'], ['축', '미'], ['자', '묘']].some(([a, b]) => pair(a!, b!)(x, y)) || (x === y && ['진', '오', '유', '해'].includes(x)) },
    { name: '파(破)', test: (x, y) => [['자', '유'], ['축', '진'], ['인', '해'], ['묘', '오'], ['사', '신'], ['술', '미']].some(([a, b]) => pair(a!, b!)(x, y)) },
    { name: '해(害)', test: (x, y) => [['자', '미'], ['축', '오'], ['인', '사'], ['묘', '진'], ['신', '해'], ['유', '술']].some(([a, b]) => pair(a!, b!)(x, y)) },
];
const STEM_RELATIONS: { name: string; test: (x: string, y: string) => boolean }[] = [
    { name: '천간합(天干合)', test: (x, y) => [['갑', '기'], ['을', '경'], ['병', '신'], ['정', '임'], ['무', '계']].some(([a, b]) => pair(a!, b!)(x, y)) },
    { name: '천간충(天干沖)', test: (x, y) => [['갑', '경'], ['을', '신'], ['병', '임'], ['정', '계']].some(([a, b]) => pair(a!, b!)(x, y)) },
];

const hanjaOfBranch = (b: string) => BRANCH_INFO[b]?.hanja ?? b;
const hanjaOfStem = (s: string) => STEM_INFO[s]?.hanja ?? s;
const ganjiLabel = (stem: string, branch: string) => `${stem}${branch}(${hanjaOfStem(stem)}${hanjaOfBranch(branch)})`;

export function getYearPillarKo(year: number): { stem: string; branch: string } {
    return {
        stem: STEMS_KO[(((year - 4) % 10) + 10) % 10]!,
        branch: ZHI_ORDER[(((year - 4) % 12) + 12) % 12]!,
    };
}

interface NatalSlot { label: string; meaning: string; stem: string; branch: string }

function natalSlots(saju: PreciseSajuData): NatalSlot[] {
    const p = saju.pillars;
    const slots: NatalSlot[] = [
        { label: '년', meaning: '조상·사회적 환경', stem: p.year.gan, branch: p.year.zhi },
        { label: '월', meaning: '직업·사회 토대', stem: p.month.gan, branch: p.month.zhi },
        { label: '일', meaning: '본인·배우자궁', stem: p.day.gan, branch: p.day.zhi },
        { label: '시', meaning: '자녀·말년·내면', stem: p.hour.gan, branch: p.hour.zhi },
    ];
    return slots.filter(s => s.branch && s.branch !== '?');
}

function branchHits(slots: NatalSlot[], branch: string, prefix: string): string[] {
    const hits: string[] = [];
    for (const s of slots) {
        for (const r of BRANCH_RELATIONS) {
            if (r.test(branch, s.branch)) hits.push(`${prefix} ${hanjaOfBranch(branch)}(${branch})와 ${s.label}지 ${hanjaOfBranch(s.branch)}(${s.branch})[${s.meaning}] → ${r.name}`);
        }
    }
    return hits;
}

function stemHits(slots: NatalSlot[], stem: string, prefix: string): string[] {
    const hits: string[] = [];
    for (const s of slots) {
        if (!s.stem || s.stem === '?') continue;
        for (const r of STEM_RELATIONS) {
            if (r.test(stem, s.stem)) hits.push(`${prefix} ${hanjaOfStem(stem)}(${stem})와 ${s.label}간 ${hanjaOfStem(s.stem)}(${s.stem}) → ${r.name}`);
        }
    }
    return hits;
}

/** 절기월(입춘 기준) 12개: 월건 간지 = 오호둔(五虎遁) 공식. 시작일은 대략값(절입 일시는 해마다 ±1일). */
const MONTH_START = ['2/4', '3/6', '4/5', '5/6', '6/6', '7/7', '8/7', '9/8', '10/8', '11/7', '12/7', '다음해 1/6'];

function buildMonthLines(saju: PreciseSajuData, year: number): string[] {
    const dayStem = saju.pillars.day.gan;
    const dayBranch = saju.pillars.day.zhi;
    const monthBranch = saju.pillars.month.zhi;
    const yStemIdx = STEMS_KO.indexOf(getYearPillarKo(year).stem);
    return Array.from({ length: 12 }, (_, i) => {
        const stem = STEMS_KO[((yStemIdx % 5) * 2 + 2 + i) % 10]!;
        const branch = ZHI_ORDER[(2 + i) % 12]!;
        const notes: string[] = [];
        for (const r of BRANCH_RELATIONS) {
            if (dayBranch && dayBranch !== '?' && r.test(branch, dayBranch)) notes.push(`일지(배우자궁)와 ${r.name}`);
            if (monthBranch && monthBranch !== '?' && r.test(branch, monthBranch)) notes.push(`월지(직업궁)와 ${r.name}`);
        }
        const gods = `${tg(getTenGod(dayStem as any, stem as any))}/${tg(getBranchTenGod(dayStem as any, branch as any))}`;
        return `  - ${i + 1}번째 절기월(양력 약 ${MONTH_START[i]}~): ${ganjiLabel(stem, branch)} · 십성 ${gods}${notes.length ? ` · ${notes.join(', ')}` : ''}`;
    });
}

/** 현재 나이 기준 대운 구간 (세는 나이: 출생 연도 = 1세) */
function luckForYear(saju: PreciseSajuData, birthYear: number, year: number) {
    const lp = saju.luckPillars;
    if (!lp || !lp.pillars.length) return null;
    const age = year - birthYear + 1;
    let idx = -1;
    lp.pillars.forEach((p, i) => { if (p.age <= age) idx = i; });
    if (idx < 0) return { age, label: `아직 대운 진입 전(첫 대운 ${lp.startAge}세 시작)`, shiftYear: birthYear + lp.pillars[0]!.age - 1 };
    const cur = lp.pillars[idx]!;
    const next = lp.pillars[idx + 1];
    return {
        age,
        label: `${cur.korean}(${cur.hanja}) 대운 (${cur.age}세~)`,
        stemGod: tg(getTenGod(saju.pillars.day.gan as any, cur.stem as any)),
        branchGod: tg(getBranchTenGod(saju.pillars.day.gan as any, cur.branch as any)),
        shiftYear: next ? birthYear + next.age - 1 : undefined,
        nextLabel: next ? `${next.korean}(${next.hanja})` : undefined,
    };
}

export function buildYearFortuneContext(saju: PreciseSajuData, birthYear: number, ry: RoadmapYear): string {
    const slots = natalSlots(saju);
    const dayStem = saju.pillars.day.gan;
    const dayBranch = saju.pillars.day.zhi;
    const { stem, branch } = getYearPillarKo(ry.year);

    const stemGod = tg(getTenGod(dayStem as any, stem as any));
    const branchGod = tg(getBranchTenGod(dayStem as any, branch as any));
    const stage = getTwelveStage(dayStem, branch);
    const spirit = dayBranch && dayBranch !== '?' ? getTwelveSpirits(dayBranch, branch) : '-';
    const stemEl = STEM_INFO[stem]?.element;
    const branchEl = BRANCH_INFO[branch]?.element;

    const ratio = saju.elementRatio as unknown as Record<string, number>;
    const lackEls = Object.entries(ratio).filter(([, v]) => v === 0).map(([k]) => k);
    const overEls = Object.entries(ratio).filter(([, v]) => v >= 35).map(([k]) => k);
    const elementNotes: string[] = [];
    for (const [label, el] of [['세운 천간', stemEl], ['세운 지지', branchEl]] as const) {
        if (!el) continue;
        if (lackEls.includes(el)) elementNotes.push(`${label}의 ${ELEMENT_KO[el]}는 원국에 없는 기운을 채워 줌(보완)`);
        if (overEls.includes(el)) elementNotes.push(`${label}의 ${ELEMENT_KO[el]}는 이미 과다한 기운을 더 키움(과열 주의)`);
    }

    const relations = [...branchHits(slots, branch, '세운 지지'), ...stemHits(slots, stem, '세운 천간')];
    const luck = luckForYear(saju, birthYear, ry.year);
    const luckLines: string[] = [];
    if (luck) {
        luckLines.push(`  - 해당 연도 세는 나이 ${luck.age}세, 적용 대운: ${luck.label}${'stemGod' in luck ? ` · 대운 천간십성 ${luck.stemGod} / 지지십성 ${luck.branchGod}` : ''}`);
        if ('shiftYear' in luck && luck.shiftYear && luck.shiftYear >= ry.year && luck.shiftYear <= ry.year + 1) {
            luckLines.push(`  - ★ 대운 교체 시기 임박: 약 ${luck.shiftYear}년경 ${'nextLabel' in luck ? luck.nextLabel : ''} 대운으로 전환`);
        }
    }

    return `[${ry.year}년 ${ganjiLabel(stem, branch)}년 — 결정론적 세운 데이터(코드 계산값, 그대로 사용할 것)]
  - 세운 천간 ${hanjaOfStem(stem)}(${stem}): 일간 기준 십성 ${stemGod} / 세운 지지 ${hanjaOfBranch(branch)}(${branch}): 십성 ${branchGod}
  - 일간 기준 세운 지지의 12운성: ${stage} / 12신살(일지 기준): ${spirit}
${luckLines.join('\n')}
  - 원국과의 합충형파해: ${relations.length ? '\n    · ' + relations.join('\n    · ') : '해당 없음(특별한 충·합 없이 비교적 평탄)'}
  - 오행 보완/과열: ${elementNotes.length ? elementNotes.join(' / ') : '특이사항 없음'}
  - 월운(절기월 12개, 시기 판단의 근거로 사용할 것):
${buildMonthLines(saju, ry.year).join('\n')}`;
}

export function buildYearsFortuneContext(saju: PreciseSajuData, birthYear: number, years: RoadmapYear[]): string {
    return years.map(y => buildYearFortuneContext(saju, birthYear, y)).join('\n\n');
}

/** 연도와 무관하게 쓰는 현재 대운 요약 (원국/기질/액션플랜용) */
export function buildLuckSummary(saju: PreciseSajuData, birthYear: number, nowYear: number): string {
    const luck = luckForYear(saju, birthYear, nowYear);
    if (!luck) return '대운 정보 없음';
    return `현재(${nowYear}년, 세는 나이 ${luck.age}세) 대운: ${luck.label}${'shiftYear' in luck && luck.shiftYear ? ` / 다음 대운 전환 약 ${luck.shiftYear}년경` : ''}`;
}
