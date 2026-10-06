import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { getPreciseSajuData, buildRichSajuContext, parseBirthInfo } from './saju';
import { getAIProvider, isRetryableAIError } from './ai-provider';
import { BASE_SYSTEM_PROMPT } from './prompts';
import { cleanAndParseJSON } from './json';
import { getRoadmapYears, getRoadmapTitle, type RoadmapYear } from './report-years';
import { buildYearFortuneContext, buildYearsFortuneContext, buildLuckSummary } from './report-fortune';

/**
 * 3개년 심층 리포트 생성기 (항목별 병렬 생성)
 *
 * - 한 번에 20,000자를 요구하던 단일 호출은 출력 토큰 한도(16K)와 함수 제한시간(60초)을 넘겨
 *   JSON 이 잘리거나 시간 초과가 났다. 소제목 단위로 쪼개 병렬 호출하고, 실패한 항목만 재시도한다.
 * - 본문(content)은 JSON 이 아닌 일반 텍스트로 받아 파싱 실패 가능성을 없앤다.
 * - 원국/세운/월운/대운은 코드가 계산한 값을 주입해 AI 가 간지를 추정하지 않게 한다.
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
const MAX_OUTPUT_TOKENS_JSON = 1200;
const MAX_OUTPUT_TOKENS_TEXT = 2000;
const MIN_CONTENT_CHARS = 420;
// 모델 호출 순서: 1·2차는 기본 모델(분량 보강 재요청 포함), 이후 폴백 공급자
const ATTEMPT_PROVIDER_SEQ = [0, 0, 1, 2];

// ─────────────────────────────────────────────────────────────
// 공통 시스템 프롬프트
// ─────────────────────────────────────────────────────────────
const buildSystemPrompt = (includeMbti: boolean) => `${BASE_SYSTEM_PROMPT}

당신은 명리학에 정통한 사주 전략 컨설턴트입니다. 20~30대 고객이 "내 인생의 다음 3년을 어떻게 쓸지" 결정하도록 돕는 프리미엄 리포트를 씁니다.
리포트는 막연한 점술이 아니라 '근거 → 해석 → 행동 지침' 구조의 실용 가이드여야 합니다.

[사실 데이터 규칙 — 가장 중요]
- 사주 원국, 대운, 세운, 월운, 합·충·형·파·해 관계는 프롬프트에 주어진 [결정론적 데이터]가 100% 사실입니다. 직접 계산하거나 다른 간지를 만들어 내지 마십시오.
- 주어진 데이터에 없는 간지·충합 관계를 지어내지 마십시오. 데이터에 '해당 없음'이면 '큰 충돌 없이 평탄하다'고 쓰십시오.
- 시기를 말할 때는 제공된 월운(절기월)의 간지·십성·충합 표시를 근거로 '양력 ○월경'처럼 쓰십시오.

[문체 규칙]
1. 정중하고 친근한 전문가의 존댓말('~합니다', '~해 보세요')로 씁니다. 겁을 주거나 단정적인 흉운 선고는 금지합니다. 조심할 점은 반드시 '왜 → 어떻게 대비하나'를 함께 씁니다.
2. 사주 용어(십성·오행·간지·12운성 등)는 처음 나올 때 한자를 올바르게 병기하고(예: 정재(正財), 화(火), 병오(丙午)), 곧바로 일상 언어로 풀이합니다. 한글 음을 괄호에 반복하는 표기(정재(정재))는 금지합니다.
3. 영어 단어는 쓰지 않습니다(MBTI 유형 표기는 예외). 쉬운 한국어로 풀어 씁니다.
4. 모든 해석은 이 고객 사주의 구체적 글자·십성·운에 근거해야 합니다. 누구에게나 해당되는 일반론은 금지합니다.
5. 재물·투자·건강 조언은 '참고용 방향'으로 서술하고, 특정 종목·치료를 단정하지 않습니다.
${includeMbti
    ? '6. MBTI는 사주 해석과 반드시 연결해 서술합니다(예: "사주의 OO 기운이 현대의 OO형 성향으로 드러납니다"). 별개로 따로 쓰지 마십시오.'
    : '6. 이 리포트는 사주 전용입니다. MBTI는 언급하지 마십시오.'}`;

// 본문(소제목 1개) 작성 서식 — PDF 가독성을 위해 고정
const BODY_FORMAT = `[본문 서식 — 반드시 지킬 것]
- 첫 줄: "💡 " 로 시작하는 핵심 결론 1문장.
- 이어서 "• " 로 시작하는 불릿 5~6개. 불릿 하나는 2~3문장이며, 각 불릿의 핵심어는 **굵게** 표시합니다.
- 모든 불릿에는 주어진 데이터(원국 글자·십성·12운성·오행 비율·세운/월운·합충 표시) 중 최소 하나를 정확히 인용하십시오. 오행의 과다/부족은 [오행 에너지 분포]와 [오행 보완/과열] 표시만 근거로 삼고, 데이터에 없는 충·합을 만들어 내지 마십시오.
- 불릿과 불릿 사이는 반드시 빈 줄 하나로 구분합니다. 한 단락을 길게 이어 쓰지 마십시오.
- 마지막 줄: "[중요] " 로 시작하는 실천 팁 1문장.
- 전체 분량은 공백 포함 800~1,000자입니다. 이보다 짧으면 안 됩니다. 반복·군더더기 없이 밀도 있게 쓰십시오.
- 소제목·머리말·JSON·마크다운 제목(#)은 쓰지 말고 본문만 출력하십시오.`;

// ─────────────────────────────────────────────────────────────
// 작업(Task) 정의
// ─────────────────────────────────────────────────────────────
type Task =
    | { kind: 'text'; key: string; prompt: string; context?: string }
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
}

const textTasks = (g: Group): Task[] =>
    g.items.map((it, i) => ({
        kind: 'text' as const,
        key: `${g.key}#${i}`,
        ...(g.context ? { context: g.context } : {}),
        prompt: `[작성할 항목]
섹션: "${g.title}"
소제목: "${it.subtitle}"
작성 가이드: ${it.guide}
${g.note ? `섹션 공통 지시: ${g.note}\n` : ''}같은 섹션의 다른 소제목(내용이 겹치지 않게 이 항목에만 집중): ${g.items.filter((_, j) => j !== i).map(x => `"${x.subtitle}"`).join(', ')}

${BODY_FORMAT}`,
    }));

interface BuildCtx {
    years: RoadmapYear[];
    includeMbti: boolean;
    hasRequest: boolean;
    hasPartner: boolean;
    yearsFortune: string;
}

function buildGroups(ctx: BuildCtx): Group[] {
    const { years, includeMbti, hasRequest, hasPartner } = ctx;
    const range = `${years[0]!.year}~${years[years.length - 1]!.year}`;

    return [
        {
            key: 'specialRequestAnalysis',
            title: '01. 나의 고민에 대한 마스터의 답',
            context: ctx.yearsFortune,
            note: `${hasRequest
                ? '고객의 요청사항을 사주 원국(일간 강약·용신·기신·조후)과 대운·세운 흐름에 직접 연결해 답하십시오. 고객 요청을 한 번 인용하며 시작하십시오.'
                : '고객이 별도 요청을 남기지 않았습니다. 사주상 가장 취약한 오행·십성을 진단해 이 고객이 지금 가장 신경 써야 할 고민 주제를 스스로 정하고 답하십시오.'}${hasPartner ? ' [상대방 정보]가 있으므로 두 사람의 일간 관계, 오행 조화, 합·충을 근거로 관계 조언을 포함하십시오.' : ''}`,
            items: [
                { subtitle: '고민의 본질과 사주 속 원인', guide: '왜 이 고민이 생겼는지 원국 구조(일간 강약, 용신/기신, 조후)로 진단' },
                { subtitle: '지금 운의 흐름과 시기별 맥락', guide: `현재 대운과 ${range} 세운이 이 고민에 미치는 영향을 연도별로 짚기. 제공된 합·충 데이터를 인용` },
                { subtitle: '고민 해결을 위한 맞춤 조언', guide: '직업·재물·관계 중 고민과 관련된 영역에서 어떤 선택이 유리한지 구체적 행동으로 제시' },
                { subtitle: '해결 타임라인과 전환점', guide: `${years.map(y => y.year + '년').join(' → ')} 순으로 고민이 풀리는 시기, 전환점, 조심할 달(양력 ○월경)을 타임라인으로 제시` },
            ],
        },
        {
            key: 'natalChartAnalysis',
            title: '02. 사주원국(四柱原局) 심층 분석',
            items: [
                { subtitle: '사주의 뼈대: 천간과 지지가 말하는 것', guide: '년·월·일·시 천간/지지의 글자와 오행이 만드는 구조와 의미를 해설' },
                { subtitle: '일간(日干)의 본질과 십성·12운성', guide: '일간의 성향, 주요 십성 배치, 12운성·신살이 보여주는 잠재력과 약점' },
                { subtitle: '오행 균형과 생활 속 개운 처방', guide: '과다/결핍 오행 진단과, 보완을 위한 색상·방위·음식·습관 처방' },
            ],
        },
        {
            key: 'coreIdentity',
            title: '03. 선천적 기질과 내면의 지도',
            items: [
                { subtitle: includeMbti ? '사주×MBTI 시너지: 나만의 강점' : '타고난 강점과 매력', guide: `이 고객만의 독보적 강점을 근거와 함께 서술${includeMbti ? '. 사주 기운과 MBTI 성향을 연결' : ''}` },
                { subtitle: '무의식의 욕망과 방어 패턴', guide: '속마음의 욕구, 스트레스 상황에서 나오는 방어 패턴과 이를 다루는 법' },
                { subtitle: '숨은 리스크와 극복 방법', guide: '본성 깊은 곳의 약점이 현실에서 문제가 되는 장면과 구체적 극복법' },
            ],
        },
        {
            key: 'wealthAndCareer',
            title: '04. 재물 그릇과 커리어',
            note: '직업명·분야는 구체적으로 나열하십시오(예: 교육직(교사, 상담사), 마케팅, 개발 등).',
            items: [
                { subtitle: '나에게 맞는 일의 환경과 직업', guide: '식상·재성·관성 배치를 근거로 적합한 업종·직무·일하는 방식 제시' },
                { subtitle: '돈이 모이는 방식과 자산 관리', guide: '재성의 흐름을 바탕으로 한 재물 축적 방식과 자산 배분 방향(참고용 예시 비율 포함)' },
                { subtitle: '성취를 앞당기는 전략과 파재 예방', guide: '현실적 액션 플랜과 돈·커리어가 새는 패턴 및 예방법' },
            ],
        },
        {
            key: 'relationship',
            title: '05. 인연과 감정의 지도',
            note: '귀인의 성향, 만나는 장소·시기, 어울리는 파트너의 일주·오행 특징을 구체적으로 제시하십시오.',
            items: [
                { subtitle: '귀인과 대인관계 역학', guide: '나를 도울 귀인의 사주상 오행·성향, 만나기 쉬운 장소와 필요한 태도' },
                { subtitle: '감정 패턴과 어울리는 파트너', guide: '일지(배우자궁)를 근거로 한 연애 패턴, 어울리는 파트너의 오행·성향, 주의점' },
                { subtitle: '악연의 특징과 소통법', guide: '피해야 할 사람의 사주적 특징과, 갈등을 푸는 구체적 소통 방식' },
            ],
        },
        {
            key: 'actionPlan',
            title: '07. 운을 내 편으로 만드는 마스터플랜',
            context: ctx.yearsFortune,
            note: `${range} 3년 전체를 아우르는 실천 가이드이며 새로운 해석보다 '행동'에 집중합니다.`,
            items: [
                { subtitle: '오늘부터 시작할 3가지 실천', guide: '내일부터 당장 할 수 있는 구체적 행동 과제 (체크리스트처럼)' },
                { subtitle: `${range} 운을 키우는 습관과 개운 루틴`, guide: '3년 동안 유지할 습관, 오행 보완 루틴, 시기별 준비물' },
                { subtitle: '마스터의 마지막 한마디', guide: '고객의 사주와 앞날에 대한 따뜻하고 확신 있는 격려' },
            ],
        },
    ];
}

const YEAR_SUBTOPICS: DetailItem[] = [
    { subtitle: '연간 총평과 큰 흐름', guide: '세운과 대운·원국의 상호작용, 이 해가 일간·용신에 미치는 영향. 제공된 십성·합충 데이터를 인용' },
    { subtitle: '재물과 커리어', guide: '1~4분기별 승부처·기회·위기, 이직·투자·소비 방향을 월 단위(양력 ○월경)로 짚기' },
    { subtitle: '인연과 애정의 흐름', guide: '이 해의 인연운, 귀인을 만나기 좋은 달과 장소, 피해야 할 유형, 미혼/기혼별 연애·결혼운' },
    { subtitle: '건강 관리와 개운 전략', guide: '이 해의 오행 기운에 따라 약해지기 쉬운 장기·컨디션과 구체적 실천 루틴(시간대·운동·식습관 포함)' },
];

function buildTasks(ctx: BuildCtx & { yearContexts: Record<number, string> }): { tasks: Task[]; groups: Group[] } {
    const { years, yearContexts } = ctx;
    const range = `${years[0]!.year}~${years[years.length - 1]!.year}`;
    const groups = buildGroups(ctx);
    const tasks: Task[] = [];

    tasks.push({
        kind: 'json',
        key: 'cover',
        prompt: `표지 문구와 '한 장 요약'용 핵심 문구를 작성하십시오. 오직 순수 JSON 하나만 출력하십시오(코드블록 금지).
{
  "cover": {
    "mainTitle": "고객의 사주와 앞으로의 3년을 한 줄로 은유한 제목 (12자 이내, 예: '겨울나무, 봄날을 맞이하다')",
    "subTitle": "고객의 핵심 운명과 ${range} 흐름을 요약한 한 줄 카피 (40자 이내)"
  },
  "summary": {
    "keywords": ["고객 사주를 상징하는 핵심 키워드 4개 (각 2~8자)"],
    "verdict": "이 고객의 사주와 ${range} 3년을 관통하는 총평 3문장 (공백 포함 200~280자)",
    "topActions": ["지금 당장 시작할 구체적 행동 3가지 (각 40자 이내)"]
  }
}`,
        validate: j => !!j?.cover?.mainTitle && Array.isArray(j?.summary?.keywords) && j.summary.keywords.length >= 3 && typeof j?.summary?.verdict === 'string' && Array.isArray(j?.summary?.topActions) && j.summary.topActions.length >= 3,
    });

    groups.forEach(g => tasks.push(...textTasks(g)));

    tasks.push({
        kind: 'json',
        key: 'yearsMeta',
        context: ctx.yearsFortune,
        prompt: `${range} 3개년을 서로 비교해 연도별 요약 지표를 작성하십시오. 위 각 연도의 [결정론적 세운 데이터](십성·12운성·합충·대운 교체·월운)에 근거하십시오. 오직 순수 JSON 하나만 출력하십시오(코드블록 금지).
- scores 는 1~5 정수이며 세 해를 상대 비교한 실제 강약을 반영합니다. 세 해의 총점이 서로 달라야 하며(가장 좋은 해와 가장 조심할 해의 총점 차이 3 이상), 한 해 안에서도 분야별로 점수를 차별화하십시오.
- bestMonths/cautionMonths 는 양력 월 숫자(1~12) 배열이며 월운 데이터(십성·충합)에 근거해 각 1~3개.
{
  "years": [
${years.map(y => `    { "year": ${y.year}, "yearlyTheme": "${y.year}년의 핵심 테마 카피 (20자 이내)", "oneLine": "이 해를 한 문장으로 요약 (50자 이내)", "scores": { "wealth": 0, "career": 0, "love": 0, "health": 0 }, "bestMonths": [], "cautionMonths": [] }`).join(',\n')}
  ]
}`,
        validate: j => Array.isArray(j?.years) && years.every(y => {
            const m = j.years.find((x: any) => Number(x?.year) === y.year);
            return m && typeof m.yearlyTheme === 'string' && m.scores && ['wealth', 'career', 'love', 'health'].every(k => Number.isFinite(Number(m.scores[k]))) && Array.isArray(m.bestMonths) && Array.isArray(m.cautionMonths);
        }) && new Set(years.map(y => sumScores(j.years.find((x: any) => Number(x?.year) === y.year).scores))).size > 1,
    });


    for (const ry of years) {
        const yc = yearContexts[ry.year]!;
        textTasks({
            key: `year${ry.year}`,
            title: `${ry.year}년 ${ry.ganji}년 로드맵`,
            context: yc,
            note: `${ry.year}년 한 해에만 집중하고, 위 [${ry.year}년 결정론적 세운 데이터]를 근거로 하십시오.`,
            items: YEAR_SUBTOPICS,
        }).forEach(t => tasks.push(t));
    }

    return { tasks, groups };
}

// ─────────────────────────────────────────────────────────────
// 호출 유틸
// ─────────────────────────────────────────────────────────────
const sumScores = (s: any) => ['wealth', 'career', 'love', 'health'].reduce((a, k) => a + Number(s?.[k] ?? 0), 0);
const sum = sumScores;
const bulletCount = (t: string) => (t.match(/^\s*•/gm) || []).length;

function cleanBody(text: string): string {
    return text
        .replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '')
        .replace(/^\s*#{1,6}\s.*\n/, '')       // 모델이 붙인 제목 줄 제거
        .trim();
}

async function runTask(task: Task, system: string, baseQuery: string, startedAt: number): Promise<any> {
    const basePrompt = `${baseQuery}${task.context ? `\n\n${task.context}` : ''}\n\n${task.prompt}`;
    let prompt = basePrompt;
    let lastError: unknown = new Error('no attempt');

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
            if (body.length >= MIN_CONTENT_CHARS && bulletCount(body) >= 3) return body;
            console.warn(`[deep-report] ${task.key} attempt ${attempt}: too short (${body.length} chars, ${bulletCount(body)} bullets)`);
            lastError = new Error(`too short (${body.length} chars)`);
            prompt = `${basePrompt}\n\n[재작성 요청] 직전 답변은 ${body.length}자로 분량이 부족했습니다. 불릿을 6개로 늘리고 각 불릿을 3문장(구체적 근거·사례·행동 포함)으로 써서 공백 포함 900자 안팎으로 다시 작성하십시오. 서식 규칙은 동일합니다.`;
        } catch (e) {
            lastError = e;
            console.warn(`[deep-report] ${task.key} attempt ${attempt} error:`, String((e as any)?.message).slice(0, 160));
            const name = (e as any)?.name;
            const recoverable = name === 'TimeoutError' || name === 'AbortError' || isRetryableAIError(e) || e instanceof SyntaxError || String((e as any)?.message).includes('JSON');
            if (!recoverable) break;
        }
    }
    throw new Error(`[${task.key}] 생성 실패: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

const clampScore = (n: any) => Math.min(5, Math.max(1, Math.round(Number(n) || 3)));
const cleanMonths = (a: any): number[] => (Array.isArray(a) ? a : []).map(Number).filter(n => Number.isInteger(n) && n >= 1 && n <= 12).slice(0, 3);

// ─────────────────────────────────────────────────────────────
// 메인
// ─────────────────────────────────────────────────────────────
export async function generateDeepReport(input: DeepReportInput, now: Date = new Date()): Promise<Record<string, any>> {
    const startedAt = Date.now();
    const { birthDate, birthTime } = parseBirthInfo(input.birthInfo);
    const birthYear = Number(birthDate.replace(/[-./]/g, '').substring(0, 4)) || 1990;

    const saju = getPreciseSajuData({ birthDate, ...(birthTime ? { birthTime } : {}), ...(input.gender ? { gender: input.gender } : {}) });
    const years = getRoadmapYears(now);
    const includeMbti = (input.reportType || '').includes('MBTI') && !!input.mbti;

    const yearContexts = Object.fromEntries(years.map(y => [y.year, buildYearFortuneContext(saju, birthYear, y)])) as Record<number, string>;
    const yearsFortune = buildYearsFortuneContext(saju, birthYear, years);

    const partner = input.partnerInfo && input.partnerInfo.name ? input.partnerInfo : null;
    const partnerText = partner
        ? `\n[상대방 정보]\n이름: ${partner.name}, 생년월일시: ${partner.birth_info}, MBTI: ${partner.mbti || '모름'}, 관계: ${partner.relationship}`
        : '';

    const baseQuery = `[분석 대상자 정보]
이름: ${input.name || '내담자'}${includeMbti ? `, MBTI: ${input.mbti}` : ''}, 생년월일시: ${input.birthInfo}${input.gender ? `, 성별: ${input.gender}` : ''}
고객 요청사항: ${(input.specialRequest || '').trim() || '없음'}${partnerText}
분석 기간: 올해(${now.getFullYear()}년)를 제외한 ${years.map(y => `${y.year}년 ${y.ganji}`).join(', ')}

${buildRichSajuContext(saju)}
★ ${buildLuckSummary(saju, birthYear, now.getFullYear())}`;

    const system = buildSystemPrompt(includeMbti);
    const { tasks, groups } = buildTasks({
        years,
        includeMbti,
        hasRequest: !!(input.specialRequest || '').trim(),
        hasPartner: !!partner,
        yearsFortune,
        yearContexts,
    });

    const entries = await Promise.all(tasks.map(async t => [t.key, await runTask(t, system, baseQuery, startedAt)] as const));
    const r = Object.fromEntries(entries) as Record<string, any>;

    const section = (key: string) => {
        const g = groups.find(x => x.key === key)!;
        return {
            title: g.title,
            details: g.items.map((it, i) => ({ subtitle: it.subtitle, content: r[`${g.key}#${i}`] as string })),
        };
    };

    const yearDetails = years.map(ry => {
        const m = (r.yearsMeta.years as any[]).find(x => Number(x.year) === ry.year);
        return {
            year: ry.year,
            ganji: ry.ganji,
            yearlyTheme: m.yearlyTheme as string,
            oneLine: (m.oneLine || '') as string,
            scores: {
                wealth: clampScore(m.scores.wealth),
                career: clampScore(m.scores.career),
                love: clampScore(m.scores.love),
                health: clampScore(m.scores.health),
            },
            bestMonths: cleanMonths(m.bestMonths),
            cautionMonths: cleanMonths(m.cautionMonths),
            subtopics: YEAR_SUBTOPICS.map((it, i) => ({ subtitle: it.subtitle, content: r[`year${ry.year}#${i}`] as string })),
        };
    });

    const ranked = [...yearDetails].sort((x, y) => sum(y.scores) - sum(x.scores));
    const best = ranked[0]!;
    const caution = ranked[ranked.length - 1]!;

    return {
        schemaVersion: 2,
        cover: r.cover.cover,
        summary: {
            ...r.cover.summary,
            yearOverview: yearDetails.map(({ year, ganji, yearlyTheme, oneLine, scores, bestMonths, cautionMonths }) => ({ year, ganji, yearlyTheme, oneLine, scores, bestMonths, cautionMonths })),
            bestYear: best.year,
            cautionYear: sum(best.scores) === sum(caution.scores) ? null : caution.year,
        },
        specialRequestAnalysis: section('specialRequestAnalysis'),
        natalChartAnalysis: section('natalChartAnalysis'),
        coreIdentity: section('coreIdentity'),
        wealthAndCareer: section('wealthAndCareer'),
        relationship: section('relationship'),
        threeYearRoadmap: { title: getRoadmapTitle(years), details: yearDetails },
        actionPlan: section('actionPlan'),
        userSaju: saju,
        generationMs: Date.now() - startedAt,
    };
}
