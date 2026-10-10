import type { PreciseSajuData } from '../types';
import { STEM_INFO, BRANCH_INFO } from './saju';
import { getYearPillarKo } from './report-years';
import { hanjaOfBranch, hanjaOfStem, isCheoneul } from './report-relations';
import {
    luckForYear, computeYearFortune, type FortuneCtx, type YearFortune, type Scores, EL_KO,
} from './report-score';

/**
 * 세운(歲運)·월운(月運)·대운(大運) 교차 분석용 결정론적 컨텍스트 텍스트.
 * AI 가 연도 간지·합충·점수를 직접 추정(환각)하지 못하도록, 코드가 계산한 사실만 프롬프트에 주입한다.
 * 계산 자체는 report-score.ts / report-relations.ts / report-terms.ts 가 담당한다.
 */

export { getYearPillarKo };

const ganjiLabel = (stem: string, branch: string) => `${stem}${branch}(${hanjaOfStem(stem)}${hanjaOfBranch(branch)})`;
const stars = (n: number) => `${n}/5`;
const scoreLine = (s: Scores) => `재물 ${stars(s.wealth)} · 커리어 ${stars(s.career)} · 인연 ${stars(s.love)} · 건강 ${stars(s.health)}`;

export function buildStrengthContext(ctx: FortuneCtx): string {
    const ratio = ctx.saju.elementRatio as unknown as Record<string, number>;
    const dm = ctx.saju.dayMaster;
    const gender = ctx.gender === 'female' ? '여성' : ctx.gender === 'male' ? '남성' : '미상';
    return `[명식 강약·용신 — 코드 계산값(억부 기준, 이 판정을 그대로 사용할 것)]
  - ${ctx.strength.summary}
  - 일간 ${dm.chinese}(${dm.korean}) 오행: ${EL_KO[ctx.strength.dayEl]} / 성별: ${gender}
  - 오행 비율: ${Object.entries(ratio).map(([k, v]) => `${EL_KO[k as keyof typeof EL_KO] ?? k} ${v}%`).join(', ')}`;
}

function monthLines(yf: YearFortune, fromIndex = 1): string[] {
    return yf.months.filter(m => m.index >= fromIndex).map(m => {
        const tag = m.score >= 4 ? ' ▲좋음' : m.score <= 2 ? ' ▽조심' : '';
        return `  - 양력 ${m.calMonth}월(${m.term.termName} ${m.termStart}~): ${ganjiLabel(m.stem, m.branch)} · 십성 ${m.stemGod}/${m.branchGod} · 점수 ${m.score}/5${tag}${m.notes.length ? ` · ${m.notes.join(', ')}` : ''}`;
    });
}

function luckLines(yf: YearFortune): string[] {
    const luck = yf.luck;
    if (!luck) return [];
    const lines = [`  - 해당 연도 세는 나이 ${luck.age}세, 적용 대운: ${luck.label}`];
    if (luck.shiftYear && luck.shiftYear >= yf.year && luck.shiftYear <= yf.year + 1) {
        lines.push(`  - ★ 대운 교체 시기 임박: 약 ${luck.shiftYear}년경 ${luck.nextLabel ?? ''} 대운으로 전환`);
    }
    return lines;
}

function extraSignals(ctx: FortuneCtx, yf: YearFortune): string[] {
    const out: string[] = [];
    if (isCheoneul(ctx.saju.pillars.day.gan, yf.branch)) out.push('세운 지지가 천을귀인(天乙貴人)에 해당 → 귀인의 도움을 받기 쉬운 해');
    if (yf.spirit.startsWith('연살')) out.push('세운 지지가 연살(도화) 자리 → 사람들 눈에 띄고 인기·인연이 움직이는 기운');
    if (yf.spirit.startsWith('역마')) out.push('세운 지지가 역마살 자리 → 이동·이직·여행 등 환경 변화');
    if (yf.spirit.startsWith('화개')) out.push('세운 지지가 화개살 자리 → 공부·창작·내면 몰입에 유리한 기운');
    return out;
}

/** 올해 남은 기간처럼 일부 절기월만 볼 때의 좋은 달/조심할 달 (양력 월 번호) */
export function pickPartialMonths(yf: YearFortune, fromIndex: number): { best: number[]; caution: number[] } {
    const byRaw = [...yf.months.filter(m => m.index >= fromIndex)].sort((a, b) => b.raw - a.raw || a.index - b.index);
    const best = byRaw.slice(0, 2).filter(m => m.score >= 3).map(m => m.calMonth);
    const caution = [...byRaw].reverse().slice(0, 2).filter(m => m.score <= 3 && !best.includes(m.calMonth)).map(m => m.calMonth);
    return { best, caution };
}

