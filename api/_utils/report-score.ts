import { getTenGod, getBranchTenGod } from 'manseryeok';
import type { PreciseSajuData } from '../types';
import { STEM_INFO, BRANCH_INFO, ZHI_ORDER, getTwelveStage, getTwelveSpirits } from './saju';
import { getYearPillarKo, STEMS_KO_LIST } from './report-years';
import { getMonthTerm, termLabel, type MonthTerm } from './report-terms';
import {
    branchRelations, stemRelations, isCheoneul, isVoidBranch, tg,
    type NatalSlot, type RelationHit, type RelationKind,
} from './report-relations';

/**
 * 결정론적 운세 점수 엔진.
 * 일간 강약(억부 기준) → 용신/기신 → 연·월 단위 합충·십성·12운성·귀인·공망·대운 배경을 가중 합산해
 * 재물/커리어/인연/건강 점수(1~5)와 36개월 히트맵을 코드가 직접 낸다. AI 는 이 값을 '해석'만 한다.
 */

type El = 'wood' | 'fire' | 'earth' | 'metal' | 'water';
type Cat = '비겁' | '인성' | '식상' | '재성' | '관성';
export type Domain = 'wealth' | 'career' | 'love' | 'health';
export type Scores = Record<Domain, number>;

const GEN: Record<El, El> = { wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood' };
const CTRL: Record<El, El> = { wood: 'earth', earth: 'water', water: 'fire', fire: 'metal', metal: 'wood' };
const EL_KO: Record<El, string> = { wood: '목(木)', fire: '화(火)', earth: '토(土)', metal: '금(金)', water: '수(水)' };
const ALL_EL: El[] = ['wood', 'fire', 'earth', 'metal', 'water'];

/** 일간 오행 기준으로 오행 e 가 어떤 십성군인가 */
function catOf(dayEl: El, e: El): Cat {
    if (e === dayEl) return '비겁';
    if (GEN[e] === dayEl) return '인성';
    if (GEN[dayEl] === e) return '식상';
    if (CTRL[dayEl] === e) return '재성';
    return '관성';
}

export type StrengthLabel = '신강' | '중화' | '신약';

export interface StrengthInfo {
    label: StrengthLabel;
    /** 일간을 돕는 힘(비겁+인성) 비율 0~1 */
    supportRatio: number;
    dayEl: El;
    /** 십성군별 유리(+)/불리(-) 가중 */
    fav: Record<Cat, number>;
    yongshin: El[];
    gisin: El[];
    summary: string;
}

const FAV_STRONG: Record<Cat, number> = { 비겁: -1, 인성: -1, 식상: 1, 재성: 1, 관성: 0.8 };
const FAV_WEAK: Record<Cat, number> = { 비겁: 1, 인성: 1, 식상: -0.6, 재성: -0.6, 관성: -1 };
const FAV_MID: Record<Cat, number> = { 비겁: 0, 인성: 0, 식상: 0.3, 재성: 0.3, 관성: 0.3 };

const STEM_W = { year: 0.8, month: 1.2, hour: 1 };
const BRANCH_W = { year: 0.8, month: 3, day: 2, hour: 1 };

export function analyzeStrength(saju: PreciseSajuData): StrengthInfo {
    const dayEl = STEM_INFO[saju.pillars.day.gan]?.element ?? 'wood';
    let support = 0;
    let total = 0;
    const add = (el: El | undefined, w: number) => {
        if (!el) return;
        total += w;
        const c = catOf(dayEl, el);
        if (c === '비겁' || c === '인성') support += w;
    };
    const p = saju.pillars;
    add(STEM_INFO[p.year.gan]?.element, STEM_W.year);
    add(STEM_INFO[p.month.gan]?.element, STEM_W.month);
    add(BRANCH_INFO[p.year.zhi]?.element, BRANCH_W.year);
    add(BRANCH_INFO[p.month.zhi]?.element, BRANCH_W.month);
    add(BRANCH_INFO[p.day.zhi]?.element, BRANCH_W.day);
    if (p.hour.gan !== '?') {
        add(STEM_INFO[p.hour.gan]?.element, STEM_W.hour);
        add(BRANCH_INFO[p.hour.zhi]?.element, BRANCH_W.hour);
    }
    const supportRatio = total ? support / total : 0.5;
    const label: StrengthLabel = supportRatio >= 0.55 ? '신강' : supportRatio <= 0.42 ? '신약' : '중화';
    const fav = label === '신강' ? FAV_STRONG : label === '신약' ? FAV_WEAK : FAV_MID;

    const yongshin = ALL_EL.filter(e => fav[catOf(dayEl, e)] > 0.5);
    const gisin = ALL_EL.filter(e => fav[catOf(dayEl, e)] < -0.5);
    const joined = (a: El[]) => (a.length ? a.map(e => EL_KO[e]).join('·') : '뚜렷하지 않음');
    const summary = `일간 강약(억부 기준): ${label} (일간을 돕는 힘 ${Math.round(supportRatio * 100)}%) / 유리한 오행(용신 후보): ${joined(yongshin)} / 부담이 되는 오행(기신 후보): ${joined(gisin)}`;
    return { label, supportRatio, dayEl, fav, yongshin, gisin, summary };
}

export type GenderKey = 'female' | 'male' | 'unknown';
export const normalizeGender = (g?: string): GenderKey =>
    !g ? 'unknown' : (g === 'female' || g === '여성' || g === '여' || g === 'F') ? 'female' : (g === 'male' || g === '남성' || g === '남' || g === 'M') ? 'male' : 'unknown';

export function natalSlots(saju: PreciseSajuData): NatalSlot[] {
    const p = saju.pillars;
    const slots: NatalSlot[] = [
        { label: '년', meaning: '조상·사회적 환경', stem: p.year.gan, branch: p.year.zhi },
        { label: '월', meaning: '직업·사회 토대', stem: p.month.gan, branch: p.month.zhi },
        { label: '일', meaning: '본인·배우자궁', stem: p.day.gan, branch: p.day.zhi },
        { label: '시', meaning: '자녀·말년·내면', stem: p.hour.gan, branch: p.hour.zhi },
    ];
    return slots.filter(s => s.branch && s.branch !== '?');
}

/** 현재 나이 기준 대운 구간 (세는 나이: 출생 연도 = 1세) */
export function luckForYear(saju: PreciseSajuData, birthYear: number, year: number) {
    const lp = saju.luckPillars;
    if (!lp || !lp.pillars.length) return null;
    const age = year - birthYear + 1;
    let idx = -1;
    lp.pillars.forEach((p, i) => { if (p.age <= age) idx = i; });
    if (idx < 0) return { age, label: `아직 대운 진입 전(첫 대운 ${lp.startAge}세 시작)`, shiftYear: birthYear + lp.pillars[0]!.age - 1 } as LuckInfo;
    const cur = lp.pillars[idx]!;
    const next = lp.pillars[idx + 1];
    return {
        age,
        label: `${cur.korean}(${cur.hanja}) 대운 (${cur.age}세~)`,
        stem: cur.stem,
        branch: cur.branch,
        shiftYear: next ? birthYear + next.age - 1 : undefined,
        nextLabel: next ? `${next.korean}(${next.hanja})` : undefined,
    } as LuckInfo;
}
export interface LuckInfo {
    age: number;
    label: string;
    stem?: string;
    branch?: string;
    shiftYear?: number | undefined;
    nextLabel?: string | undefined;
}

export interface FortuneCtx {
    saju: PreciseSajuData;
    birthYear: number;
    gender: GenderKey;
    strength: StrengthInfo;
    slots: NatalSlot[];
}

export function buildFortuneCtx(saju: PreciseSajuData, birthYear: number, gender?: string): FortuneCtx {
    return { saju, birthYear, gender: normalizeGender(gender), strength: analyzeStrength(saju), slots: natalSlots(saju) };
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const toScore = (raw: number) => clamp(Math.round(raw), 1, 5);

const REL_DELTA: Record<RelationKind, number> = {
    '육합': 0.4, '삼합': 0.6, '반합': 0.2, '방합': 0, '충': -0.8, '형': -0.5, '파': -0.25, '해': -0.25, '천간합': 0.3, '천간충': -0.4,
};
type SlotKey = RelationHit['slot'];
const SLOT_W: Record<Domain, Record<SlotKey, number>> = {
    wealth: { '년': 0.5, '월': 1, '일': 0.6, '시': 0.5, multi: 0.8 },
    career: { '년': 0.6, '월': 1, '일': 0.6, '시': 0.4, multi: 0.8 },
    love: { '년': 0.3, '월': 0.3, '일': 1.2, '시': 0.3, multi: 0.5 },
    health: { '년': 0.4, '월': 0.7, '일': 1, '시': 0.5, multi: 0.6 },
};
const STAGE_BONUS: Record<string, number> = { '장생': 0.3, '목욕': 0, '관대': 0.3, '건록': 0.4, '제왕': 0.4, '쇠': -0.1, '병': -0.3, '사': -0.3, '묘': -0.2, '절': -0.2, '태': 0, '양': 0.1 };
const STAGE_DOMAIN_W: Record<Domain, number> = { health: 1, career: 0.6, wealth: 0.4, love: 0.2 };

const relScore = (hits: RelationHit[], d: Domain) => {
    let s = 0;
    for (const h of hits) {
        const delta = REL_DELTA[h.kind] * SLOT_W[d][h.slot];
        s += d === 'health' && delta > 0 ? delta * 0.5 : delta;
    }
    return s;
};

const elOfStem = (s: string): El | undefined => STEM_INFO[s]?.element;
const elOfBranch = (b: string): El | undefined => BRANCH_INFO[b]?.element;

/** 간지(천간·지지) 한 쌍이 이 명식에 주는 기운의 유불리 (-1~+1) */
function energyOf(ctx: FortuneCtx, stem: string, branch: string): number {
    const { strength } = ctx;
    const se = elOfStem(stem);
    const be = elOfBranch(branch);
    const sf = se ? strength.fav[catOf(strength.dayEl, se)] : 0;
    const bf = be ? strength.fav[catOf(strength.dayEl, be)] : 0;
    return 0.4 * sf + 0.6 * bf;
}

/** 해당 십성군(들)이 간지에 들어온 정도 (천간 0.6 + 지지 0.4) × 유불리 */
function categoryBonus(ctx: FortuneCtx, stem: string, branch: string, cats: [Cat, number][]): number {
    const { strength } = ctx;
    const se = elOfStem(stem);
    const be = elOfBranch(branch);
    let total = 0;
    for (const [cat, w] of cats) {
        const present = (se && catOf(strength.dayEl, se) === cat ? 0.6 : 0) + (be && catOf(strength.dayEl, be) === cat ? 0.4 : 0);
        total += strength.fav[cat] * present * 1.4 * w;
    }
    return total;
}

function loveCats(g: GenderKey): [Cat, number][] {
    return g === 'female' ? [['관성', 1]] : g === 'male' ? [['재성', 1]] : [['관성', 0.5], ['재성', 0.5]];
}

export interface MonthFortune {
    /** 절기월 번호 1~12 */
    index: number;
    /** 시작 양력 월 (12번째는 이듬해 1월) */
    calMonth: number;
    term: MonthTerm;
    termStart: string;
    ganji: string;
    stem: string;
    branch: string;
    stemGod: string;
    branchGod: string;
    score: number;
    raw: number;
    notes: string[];
}

export interface YearFortune {
    year: number;
    stem: string;
    branch: string;
    stemGod: string;
    branchGod: string;
    stage: string;
    spirit: string;
    scores: Scores;
    /** 4개 영역 연속값 합 — 연도 간 상대 비교용 */
    raw: number;
    energy: number;
    /** 점수에 영향을 준 요인(코드가 계산한 사실) */
    reasons: string[];
    relations: RelationHit[];
    luck: LuckInfo | null;
    months: MonthFortune[];
    bestMonths: number[];
    cautionMonths: number[];
}

export const monthPillar = (yearStem: string, index: number): { stem: string; branch: string } => {
    const yIdx = STEMS_KO_LIST.indexOf(yearStem);
    return {
        stem: STEMS_KO_LIST[((yIdx % 5) * 2 + 2 + (index - 1)) % 10]!,
        branch: ZHI_ORDER[(2 + (index - 1)) % 12]!,
    };
};

const godPair = (ctx: FortuneCtx, stem: string, branch: string) => ({
    stemGod: tg(getTenGod(ctx.saju.pillars.day.gan as any, stem as any)),
    branchGod: tg(getBranchTenGod(ctx.saju.pillars.day.gan as any, branch as any)),
});

export function computeMonthFortunes(ctx: FortuneCtx, year: number, yearRaw: number): MonthFortune[] {
    const { saju, slots } = ctx;
    const dayStem = saju.pillars.day.gan;
    const { stem: yStem, branch: yBranch } = getYearPillarKo(year);
    const coreSlots = slots.filter(s => s.label === '일' || s.label === '월');
    const yearBase = (yearRaw / 4 - 3) * 0.5;

    const months = Array.from({ length: 12 }, (_, i) => {
        const index = i + 1;
        const { stem, branch } = monthPillar(yStem, index);
        const term = getMonthTerm(year, index);
        const natalHits = branchRelations(coreSlots, branch, '월운 지지');
        const yearHits = branchRelations([], branch, '월운 지지', [{ label: '세운 지지', branch: yBranch }]);
        const notes: string[] = [];
        let rel = 0;
        for (const h of natalHits) {
            rel += REL_DELTA[h.kind] * (h.slot === '일' ? 1 : h.slot === '월' ? 0.9 : 0.6);
            notes.push(h.slot === 'multi' ? `원국과 ${h.kind}` : `${h.slot}지와 ${h.kind}`);
        }
        for (const h of yearHits) {
            rel += REL_DELTA[h.kind] * 0.6;
            notes.push(`세운과 ${h.kind}`);
        }
        const energy = energyOf(ctx, stem, branch);
        const raw = 3 + yearBase + 0.9 * energy + 0.8 * rel + (isCheoneul(dayStem, branch) ? 0.25 : 0);
        if (isCheoneul(dayStem, branch)) notes.push('천을귀인');
        const { stemGod, branchGod } = godPair(ctx, stem, branch);
        return {
            index, calMonth: term.month, term, termStart: termLabel(term),
            ganji: `${stem}${branch}`, stem, branch, stemGod, branchGod,
            score: toScore(raw), raw, notes,
        } satisfies MonthFortune;
    });
    return months;
}

export function pickBestCautionMonths(months: MonthFortune[]): { best: number[]; caution: number[] } {
    const sorted = [...months].sort((a, b) => b.raw - a.raw || a.index - b.index);
    const avg = months.reduce((s, m) => s + m.raw, 0) / (months.length || 1);
    const best = sorted.slice(0, 2).filter(m => m.raw >= avg).map(m => m.calMonth);
    const caution = sorted.slice(-2).reverse().filter(m => m.raw <= avg && !best.includes(m.calMonth)).map(m => m.calMonth);
    return { best, caution };
}

export function computeYearFortune(ctx: FortuneCtx, year: number): YearFortune {
    const { saju, slots, strength, gender } = ctx;
    const dayStem = saju.pillars.day.gan;
    const dayBranch = saju.pillars.day.zhi;
    const { stem, branch } = getYearPillarKo(year);
    const { stemGod, branchGod } = godPair(ctx, stem, branch);
    const stage = getTwelveStage(dayStem, branch);
    const spirit = dayBranch && dayBranch !== '?' ? getTwelveSpirits(dayBranch, branch) : '-';
    const luck = luckForYear(saju, ctx.birthYear, year);
    const luckBranch = luck?.branch;
    const luckStem = luck?.stem;

    const relations = [
        ...branchRelations(slots, branch, '세운 지지', luckBranch ? [{ label: '대운 지지', branch: luckBranch }] : []),
        ...stemRelations(slots, stem, '세운 천간', luckStem ? [{ label: '대운 천간', stem: luckStem }] : []),
    ];

    const reasons: string[] = [];
    const energy = energyOf(ctx, stem, branch);
    const luckEnergy = luckStem && luckBranch ? energyOf(ctx, luckStem, luckBranch) : 0;
    const voided = isVoidBranch(saju.voidBranches, branch);
    const guiin = isCheoneul(dayStem, branch);
    const dohwa = spirit.startsWith('연살');
    const stageKey = stage.split('(')[0] ?? '';
    const stageBonus = STAGE_BONUS[stageKey] ?? 0;

    if (energy >= 0.35) reasons.push(`세운 기운이 용신 쪽(${strength.label} 명식에 유리)`);
    else if (energy <= -0.35) reasons.push(`세운 기운이 기신 쪽(${strength.label} 명식에 부담)`);
    if (luckEnergy >= 0.35) reasons.push('대운 배경이 유리');
    else if (luckEnergy <= -0.35) reasons.push('대운 배경이 부담');
    if (guiin) reasons.push('세운 지지가 천을귀인');
    if (voided) reasons.push('세운 지지가 공망(空亡)');
    if (dohwa) reasons.push('세운 지지가 연살(도화) 자리');
    const dayBranchHit = relations.find(h => h.slot === '일' && h.kind !== '천간합' && h.kind !== '천간충');
    if (dayBranchHit) reasons.push(`일지(배우자궁)와 ${dayBranchHit.kind}`);
    const monthBranchHit = relations.find(h => h.slot === '월' && h.kind !== '천간합' && h.kind !== '천간충');
    if (monthBranchHit) reasons.push(`월지(직업궁)와 ${monthBranchHit.kind}`);
    if (relations.some(h => h.kind === '삼합' || h.kind === '방합')) reasons.push('삼합·방합 성립(오행 결집)');

    const base = (d: Domain) => 3 + 1.0 * energy + 0.5 * luckEnergy + relScore(relations, d) + STAGE_DOMAIN_W[d] * stageBonus + (voided ? -0.3 : 0);

    const ratio = saju.elementRatio as unknown as Record<string, number>;
    const be = elOfBranch(branch);
    const se = elOfStem(stem);
    let healthEl = 0;
    for (const e of [se, be]) {
        if (!e) continue;
        if ((ratio[e] ?? 0) >= 35) healthEl -= 0.3;
        if ((ratio[e] ?? 0) === 0) healthEl += 0.3;
    }
    if (healthEl <= -0.3) reasons.push('세운 오행이 이미 과다한 기운을 더 키움');
    if (healthEl >= 0.3) reasons.push('세운 오행이 원국에 없는 기운을 보완');

    const raws: Scores = {
        wealth: base('wealth') + categoryBonus(ctx, stem, branch, [['재성', 1], ['식상', 0.5]]) + (guiin ? 0.2 : 0),
        career: base('career') + categoryBonus(ctx, stem, branch, [['관성', 1], ['인성', 0.5]]) + (guiin ? 0.3 : 0),
        love: base('love') + categoryBonus(ctx, stem, branch, loveCats(gender)) + (dohwa ? 0.4 : 0) + (guiin ? 0.1 : 0),
        health: base('health') * 0.6 + 3 * 0.4 + healthEl,
    };
    const scores: Scores = { wealth: toScore(raws.wealth), career: toScore(raws.career), love: toScore(raws.love), health: toScore(raws.health) };
    const raw = raws.wealth + raws.career + raws.love + raws.health;

    const months = computeMonthFortunes(ctx, year, raw);
    const { best, caution } = pickBestCautionMonths(months);

    return { year, stem, branch, stemGod, branchGod, stage, spirit, scores, raw, energy, reasons, relations, luck, months, bestMonths: best, cautionMonths: caution };
}

/**
 * 올해 남은 기간 점수: 세운 기준 점수에 남은 절기월들의 월운 평균 흐름(3점 대비 편차)을 절반만 반영한다.
 * 무료 미리보기와 유료 리포트가 같은 값을 쓰도록 한 곳에서 계산한다.
 */
export function computeRemainingScores(yf: YearFortune, fromIndex: number): Scores {
    const remaining = yf.months.filter(m => m.index >= fromIndex);
    const drift = remaining.length ? remaining.reduce((s, m) => s + (m.raw - 3), 0) / remaining.length : 0;
    const adj = (n: number) => toScore(n + drift * 0.5);
    return { wealth: adj(yf.scores.wealth), career: adj(yf.scores.career), love: adj(yf.scores.love), health: adj(yf.scores.health) };
}

export const sumScores = (s: Scores) => s.wealth + s.career + s.love + s.health;
export { EL_KO };
