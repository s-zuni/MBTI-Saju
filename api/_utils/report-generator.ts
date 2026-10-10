import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { getPreciseSajuData, buildRichSajuContext, parseBirthInfo } from './saju';
import { getAIProvider, isRetryableAIError } from './ai-provider';
import { BASE_SYSTEM_PROMPT } from './prompts';
import { cleanAndParseJSON } from './json';
import { getRoadmapYears, getRoadmapTitle, getPastYears, getCurrentYear, getCurrentTermIndex, type RoadmapYear } from './report-years';
import {
    buildYearFortuneContext, buildYearsFortuneContext, buildPastContext, buildLuckSummary, buildStrengthContext, pickPartialMonths,
} from './report-fortune';
import { buildFortuneCtx, computeYearFortune, computeRemainingScores, sumScores, EL_KO, type FortuneCtx, type YearFortune } from './report-score';
import { buildMbtiCrossContext } from './report-mbti';
import { addSajuFacts, addYearFacts, createAllowedFacts, findFactErrors, type AllowedFacts } from './report-verify';

/**
 * 3개년 심층 리포트 생성기 (스토리형, A4 약 20장 분량)
 *
 * 설계 원칙
 * - 사주 원국·대운·세운·월운·합충·용신·분야별 점수·월별 점수는 모두 코드가 계산한다(report-score/relations/terms).
 *   AI 는 이 사실을 '해석하고 이야기로 엮는' 역할만 한다. 같은 입력이면 점수는 항상 같다.
 * - 먼저 '스토리 아크'(3년을 관통하는 주제·은유·연도별 역할)를 한 번 정한 뒤, 모든 항목에 주입해
 *   병렬 생성돼도 하나의 이야기로 읽히게 한다.
 * - 항목 본문은 소제목당 360~600자로 압축해 전체를 A4 20장 내외로 맞춘다(렌더 검증: 본문 평균 약 500자 기준 20~21쪽).
 * - 본문에 등장한 간지·연도가 주입된 데이터에 없으면(환각) 오류 목록과 함께 해당 항목만 재생성한다.
 * - 본문(content)은 JSON 이 아닌 일반 텍스트로 받아 파싱 실패 가능성을 없앤다.
 */

export interface DeepReportInput {
    name?: string;
    mbti?: string;
    birthInfo: string;          // "YYYY-MM-DD HH:MM" 또는 "YYYY-MM-DD 사시 (09:30 ~ 11:30)" 등
    gender?: string;
    reportType?: string;        // 'MBTI 사주 심층 리포트' | '사주 전용 심층 리포트'
    specialRequest?: string;
    partnerInfo?: { name?: string; birth_info?: string; mbti?: string; relationship?: string } | null;
}

/**
 * 심층 리포트 1차 모델. 기본은 gpt-4o-mini(분당 토큰 한도가 넉넉해 항목별 병렬 호출에 적합).
 * 상위 모델(gpt-4.1 등)은 계정 TPM 한도에 따라 병렬 호출이 429 로 막힐 수 있으므로 REPORT_OPENAI_MODEL 로만 교체한다.
 */
const REPORT_OPENAI_MODEL = process.env.REPORT_OPENAI_MODEL || 'gpt-4o-mini';

function getReportModel(attempt: number) {
    if (attempt === 0 && process.env.OPENAI_API_KEY) {
        return createOpenAI({ apiKey: process.env.OPENAI_API_KEY })(REPORT_OPENAI_MODEL);
    }
    return getAIProvider(attempt).model;
}

const TOTAL_BUDGET_MS = 55_000;
const FIRST_ATTEMPT_MS = 30_000;
const ARC_TIMEOUT_MS = 14_000;
const MAX_OUTPUT_TOKENS_JSON = 1200;
const MAX_OUTPUT_TOKENS_TEXT = 1800;
const MIN_CONTENT_CHARS = 330;
// 모델 호출 순서: 1·2차는 기본 모델(분량 보강/사실 정정 재요청 포함), 이후 폴백 공급자
const ATTEMPT_PROVIDER_SEQ = [0, 0, 1, 2];