/** fromIndex: 올해 남은 기간처럼 일부 절기월만 다룰 때 시작 절기월 번호 */
export function buildYearFortuneContext(ctx: FortuneCtx, yf: YearFortune, fromIndex = 1): string {
    const stemEl = STEM_INFO[yf.stem]?.element;
    const branchEl = BRANCH_INFO[yf.branch]?.element;
    const extra = extraSignals(ctx, yf);
    const partial = fromIndex > 1;
    const remaining = yf.months.filter(m => m.index >= fromIndex);
    const { best, caution } = partial ? pickPartialMonths(yf, fromIndex) : { best: yf.bestMonths, caution: yf.cautionMonths };
    const partialNote = partial && remaining.length
        ? `\n  - ※ 지금 이후 남은 절기월(${remaining[0]!.termStart}~)만 다룹니다. 이미 지나간 달은 언급하지 마십시오. 마지막 절기월(${remaining[remaining.length - 1]!.termStart}~)은 새해 직전이므로 '올해의 마무리이자 새해 준비'로 서술하십시오.`
        : '';
    return `[${yf.year}년 ${ganjiLabel(yf.stem, yf.branch)}년${partial ? ' 올해 남은 기간' : ''} — 결정론적 세운 데이터(코드 계산값, 그대로 사용할 것)]${partialNote}
  - 세운 천간 ${hanjaOfStem(yf.stem)}(${yf.stem}) 오행 ${stemEl ? EL_KO[stemEl] : '-'}: 일간 기준 십성 ${yf.stemGod} / 세운 지지 ${hanjaOfBranch(yf.branch)}(${yf.branch}) 오행 ${branchEl ? EL_KO[branchEl] : '-'}: 십성 ${yf.branchGod}
  - 일간 기준 세운 지지의 12운성: ${yf.stage} / 12신살(일지 기준): ${yf.spirit}
${luckLines(yf).join('\n')}
  - ★ 분야별 점수(코드 계산, 임의 변경 금지): ${scoreLine(yf.scores)}
  - 점수 근거: ${yf.reasons.length ? yf.reasons.join(' / ') : '특별히 크게 작용하는 요인 없이 평이'}
  - 좋은 달(월운 점수 상위): ${best.length ? best.map(m => `양력 ${m}월경`).join(', ') : '뚜렷하지 않음'} / 조심할 달: ${caution.length ? caution.map(m => `양력 ${m}월경`).join(', ') : '뚜렷하지 않음'}
  - 원국·대운과의 합충형파해·삼합·방합: ${yf.relations.length ? '\n    · ' + yf.relations.map(r => r.text).join('\n    · ') : '해당 없음(특별한 충·합 없이 비교적 평탄)'}
${extra.length ? `  - 추가 신호: ${extra.join(' / ')}\n` : ''}  - 월운(절기월 12개, 시기 판단의 근거로 사용할 것. 절입일은 일자 기준 근사):
${monthLines(yf, fromIndex).join('\n')}`;
}

export function buildYearsFortuneContext(ctx: FortuneCtx, years: YearFortune[]): string {
    return years.map(y => buildYearFortuneContext(ctx, y)).join('\n\n');
}

/** 지나온 해(적중 확인)용 컨텍스트 — 변동이 컸을 시기 후보를 월운 점수 극단값으로 제시 */
export function buildPastContext(ctx: FortuneCtx, past: YearFortune[]): string {
    const blocks = past.map(yf => {
        const swing = [...yf.months].sort((a, b) => Math.abs(b.raw - 3) - Math.abs(a.raw - 3)).slice(0, 2).sort((a, b) => a.index - b.index);
        const hits = yf.relations.map(r => r.text);
        return `[${yf.year}년 ${ganjiLabel(yf.stem, yf.branch)}년 — 이미 지나간 해]
  - 세운 십성 ${yf.stemGod}/${yf.branchGod}, 12운성 ${yf.stage}, 적용 대운 ${yf.luck?.label ?? '-'}
  - 분야별 점수(코드 계산): ${scoreLine(yf.scores)}
  - 원국·대운과의 관계: ${hits.length ? '\n    · ' + hits.join('\n    · ') : '해당 없음(큰 변동 요인 없음)'}
  - 변화가 컸을 시기 후보: ${swing.map(m => `양력 ${m.calMonth}월경(${m.ganji}, 십성 ${m.stemGod}/${m.branchGod}${m.notes.length ? ', ' + m.notes.join('·') : ''}, 점수 ${m.score}/5)`).join(' / ')}`;
    });
    return blocks.join('\n\n');
}

/** 연도와 무관하게 쓰는 현재 대운 요약 (원국/기질/액션플랜용) */
export function buildLuckSummary(saju: PreciseSajuData, birthYear: number, nowYear: number): string {
    const luck = luckForYear(saju, birthYear, nowYear);
    if (!luck) return '대운 정보 없음';
    return `현재(${nowYear}년, 세는 나이 ${luck.age}세) 대운: ${luck.label}${luck.shiftYear ? ` / 다음 대운 전환 약 ${luck.shiftYear}년경` : ''}`;
}

export { computeYearFortune };
