import { STEM_INFO, BRANCH_INFO } from './saju';

/**
 * 합·충·형·파·해 및 삼합·방합·공망·귀인 판정 (결정론).
 * 위치별(년/월/일/시) 가중치가 달라 점수 엔진과 프롬프트 컨텍스트가 같은 판정 결과를 공유한다.
 */

export type RelationKind = '육합' | '충' | '형' | '파' | '해' | '삼합' | '반합' | '방합' | '천간합' | '천간충';

export interface RelationHit {
    kind: RelationKind;
    /** 원국에서 부딪힌 자리: 년/월/일/시 (삼합·방합은 'multi') */
    slot: '년' | '월' | '일' | '시' | 'multi';
    /** 프롬프트에 그대로 인용할 설명 */
    text: string;
}

export const TEN_GOD_HANJA: Record<string, string> = {
    '비견': '비견(比肩)', '겁재': '겁재(劫財)', '식신': '식신(食神)', '상관': '상관(傷官)',
    '편재': '편재(偏財)', '정재': '정재(正財)', '편관': '편관(偏官)', '정관': '정관(正官)',
    '편인': '편인(偏印)', '정인': '정인(正印)',
};
export const tg = (name: string) => TEN_GOD_HANJA[name] || name;

const pair = (a: string, b: string) => (x: string, y: string) => (x === a && y === b) || (x === b && y === a);
const anyPair = (pairs: string[][]) => (x: string, y: string) => pairs.some(([a, b]) => pair(a!, b!)(x, y));

const BRANCH_RELATIONS: { kind: Exclude<RelationKind, '삼합' | '반합' | '방합' | '천간합' | '천간충'>; test: (x: string, y: string) => boolean }[] = [
    { kind: '육합', test: anyPair([['자', '축'], ['인', '해'], ['묘', '술'], ['진', '유'], ['사', '신'], ['오', '미']]) },
    { kind: '충', test: anyPair([['자', '오'], ['축', '미'], ['인', '신'], ['묘', '유'], ['진', '술'], ['사', '해']]) },
    { kind: '형', test: (x, y) => anyPair([['인', '사'], ['사', '신'], ['인', '신'], ['축', '술'], ['술', '미'], ['축', '미'], ['자', '묘']])(x, y) || (x === y && ['진', '오', '유', '해'].includes(x)) },
    { kind: '파', test: anyPair([['자', '유'], ['축', '진'], ['인', '해'], ['묘', '오'], ['사', '신'], ['술', '미']]) },
    { kind: '해', test: anyPair([['자', '미'], ['축', '오'], ['인', '사'], ['묘', '진'], ['신', '해'], ['유', '술']]) },
];
const STEM_RELATIONS: { kind: '천간합' | '천간충'; test: (x: string, y: string) => boolean }[] = [
    { kind: '천간합', test: anyPair([['갑', '기'], ['을', '경'], ['병', '신'], ['정', '임'], ['무', '계']]) },
    { kind: '천간충', test: anyPair([['갑', '경'], ['을', '신'], ['병', '임'], ['정', '계']]) },
];

export const KIND_LABEL: Record<RelationKind, string> = {
    '육합': '육합(六合)', '충': '충(沖)', '형': '형(刑)', '파': '파(破)', '해': '해(害)',
    '삼합': '삼합(三合)', '반합': '반합(半合)', '방합': '방합(方合)', '천간합': '천간합(天干合)', '천간충': '천간충(天干沖)',
};

const hanjaB = (b: string) => BRANCH_INFO[b]?.hanja ?? b;
const hanjaS = (s: string) => STEM_INFO[s]?.hanja ?? s;

export interface NatalSlot { label: '년' | '월' | '일' | '시'; meaning: string; stem: string; branch: string }

/** 삼합: [생지, 왕지, 고지] + 오행 */
const TRIADS: { members: [string, string, string]; el: string }[] = [
    { members: ['신', '자', '진'], el: '수(水)' },
    { members: ['해', '묘', '미'], el: '목(木)' },
    { members: ['인', '오', '술'], el: '화(火)' },
    { members: ['사', '유', '축'], el: '금(金)' },
];
const DIRECTIONALS: { members: [string, string, string]; el: string }[] = [
    { members: ['인', '묘', '진'], el: '목(木)' },
    { members: ['사', '오', '미'], el: '화(火)' },
    { members: ['신', '유', '술'], el: '금(金)' },
    { members: ['해', '자', '축'], el: '수(水)' },
];