// ─────────────────────────────────────────────────────────────
// 공통 시스템 프롬프트
// ─────────────────────────────────────────────────────────────
const buildSystemPrompt = (includeMbti: boolean) => `${BASE_SYSTEM_PROMPT}

당신은 명리학에 정통한 사주 스토리텔러이자 전략 컨설턴트입니다. 20~30대 고객이 "내 인생의 다음 3년을 어떻게 쓸지" 결정하도록 돕는 프리미엄 리포트를 씁니다.
리포트는 막연한 점술이 아니라 '근거 → 해석 → 행동 지침' 구조이되, 처음부터 끝까지 한 편의 이야기처럼 읽혀야 합니다.

[사실 데이터 규칙 — 가장 중요]
- 사주 원국, 일간 강약·용신, 대운, 세운, 월운, 합·충·형·파·해·삼합·방합 관계, 분야별 점수는 프롬프트에 주어진 [결정론적 데이터]가 100% 사실입니다. 직접 계산하거나 다른 간지·연도·점수를 만들어 내지 마십시오.
- 주어진 데이터에 없는 간지·충합 관계를 지어내지 마십시오. 데이터에 '해당 없음'이면 '큰 충돌 없이 평탄하다'고 쓰십시오.
- 점수가 낮은 분야·달은 '조심할 점 + 대비법'으로, 높은 분야·달은 '기회 + 잡는 법'으로 서술하되 점수 숫자를 바꿔 말하지 마십시오.
- 시기를 말할 때는 제공된 월운(절기월)의 간지·십성·점수·충합 표시를 근거로 '양력 ○월경'처럼 쓰십시오.

[스토리 규칙]
- 프롬프트에 [3년 스토리 아크]가 있으면 그 관통 주제·반복 은유·연도별 역할을 그대로 이어받아, 앞 장과 뒷 장이 자연스럽게 연결되게 쓰십시오.
- 같은 항목 안에서도, 다른 항목과도 같은 말을 반복하지 마십시오. 한 번 한 이야기는 다시 풀어 쓰지 말고 '앞에서 본 ○○'처럼 짧게 연결만 하십시오.

[문체 규칙]
1. 정중하고 친근한 전문가의 존댓말('~합니다', '~해 보세요')로 씁니다. 겁을 주거나 단정적인 흉운 선고는 금지합니다. 조심할 점은 반드시 '왜 → 어떻게 대비하나'를 함께 씁니다.
2. 사주 용어(십성·오행·간지·12운성 등)는 처음 나올 때 한자를 올바르게 병기하고(예: 정재(正財), 화(火), 병오(丙午)), 곧바로 일상 언어로 풀이합니다. 한글 음을 괄호에 반복하는 표기(정재(정재))는 금지합니다. 한자 간지는 데이터에 주어진 것만 사용합니다.
3. 영어 단어는 쓰지 않습니다(MBTI 유형 표기는 예외). 쉬운 한국어로 풀어 씁니다.
4. 모든 해석은 이 고객 사주의 구체적 글자·십성·운에 근거해야 합니다. 누구에게나 해당되는 일반론은 금지합니다.
5. 재물·투자·건강 조언은 '참고용 방향'으로 서술하고, 특정 종목·치료를 단정하지 않습니다.
${includeMbti
    ? '6. MBTI는 사주 해석과 반드시 연결해 서술합니다. 주어진 [사주×MBTI 교차 단서]의 일치/상반 판정만 근거로 삼고, 별개로 따로 쓰지 마십시오.'
    : '6. 이 리포트는 사주 전용입니다. MBTI는 언급하지 마십시오.'}`;

// 본문(소제목 1개) 작성 서식 — PDF 가독성을 위해 고정
const bodyFormat = (min: number, max: number) => `[본문 서식 — 반드시 지킬 것]
- 첫 줄: "💡 " 로 시작하는 핵심 결론 1문장.
- 이어서 "• " 로 시작하는 불릿 3~4개. 불릿 하나는 2문장이며, 각 불릿의 핵심어는 **굵게** 표시합니다.
- 모든 불릿에는 주어진 데이터(원국 글자·십성·12운성·오행 비율·세운/월운·합충 표시·점수) 중 최소 하나를 정확히 인용하십시오. 데이터에 없는 충·합을 만들어 내지 마십시오.
- 불릿과 불릿 사이는 반드시 빈 줄 하나로 구분합니다. 한 단락을 길게 이어 쓰지 마십시오.
- 마지막 줄: "[중요] " 로 시작하는 실천 팁 1문장.
- 전체 분량은 공백 포함 ${min}~${max}자입니다. 이보다 짧으면 안 됩니다. 반복·군더더기 없이 밀도 있게 쓰십시오.
- 소제목·머리말·JSON·마크다운 제목(#)은 쓰지 말고 본문만 출력하십시오.`;

// ─────────────────────────────────────────────────────────────
// 작업(Task) 정의
// ─────────────────────────────────────────────────────────────
type Task =
    | { kind: 'text'; key: string; prompt: string; context?: string; onlyYears?: number[] }
    | { kind: 'json'; key: string; prompt: string; context?: string; validate: (j: any) => boolean };

interface DetailItem { subtitle: string; guide: string }

interface Group {
    key: string;
    title: string;
    items: DetailItem[];
    /** 소제목별 본문 작성 시 함께 주입할 컨텍스트 */
    context?: string;
    /** 섹션 공통 지시 */
    note?: string;
    /** 본문에서 언급해도 되는 연도(사실 검증용). 지정하지 않으면 리포트 전체 허용 연도 */
    onlyYears?: number[];
    /** 본문 분량(공백 포함). 기본 460~600자 */
    chars?: [number, number];
}

const textTasks = (g: Group): Task[] =>
    g.items.map((it, i) => ({
        kind: 'text' as const,
        key: `${g.key}#${i}`,
        ...(g.context ? { context: g.context } : {}),
        ...(g.onlyYears ? { onlyYears: g.onlyYears } : {}),
        prompt: `[작성할 항목]
섹션: "${g.title}"
소제목: "${it.subtitle}"
작성 가이드: ${it.guide}
${g.note ? `섹션 공통 지시: ${g.note}\n` : ''}${g.items.length > 1 ? `같은 섹션의 다른 소제목(내용이 겹치지 않게 이 항목에만 집중): ${g.items.filter((_, j) => j !== i).map(x => `"${x.subtitle}"`).join(', ')}\n` : ''}
${bodyFormat(...(g.chars ?? [460, 600]))}`,
    }));

