import { getTenGod, getBranchTenGod } from 'manseryeok';
import type { PreciseSajuData } from '../types';
import { STEM_INFO, BRANCH_INFO } from './saju';

/**
 * 사주(십성·오행 분포) ↔ MBTI 4축 교차 단서.
 * 명리학과 MBTI 사이에 학문적 대응표는 없으므로 '재미용 가설'로 정의한 규칙 테이블이며,
 * 리포트에는 "경향"으로만 서술한다. AI 가 임의로 연결하지 않도록 일치/상반 판정을 코드가 먼저 낸다.
 */

type Letter = 'E' | 'I' | 'S' | 'N' | 'T' | 'F' | 'J' | 'P';

interface AxisResult {
    axis: string;
    saju: Letter | '균형';
    mbti: Letter | undefined;
    relation: '일치' | '상반' | '균형' | '미상';
    evidence: string;
}

const WEIGHT = { stem: 1, branch: 1, monthBranch: 1.5 };

export interface MbtiCross {
    lines: string[];
    matched: number;
    contrasted: number;
}

export function analyzeMbtiCross(saju: PreciseSajuData, mbti: string): MbtiCross | null {
    const type = (mbti || '').toUpperCase().trim();
    if (!/^[EI][SN][TF][JP]$/.test(type)) return null;

    const dayStem = saju.pillars.day.gan;
    const gods: { god: string; w: number }[] = [];
    const els: { el: string; w: number }[] = [];
    const p = saju.pillars;
    const pushStem = (s: string, w: number) => {
        if (!s || s === '?') return;
        gods.push({ god: getTenGod(dayStem as any, s as any), w });
        const e = STEM_INFO[s]?.element;
        if (e) els.push({ el: e, w });
    };
    const pushBranch = (b: string, w: number) => {
        if (!b || b === '?') return;
        gods.push({ god: getBranchTenGod(dayStem as any, b as any), w });
        const e = BRANCH_INFO[b]?.element;
        if (e) els.push({ el: e, w });
    };
    pushStem(p.year.gan, WEIGHT.stem);
    pushStem(p.month.gan, WEIGHT.stem);
    pushStem(p.hour.gan, WEIGHT.stem);
    pushBranch(p.year.zhi, WEIGHT.branch);
    pushBranch(p.month.zhi, WEIGHT.monthBranch);
    pushBranch(p.day.zhi, WEIGHT.branch);
    pushBranch(p.hour.zhi, WEIGHT.branch);

    const g = (names: string[]) => gods.filter(x => names.includes(x.god)).reduce((s, x) => s + x.w, 0);
    const e = (names: string[]) => els.filter(x => names.includes(x.el)).reduce((s, x) => s + x.w, 0);
    const f1 = (n: number) => n.toFixed(1);

    const MARGIN = 0.9;
    const judge = (a: number, b: number, hi: Letter, lo: Letter): Letter | '균형' => (a - b >= MARGIN ? hi : b - a >= MARGIN ? lo : '균형');

    const ext = g(['비견', '겁재', '식신', '상관']);
    const intr = g(['정인', '편인', '정관', '편관']);
    const nIntuit = g(['식신', '상관', '정인', '편인']);
    const sSense = g(['정재', '편재', '정관', '편관']);
    const tThink = e(['metal', 'water']);
    const fFeel = e(['wood', 'fire']);
    const jOrder = g(['정관', '정인', '정재']);
    const pFlex = g(['편관', '편인', '편재', '상관']);

    const raw: { axis: string; saju: Letter | '균형'; mbti: Letter; evidence: string }[] = [
        { axis: 'E/I', saju: judge(ext, intr, 'E', 'I'), mbti: type[0] as Letter, evidence: `표출 기운(비겁·식상) ${f1(ext)} vs 내향 기운(인성·관성) ${f1(intr)}` },
        { axis: 'S/N', saju: judge(sSense, nIntuit, 'S', 'N'), mbti: type[1] as Letter, evidence: `현실·감각 기운(재성·관성) ${f1(sSense)} vs 상상·직관 기운(식상·인성) ${f1(nIntuit)}` },
        { axis: 'T/F', saju: judge(tThink, fFeel, 'T', 'F'), mbti: type[2] as Letter, evidence: `냉철·분석 오행(금·수) ${f1(tThink)} vs 표현·공감 오행(목·화) ${f1(fFeel)}` },
        { axis: 'J/P', saju: judge(jOrder, pFlex, 'J', 'P'), mbti: type[3] as Letter, evidence: `질서 기운(정관·정인·정재) ${f1(jOrder)} vs 변화 기운(편관·편인·편재·상관) ${f1(pFlex)}` },
    ];

    const axes: AxisResult[] = raw.map(r => ({
        ...r,
        relation: r.saju === '균형' ? '균형' : r.saju === r.mbti ? '일치' : '상반',
    }));

    const lines = axes.map(a => {
        const verdict = a.relation === '일치' ? `사주 경향 ${a.saju} = MBTI ${a.mbti} → 일치(사주가 MBTI 성향을 뒷받침)`
            : a.relation === '상반' ? `사주 경향 ${a.saju} ↔ MBTI ${a.mbti} → 상반(겉으로 드러나는 모습과 타고난 결이 다른 지점)`
                : `사주 경향 균형 / MBTI ${a.mbti} → 사주가 어느 쪽도 강하게 밀지 않음(상황에 따라 유연)`;
        return `  - ${a.axis}: ${verdict} [근거: ${a.evidence}]`;
    });
    return {
        lines,
        matched: axes.filter(a => a.relation === '일치').length,
        contrasted: axes.filter(a => a.relation === '상반').length,
    };
}

export function buildMbtiCrossContext(saju: PreciseSajuData, mbti: string): string {
    const r = analyzeMbtiCross(saju, mbti);
    if (!r) return '';
    return `[사주×MBTI 교차 단서 — 코드 계산값(재미용 가설 규칙, '경향'으로만 서술할 것)]
${r.lines.join('\n')}
  - 종합: 4축 중 일치 ${r.matched}개, 상반 ${r.contrasted}개. 일치 축은 '사주와 MBTI가 같은 말을 한다'로, 상반 축은 '겉모습과 타고난 결의 차이, 성장 과제'로 풀이하십시오. 위에 없는 대응을 지어내지 마십시오.`;
}