/**
 * 들어오는 지지(세운·월운·대운)가 원국 지지와 만드는 관계 전부.
 * `prefix` 예: '세운 지지', '월운 지지', '대운 지지'
 */
export function branchRelations(slots: NatalSlot[], branch: string, prefix: string, extraBranches: { label: string; branch: string }[] = []): RelationHit[] {
    const hits: RelationHit[] = [];
    const subject = `${prefix} ${hanjaB(branch)}(${branch})`;

    for (const s of slots) {
        for (const r of BRANCH_RELATIONS) {
            if (r.test(branch, s.branch)) {
                hits.push({ kind: r.kind, slot: s.label, text: `${subject}와 ${s.label}지 ${hanjaB(s.branch)}(${s.branch})[${s.meaning}] → ${KIND_LABEL[r.kind]}` });
            }
        }
    }
    // 대운↔세운처럼 원국 밖 지지끼리의 관계
    for (const e of extraBranches) {
        for (const r of BRANCH_RELATIONS) {
            if (r.test(branch, e.branch)) hits.push({ kind: r.kind, slot: 'multi', text: `${subject}와 ${e.label} ${hanjaB(e.branch)}(${e.branch}) → ${KIND_LABEL[r.kind]}` });
        }
    }

    const natalBranches = new Set(slots.map(s => s.branch));
    for (const t of TRIADS) {
        if (!t.members.includes(branch)) continue;
        const others = t.members.filter(m => m !== branch);
        const present = others.filter(m => natalBranches.has(m));
        if (present.length === 2) {
            hits.push({ kind: '삼합', slot: 'multi', text: `${subject}가 원국의 ${others.map(o => `${hanjaB(o)}(${o})`).join('·')}와 만나 ${t.el} 삼합 완성 → 해당 오행의 힘이 크게 결집` });
        } else if (present.length === 1) {
            const mid = t.members[1];
            if (branch === mid || present[0] === mid) {
                hits.push({ kind: '반합', slot: 'multi', text: `${subject}가 원국 ${hanjaB(present[0]!)}(${present[0]})와 ${t.el} 반합 → 해당 오행이 부분적으로 힘을 얻음` });
            }
        }
    }
    for (const d of DIRECTIONALS) {
        if (!d.members.includes(branch)) continue;
        const others = d.members.filter(m => m !== branch);
        if (others.every(m => natalBranches.has(m))) {
            hits.push({ kind: '방합', slot: 'multi', text: `${subject}가 원국의 ${others.map(o => `${hanjaB(o)}(${o})`).join('·')}와 만나 ${d.el} 방합 완성 → 해당 오행이 매우 강해짐(쏠림 주의)` });
        }
    }
    return hits;
}

export function stemRelations(slots: NatalSlot[], stem: string, prefix: string, extraStems: { label: string; stem: string }[] = []): RelationHit[] {
    const hits: RelationHit[] = [];
    const subject = `${prefix} ${hanjaS(stem)}(${stem})`;
    for (const s of slots) {
        if (!s.stem || s.stem === '?') continue;
        for (const r of STEM_RELATIONS) {
            if (r.test(stem, s.stem)) hits.push({ kind: r.kind, slot: s.label, text: `${subject}와 ${s.label}간 ${hanjaS(s.stem)}(${s.stem}) → ${KIND_LABEL[r.kind]}` });
        }
    }
    for (const e of extraStems) {
        for (const r of STEM_RELATIONS) {
            if (r.test(stem, e.stem)) hits.push({ kind: r.kind, slot: 'multi', text: `${subject}와 ${e.label} ${hanjaS(e.stem)}(${e.stem}) → ${KIND_LABEL[r.kind]}` });
        }
    }
    return hits;
}

/** 천을귀인: 일간 → 귀인 지지 */
const CHEONEUL: Record<string, string[]> = {
    '갑': ['축', '미'], '무': ['축', '미'], '경': ['축', '미'],
    '을': ['자', '신'], '기': ['자', '신'],
    '병': ['해', '유'], '정': ['해', '유'],
    '임': ['사', '묘'], '계': ['사', '묘'],
    '신': ['인', '오'],
};
export const isCheoneul = (dayStem: string, branch: string) => (CHEONEUL[dayStem] ?? []).includes(branch);

/** 공망 지지가 한글/한자 어느 쪽이든 매칭 */
export function isVoidBranch(voids: string[], branch: string): boolean {
    const hanja = BRANCH_INFO[branch]?.hanja;
    return voids.some(v => v === branch || (hanja !== undefined && v === hanja));
}

export const hanjaOfBranch = hanjaB;
export const hanjaOfStem = hanjaS;