interface BuildCtx {
    years: RoadmapYear[];
    includeMbti: boolean;
    hasRequest: boolean;
    partnerOverlapText: string;
    hasPartner: boolean;
    yearsFortune: string;
    pastFortune: string;
    mbtiCross: string;
    /** 지나온 길에서 언급 가능한 연도 */
    pastYearsAllowed: number[];
}

function buildGroups(ctx: BuildCtx): Group[] {
    const { years, includeMbti, hasRequest, hasPartner } = ctx;
    const range = `${years[0]!.year}~${years[years.length - 1]!.year}`;

    return [
        {
            key: 'natalChartAnalysis',
            title: '01. 프롤로그 — 나라는 사람의 뼈대',
            chars: [440, 580],
            note: '이 리포트의 첫 장입니다. 독자가 "이 사람이 나를 제대로 봤구나"라고 느끼도록 가장 인상적인 특징부터 시작하고, 일간 강약·용신 판정(코드 계산값)을 그대로 사용하십시오.',
            items: [
                { subtitle: '사주의 뼈대와 일간(日干)의 본질', guide: '년·월·일·시 글자가 만드는 구조, 일간의 성향, 일간 강약·용신 판정이 의미하는 삶의 방식, 12운성·신살이 보여주는 잠재력과 약점' },
                { subtitle: '오행 균형과 생활 속 개운 처방', guide: '과다/결핍 오행 진단과, 보완을 위한 색상·방위·음식·습관 처방(용신 오행 중심)' },
            ],
        },
        {
            key: 'pastCheck',
            title: '02. 지나온 길 — 이미 일어난 이야기',
            context: ctx.pastFortune,
            onlyYears: ctx.pastYearsAllowed,
            chars: [460, 600],
            note: '위 [이미 지나간 해] 3개 연도만 다루고, 올해나 다른 해는 언급하지 마십시오. 지난 3년을 연도순으로 짚으며 "혹시 이런 일이 있지 않으셨나요?" 형태의 확인 질문을 곳곳에 넣으십시오. 사실을 단정하지 말고 "~했을 가능성이 큽니다"로 서술하며, 제공된 십성·합충·변화 시기 후보(양력 ○월경)만 근거로 삼으십시오. 마지막에는 지난 3년의 경험이 앞으로 3년의 복선이 된다는 연결 문장을 넣으십시오.',
            items: [
                { subtitle: '지난 3년, 이런 일이 있지 않았나요?', guide: '연도별로 일·돈·관계·마음에서 일어났을 법한 변화를 짚고, 그 경험이 어떻게 지금의 나를 만들었는지 서술' },
            ],
        },
        {
            key: 'specialRequestAnalysis',
            title: '03. 지금의 고민, 마스터의 답',
            context: ctx.yearsFortune,
            chars: [460, 600],
            note: `${hasRequest
                ? '고객의 요청사항을 사주 원국(일간 강약·용신·기신)과 대운·세운 흐름에 직접 연결해 답하십시오. 고객 요청을 한 번 인용하며 시작하십시오.'
                : '고객이 별도 요청을 남기지 않았습니다. 사주상 가장 취약한 오행·십성을 진단해 이 고객이 지금 가장 신경 써야 할 고민 주제를 스스로 정하고 답하십시오.'}${hasPartner ? ` [상대방 정보]가 있으므로 두 사람의 일간 관계, 오행 조화, 합·충과 아래 [두 사람의 3년 겹침]을 근거로 관계 조언을 포함하십시오.\n${ctx.partnerOverlapText}` : ''}`,
            items: [
                { subtitle: '고민의 본질과 사주 속 원인', guide: '왜 이 고민이 생겼는지 원국 구조(일간 강약, 용신/기신)와 현재 대운으로 진단' },
                { subtitle: '맞춤 조언과 해결 타임라인', guide: `${years.map(y => y.year + '년').join(' → ')} 순으로 고민이 풀리는 시기와 전환점, 조심할 달(양력 ○월경)을 제시하고 지금 선택할 행동을 구체적으로 제안` },
            ],
        },
        {
            key: 'coreIdentity',
            title: '04. 내면의 지도',
            ...(includeMbti && ctx.mbtiCross ? { context: ctx.mbtiCross } : {}),
            chars: [460, 600],
            items: [
                { subtitle: includeMbti ? '사주×MBTI: 타고난 결과 드러나는 결' : '타고난 기질과 숨은 리스크', guide: includeMbti
                    ? '강점·무의식의 욕망·스트레스 상황의 방어 패턴을 서술. 교차 단서의 일치 축은 강점 확증으로, 상반 축은 겉과 속의 차이·성장 과제로 풀이'
                    : '독보적 강점, 속마음의 욕구와 방어 패턴, 본성 깊은 곳의 약점이 현실에서 문제가 되는 장면과 극복법' },
            ],
        },
        {
            key: 'wealthAndCareer',
            title: '05. 일과 돈의 그릇',
            chars: [460, 600],
            note: '직업명·분야는 구체적으로 나열하십시오(예: 교육직(교사, 상담사), 마케팅, 개발 등).',
            items: [
                { subtitle: '맞는 일, 돈이 모이는 방식, 새는 구멍', guide: '식상·재성·관성 배치와 용신을 근거로 적합한 업종·직무·일하는 방식, 재물 축적 방식과 자산 배분 방향(참고용 예시 비율 포함), 돈·커리어가 새는 패턴과 예방법' },
            ],
        },
        {
            key: 'relationship',
            title: '06. 인연의 지도',
            chars: [460, 600],
            note: '귀인의 성향, 만나는 장소·시기, 어울리는 파트너의 일주·오행 특징을 구체적으로 제시하십시오.',
            items: [
                { subtitle: '귀인, 연애 패턴, 그리고 피해야 할 인연', guide: '귀인의 사주상 오행·성향과 만나기 쉬운 장소, 일지(배우자궁)를 근거로 한 연애 패턴과 어울리는 파트너, 악연의 특징과 소통법' },
            ],
        },
        {
            key: 'actionPlan',
            title: '09. 에필로그 — 운을 내 편으로 만드는 마스터플랜',
            context: ctx.yearsFortune,
            chars: [360, 480],
            note: `${range} 3년 전체를 아우르는 실천 가이드이며 새로운 해석보다 '행동'에 집중합니다. 스토리 아크의 마지막 장면처럼 앞의 이야기를 한 번 되짚으며 마무리하십시오.`,
            items: [
                { subtitle: '오늘부터 시작할 3가지 실천', guide: '내일부터 당장 할 수 있는 구체적 행동 과제 3개 (체크리스트처럼, 연도별 시기 포함)' },
                { subtitle: `${range} 운을 키우는 루틴과 마스터의 한마디`, guide: '3년 동안 유지할 습관, 오행 보완 루틴, 그리고 고객의 사주와 앞날에 대한 따뜻하고 확신 있는 격려로 마무리' },
            ],
        },
    ];
}

const YEAR_SUBTOPICS: DetailItem[] = [
    { subtitle: '이 해의 이야기와 큰 흐름', guide: '스토리 아크에서 이 해가 맡은 역할을 중심으로, 세운과 대운·원국의 상호작용과 이 해가 일간·용신에 미치는 영향을 서술. 제공된 십성·합충·점수 근거를 인용' },
    { subtitle: '일·돈·인연의 타이밍', guide: '재물·커리어·인연 점수와 월운 점수를 근거로 승부처·기회·위기, 귀인을 만나기 좋은 달을 월 단위(양력 ○월경)로 짚고 미혼/기혼별 연애·결혼운도 포함' },
    { subtitle: '몸과 마음, 개운 루틴', guide: '이 해의 오행 기운과 건강 점수에 따라 약해지기 쉬운 장기·컨디션과 구체적 실천 루틴(시간대·운동·식습관 포함)' },
];

const CURRENT_SUBTOPICS: DetailItem[] = [
    { subtitle: '남은 기간의 큰 흐름과 월별 포인트', guide: '올해 세운과 대운·원국의 상호작용을 짚고, 남은 절기월의 점수·십성·충합을 근거로 달별(양력 ○월경) 포인트와 조심할 시기를 제시. 이미 지난 달은 언급 금지' },
    { subtitle: '올해를 잘 마무리하고 새해를 준비하는 법', guide: '남은 기간에 정리·마무리할 것과 새해(스토리 아크의 첫 해)를 위해 미리 심어 둘 것을 구체적 행동으로 제시. 지나온 길 이야기와 앞으로 3년 이야기를 잇는 다리 역할' },
];

// ─────────────────────────────────────────────────────────────
// 스토리 아크
// ─────────────────────────────────────────────────────────────
interface StoryArc {
    thread: string;
    motif: string;
    pastHook: string;
    /** 올해 남은 기간의 역할 (서막) */
    current?: { role: string; title: string; oneLine: string };
    chapters: { year: number; role: string; title: string; oneLine: string }[];
}

const buildArcTask = (years: RoadmapYear[], current: RoadmapYear, context: string): Extract<Task, { kind: 'json' }> => {
    const range = `${years[0]!.year}~${years[years.length - 1]!.year}`;
    return {
        kind: 'json',
        key: 'arc',
        context,
        prompt: `이 고객의 지난 3년과 앞으로 ${range} 3년을 한 편의 이야기로 엮는 '스토리 아크'를 설계하십시오. 이후 모든 항목이 이 아크를 이어받아 쓰이므로 구체적이고 일관되어야 합니다. 오직 순수 JSON 하나만 출력하십시오(코드블록 금지).
- 연도별 역할(role)은 위 [결정론적 세운 데이터]의 점수·합충·십성과 모순되지 않아야 합니다(점수가 낮은 해는 '정비·내실·씨앗', 높은 해는 '도약·수확' 등 사주에 맞게).
- motif 는 3년 내내 반복할 하나의 은유(예: 겨울나무 → 새싹 → 열매)입니다.
{
  "thread": "3년을 관통하는 한 문장 서사 (60자 이내)",
  "motif": "반복 은유 (30자 이내)",
  "pastHook": "지난 3년을 돌아보는 한 줄 (50자 이내)",
  "current": { "role": "${current.year}년 남은 기간의 역할 한 단어(예: 정비, 서막)", "title": "남은 기간의 테마 카피 (20자 이내)", "oneLine": "한 문장 요약 (50자 이내)" },
  "chapters": [
${years.map(y => `    { "year": ${y.year}, "role": "이 해의 역할 한 단어(예: 준비, 도약, 수확)", "title": "이 해의 핵심 테마 카피 (20자 이내)", "oneLine": "이 해를 한 문장으로 요약 (50자 이내)" }`).join(',\n')}
  ]
}`,
        validate: j => typeof j?.thread === 'string' && typeof j?.motif === 'string' && Array.isArray(j?.chapters)
            && years.every(y => { const c = j.chapters.find((x: any) => Number(x?.year) === y.year); return c && typeof c.title === 'string' && typeof c.role === 'string'; }),
    };
};

function arcToContext(arc: StoryArc | null, years: RoadmapYear[], current: RoadmapYear): string {
    if (!arc) return '';
    const lines = years.map(y => {
        const c = arc.chapters.find(x => Number(x.year) === y.year);
        return c ? `  - ${y.year}년: 〈${c.role}〉 ${c.title} — ${c.oneLine}` : '';
    }).filter(Boolean);
    return `\n[3년 스토리 아크 — 모든 항목이 이 흐름과 은유를 이어받아 하나의 이야기로 읽히게 쓸 것]
  - 관통 주제: ${arc.thread}
  - 반복 은유: ${arc.motif}
  - 지난 3년 회고: ${arc.pastHook}${arc.current ? `\n  - ${current.year}년 남은 기간(서막): 〈${arc.current.role}〉 ${arc.current.title} — ${arc.current.oneLine}` : ''}
${lines.join('\n')}`;
}

function normalizeArc(raw: any, years: RoadmapYear[], yfs: YearFortune[]): StoryArc {
    const cur = raw?.current;
    const chapters = years.map(y => {
        const c = raw?.chapters?.find((x: any) => Number(x?.year) === y.year);
        const yf = yfs.find(f => f.year === y.year)!;
        return {
            year: y.year,
            role: String(c?.role ?? '').slice(0, 12),
            title: String(c?.title ?? `${y.year}년 ${y.ganji}`).slice(0, 40),
            oneLine: String(c?.oneLine ?? yf.reasons[0] ?? '').slice(0, 100),
        };
    });
    return {
        thread: String(raw?.thread ?? ''), motif: String(raw?.motif ?? ''), pastHook: String(raw?.pastHook ?? ''),
        ...(cur && typeof cur.title === 'string' ? { current: { role: String(cur.role ?? '').slice(0, 12), title: String(cur.title).slice(0, 40), oneLine: String(cur.oneLine ?? '').slice(0, 100) } } : {}),
        chapters,
    };
}

// ─────────────────────────────────────────────────────────────
// 호출 유틸
// ─────────────────────────────────────────────────────────────
const bulletCount = (t: string) => (t.match(/^\s*•/gm) || []).length;

function cleanBody(text: string): string {
    return text
        .replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '')
        .replace(/^\s*#{1,6}\s.*\n/, '')       // 모델이 붙인 제목 줄 제거
        .trim();
}

/** 끝내 사실 검증을 통과하지 못한 본문에서 검증 실패 간지의 한자 병기만 제거 */
function stripBadGanji(body: string, errors: string[]): string {
    let out = body;
    for (const e of errors) {
        const gj = e.match(/^([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])/)?.[1];
        if (gj) out = out.replace(new RegExp(`\\(${gj}\\)`, 'g'), '');
    }
    return out;
}

async function runTask(task: Task, system: string, baseQuery: string, startedAt: number, facts: AllowedFacts): Promise<any> {
    const basePrompt = `${baseQuery}${task.context ? `\n\n${task.context}` : ''}\n\n${task.prompt}`;
    let prompt = basePrompt;
    let lastError: unknown = new Error('no attempt');
    let fallback: { body: string; errors: string[] } | null = null;

    for (let attempt = 0; attempt < ATTEMPT_PROVIDER_SEQ.length; attempt++) {
        const remaining = TOTAL_BUDGET_MS - (Date.now() - startedAt);
        if (remaining < 6_000) break;
        const timeout = attempt === 0 ? Math.min(FIRST_ATTEMPT_MS, remaining - 1_000) : remaining - 1_000;
        const providerIdx = ATTEMPT_PROVIDER_SEQ[attempt]!;
        try {
            const model = getReportModel(providerIdx);
            const { text } = await generateText({
                model,
                system,
                prompt,
                maxRetries: 0,
                maxOutputTokens: task.kind === 'text' ? MAX_OUTPUT_TOKENS_TEXT : MAX_OUTPUT_TOKENS_JSON,
                abortSignal: AbortSignal.timeout(timeout),
            });

            if (task.kind === 'json') {
                const json = cleanAndParseJSON(text);
                if (task.validate(json)) return json;
                lastError = new Error('JSON validation failed');
                continue;
            }

            const body = cleanBody(text);
            if (body.length < MIN_CONTENT_CHARS || bulletCount(body) < 2) {
                console.warn(`[deep-report] ${task.key} attempt ${attempt}: too short (${body.length} chars, ${bulletCount(body)} bullets)`);
                lastError = new Error(`too short (${body.length} chars)`);
                prompt = `${basePrompt}\n\n[재작성 요청] 직전 답변은 ${body.length}자로 분량이 부족했습니다. 불릿을 4개로 늘리고 각 불릿을 2~3문장(구체적 근거·사례·행동 포함)으로 써서 공백 포함 500자 안팎으로 다시 작성하십시오. 서식 규칙은 동일합니다.`;
                continue;
            }

            const errors = findFactErrors(body, task.onlyYears ? { ganji: facts.ganji, years: new Set(task.onlyYears) } : facts);
            if (errors.length) {
                console.warn(`[deep-report] ${task.key} attempt ${attempt}: fact check failed: ${errors.join('; ')}`);
                lastError = new Error(`fact check failed: ${errors.join('; ')}`);
                fallback = { body, errors };
                prompt = `${basePrompt}\n\n[정정 요청] 직전 답변에는 제공된 데이터에 없는 내용이 있었습니다: ${errors.join(' / ')}. 해당 간지·연도를 쓰지 말고 주어진 [결정론적 데이터]에 있는 것만 인용해 처음부터 다시 작성하십시오. 서식 규칙은 동일합니다.`;
                continue;
            }
            return body;
        } catch (e) {
            lastError = e;
            console.warn(`[deep-report] ${task.key} attempt ${attempt} error:`, String((e as any)?.message).slice(0, 160));
            const name = (e as any)?.name;
            const recoverable = name === 'TimeoutError' || name === 'AbortError' || isRetryableAIError(e) || e instanceof SyntaxError || String((e as any)?.message).includes('JSON');
            if (!recoverable) break;
        }
    }
    // 사실 검증만 못 넘긴 본문은 문제 간지 병기를 걷어내고 사용(전체 리포트 실패보다 낫다)
    if (fallback) return stripBadGanji(fallback.body, fallback.errors);
    throw new Error(`[${task.key}] 생성 실패: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

// ─────────────────────────────────────────────────────────────
// 보조 계산
// ─────────────────────────────────────────────────────────────
const MONTH_LABEL = (m: number) => `${m}월`;

function buildCalendar(yfs: YearFortune[]) {
    return yfs.map(yf => ({
        year: yf.year,
        months: yf.months.map(m => ({
            label: m.index === 12 ? `${m.calMonth}월` : MONTH_LABEL(m.calMonth),
            nextYear: m.index === 12,
            score: m.score,
            start: m.termStart,
        })),
    }));
}

type OverlapLabel = '함께 좋은 해' | '함께 조심할 해' | '엇갈리는 해';
function buildPartnerOverlap(mine: YearFortune[], theirs: YearFortune[]) {
    return mine.map((m, i) => {
        const a = sumScores(m.scores);
        const b = sumScores(theirs[i]!.scores);
        const label: OverlapLabel = a >= 13 && b >= 13 ? '함께 좋은 해' : a <= 11 && b <= 11 ? '함께 조심할 해' : '엇갈리는 해';
        return { year: m.year, mine: a, partner: b, label };
    });
}

function overlapText(rows: ReturnType<typeof buildPartnerOverlap>): string {
    if (!rows.length) return '';
    return `[두 사람의 3년 겹침 — 코드 계산값(분야 점수 합 4~20)]\n${rows.map(r => `  - ${r.year}년: 나 ${r.mine} / 상대 ${r.partner} → ${r.label}`).join('\n')}`;
}

const sumOf = (s: YearFortune['scores']) => sumScores(s);

// ─────────────────────────────────────────────────────────────
// 메인
// ─────────────────────────────────────────────────────────────
export async function generateDeepReport(input: DeepReportInput, now: Date = new Date()): Promise<Record<string, any>> {
    const startedAt = Date.now();
    const { birthDate, birthTime } = parseBirthInfo(input.birthInfo);
    const birthYear = Number(birthDate.replace(/[-./]/g, '').substring(0, 4)) || 1990;

    const saju = getPreciseSajuData({ birthDate, ...(birthTime ? { birthTime } : {}), ...(input.gender ? { gender: input.gender } : {}) });
    const ctx: FortuneCtx = buildFortuneCtx(saju, birthYear, input.gender);
    const years = getRoadmapYears(now);
    const pastYears = getPastYears(now);
    const currentYear = getCurrentYear(now);
    const currentTermIdx = getCurrentTermIndex(now);
    const includeMbti = (input.reportType || '').includes('MBTI') && !!input.mbti;

    // ── 결정론적 계산 ──
    const yfs = years.map(y => computeYearFortune(ctx, y.year));
    const pastFs = pastYears.map(y => computeYearFortune(ctx, y.year));
    const currentF = computeYearFortune(ctx, currentYear.year);
    const currentContext = buildYearFortuneContext(ctx, currentF, currentTermIdx);
    const yearsFortune = buildYearsFortuneContext(ctx, yfs);
    const pastFortune = buildPastContext(ctx, pastFs);
    const mbtiCross = includeMbti ? buildMbtiCrossContext(saju, input.mbti!) : '';

    const facts = createAllowedFacts();
    addSajuFacts(facts, saju, birthYear);
    [...years, ...pastYears, currentYear].forEach(y => addYearFacts(facts, y.year));
    facts.years.add(now.getFullYear());

    const partner = input.partnerInfo && input.partnerInfo.name ? input.partnerInfo : null;
    let partnerOverlap: ReturnType<typeof buildPartnerOverlap> = [];
    if (partner?.birth_info) {
        try {
            const pb = parseBirthInfo(partner.birth_info);
            const pYear = Number(pb.birthDate.replace(/[-./]/g, '').substring(0, 4)) || 0;
            const pSaju = getPreciseSajuData({ birthDate: pb.birthDate, ...(pb.birthTime ? { birthTime: pb.birthTime } : {}) });
            const pCtx = buildFortuneCtx(pSaju, pYear);
            partnerOverlap = buildPartnerOverlap(yfs, years.map(y => computeYearFortune(pCtx, y.year)));
            addSajuFacts(facts, pSaju, pYear);
        } catch (e) {
            console.warn('[deep-report] partner overlap failed:', String((e as any)?.message).slice(0, 120));
        }
    }

    const partnerText = partner
        ? `\n[상대방 정보]\n이름: ${partner.name}, 생년월일시: ${partner.birth_info}, MBTI: ${partner.mbti || '모름'}, 관계: ${partner.relationship}`
        : '';

    const baseQuery0 = `[분석 대상자 정보]
이름: ${input.name || '내담자'}${includeMbti ? `, MBTI: ${input.mbti}` : ''}, 생년월일시: ${input.birthInfo}${input.gender ? `, 성별: ${input.gender}` : ''}
고객 요청사항: ${(input.specialRequest || '').trim() || '없음'}${partnerText}
분석 기간: 올해(${now.getFullYear()}년)를 제외한 ${years.map(y => `${y.year}년 ${y.ganji}`).join(', ')}

${buildRichSajuContext(saju)}
${buildStrengthContext(ctx)}
★ ${buildLuckSummary(saju, birthYear, now.getFullYear())}`;

    const system = buildSystemPrompt(includeMbti);

    // ── Phase 1: 스토리 아크 (실패해도 리포트는 계속) ──
    let arc: StoryArc | null = null;
    try {
        const arcTask = buildArcTask(years, currentYear, `${currentContext}

${yearsFortune}\n\n${pastFortune}${mbtiCross ? `\n\n${mbtiCross}` : ''}`);
        const model = getReportModel(0);
        const { text } = await generateText({
            model, system,
            prompt: `${baseQuery0}\n\n${arcTask.context}\n\n${arcTask.prompt}`,
            maxRetries: 0, maxOutputTokens: MAX_OUTPUT_TOKENS_JSON,
            abortSignal: AbortSignal.timeout(ARC_TIMEOUT_MS),
        });
        const json = cleanAndParseJSON(text);
        if (arcTask.validate(json)) arc = normalizeArc(json, years, yfs);
        else console.warn('[deep-report] arc validation failed — continuing without arc');
    } catch (e) {
        console.warn('[deep-report] arc failed — continuing without arc:', String((e as any)?.message).slice(0, 120));
    }
    const baseQuery = `${baseQuery0}${arcToContext(arc, years, currentYear)}`;

    // ── Phase 2: 본문 병렬 생성 ──
    const range = `${years[0]!.year}~${years[years.length - 1]!.year}`;
    const tasks: Task[] = [];
    tasks.push({
        kind: 'json',
        key: 'cover',
        prompt: `표지 문구와 '한 장 요약'용 핵심 문구를 작성하십시오. 오직 순수 JSON 하나만 출력하십시오(코드블록 금지).
{
  "cover": {
    "mainTitle": "고객의 사주와 앞으로의 3년을 한 줄로 은유한 제목 (12자 이내, 스토리 아크의 은유 활용, 예: '겨울나무, 봄날을 맞이하다')",
    "subTitle": "고객의 핵심 운명과 ${range} 흐름을 요약한 한 줄 카피 (40자 이내)"
  },
  "summary": {
    "keywords": ["고객 사주를 상징하는 핵심 키워드 4개 (각 2~8자)"],
    "verdict": "이 고객의 사주와 ${range} 3년을 관통하는 총평 3문장 (공백 포함 200~280자)",
    "concernAnswer": "고객 요청사항(없으면 이 사주의 가장 큰 숙제)에 대한 한 줄 답 (60자 이내)",
    "topActions": ["지금 당장 시작할 구체적 행동 3가지 (각 40자 이내)"]
  }
}`,
        validate: j => !!j?.cover?.mainTitle && Array.isArray(j?.summary?.keywords) && j.summary.keywords.length >= 3 && typeof j?.summary?.verdict === 'string' && Array.isArray(j?.summary?.topActions) && j.summary.topActions.length >= 3,
    });

    const groups = buildGroups({
        years, includeMbti, hasRequest: !!(input.specialRequest || '').trim(), hasPartner: !!partner,
        partnerOverlapText: overlapText(partnerOverlap), yearsFortune, pastFortune, mbtiCross, pastYearsAllowed: [...pastYears.map(y => y.year), birthYear, ...(saju.luckPillars?.pillars ?? []).map(lp => birthYear + lp.age - 1)],
    });
    groups.forEach(g => tasks.push(...textTasks(g)));

    textTasks({
        key: 'currentYear',
        title: `${currentYear.year}년 ${currentYear.ganji}년 남은 기간`,
        context: currentContext,
        chars: [360, 480],
        note: `${currentYear.year}년의 남은 기간에만 집중하고, 위 데이터의 남은 절기월만 근거로 하십시오. 스토리 아크의 서막으로서 앞으로 3년 이야기로 이어지게 쓰십시오.`,
        items: CURRENT_SUBTOPICS,
    }).forEach(t => tasks.push(t));

    for (const [i, ry] of years.entries()) {
        textTasks({
            key: `year${ry.year}`,
            title: `${ry.year}년 ${ry.ganji}년 이야기`,
            context: buildYearFortuneContext(ctx, yfs[i]!),
            chars: [420, 540],
            note: `${ry.year}년 한 해에만 집중하고, 위 [${ry.year}년 결정론적 세운 데이터]를 근거로 하십시오.`,
            items: YEAR_SUBTOPICS,
        }).forEach(t => tasks.push(t));
    }

    const entries = await Promise.all(tasks.map(async t => [t.key, await runTask(t, system, baseQuery, startedAt, facts)] as const));
    const r = Object.fromEntries(entries) as Record<string, any>;

    const section = (key: string) => {
        const g = groups.find(x => x.key === key)!;
        return {
            title: g.title,
            details: g.items.map((it, i) => ({ subtitle: it.subtitle, content: r[`${g.key}#${i}`] as string })),
        };
    };

    const yearDetails = years.map((ry, i) => {
        const yf = yfs[i]!;
        const ch = arc?.chapters.find(c => c.year === ry.year);
        return {
            year: ry.year,
            ganji: ry.ganji,
            yearlyTheme: ch?.title || `${ry.year}년 ${ry.ganji}`,
            oneLine: ch?.oneLine || yf.reasons[0] || '',
            role: ch?.role || '',
            scores: yf.scores,
            bestMonths: yf.bestMonths,
            cautionMonths: yf.cautionMonths,
            subtopics: YEAR_SUBTOPICS.map((it, j) => ({ subtitle: it.subtitle, content: r[`year${ry.year}#${j}`] as string })),
        };
    });

    const remainingMonths = currentF.months.filter(m => m.index >= currentTermIdx);
    const curPick = pickPartialMonths(currentF, currentTermIdx);
    const curChapter = arc?.current;
    const currentYearDetail = {
        year: currentYear.year,
        ganji: currentYear.ganji,
        yearlyTheme: curChapter?.title || `${currentYear.year}년 남은 기간`,
        oneLine: curChapter?.oneLine || currentF.reasons[0] || '',
        role: curChapter?.role || '',
        scores: computeRemainingScores(currentF, currentTermIdx),
        bestMonths: curPick.best,
        cautionMonths: curPick.caution,
        remainingFrom: remainingMonths[0]?.termStart ?? '',
        remainingMonths: remainingMonths.map(m => ({ label: `${m.calMonth}월`, nextYear: m.index === 12, score: m.score, start: m.termStart })),
        subtopics: CURRENT_SUBTOPICS.map((it, j) => ({ subtitle: it.subtitle, content: r[`currentYear#${j}`] as string })),
    };

    const ranked = [...yearDetails].sort((x, y) => sumOf(y.scores) - sumOf(x.scores) || x.year - y.year);
    const best = ranked[0]!;
    const caution = ranked[ranked.length - 1]!;
    const names = (els: string[]) => els.map(e => EL_KO[e as keyof typeof EL_KO] ?? e);

    return {
        schemaVersion: 3,
        cover: r.cover.cover,
        summary: {
            ...r.cover.summary,
            yearOverview: yearDetails.map(({ year, ganji, yearlyTheme, oneLine, role, scores, bestMonths, cautionMonths }) => ({ year, ganji, yearlyTheme, oneLine, role, scores, bestMonths, cautionMonths })),
            bestYear: best.year,
            cautionYear: sumOf(best.scores) === sumOf(caution.scores) ? null : caution.year,
        },
        storyArc: arc,
        strength: {
            label: ctx.strength.label,
            supportRatio: Math.round(ctx.strength.supportRatio * 100),
            yongshin: names(ctx.strength.yongshin),
            gisin: names(ctx.strength.gisin),
        },
        natalChartAnalysis: section('natalChartAnalysis'),
        pastCheck: section('pastCheck'),
        specialRequestAnalysis: section('specialRequestAnalysis'),
        coreIdentity: section('coreIdentity'),
        wealthAndCareer: section('wealthAndCareer'),
        relationship: section('relationship'),
        threeYearRoadmap: { title: getRoadmapTitle(years), details: yearDetails },
        currentYear: currentYearDetail,
        calendar: [{ year: currentYear.year, partial: true, months: currentYearDetail.remainingMonths }, ...buildCalendar(yfs)],
        ...(partnerOverlap.length ? { partnerOverlap, partnerName: partner?.name } : {}),
        actionPlan: section('actionPlan'),
        userSaju: saju,
        generationMs: Date.now() - startedAt,
    };
}
