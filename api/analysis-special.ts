import { streamObject } from 'ai';
import { z } from 'zod';
import { getPreciseSajuData, buildRichSajuContext } from './_utils/saju';
import { corsHeaders, handleCors, getCorsHeaders } from './_utils/cors';
import {
    getAIProvider,
    isRetryableAIError,
    BASE_SYSTEM_PROMPT,
    getTemporalAnchorBlock,
    formatMbtiForPrompt,
    buildSingleFactualLockBlock,
    wrapResponseWithFactualGuard,
} from './_utils/ai-provider';
import { authenticateUser, releaseServiceReceipt } from './_utils/auth';
import {
    tripSchema,
    jamidusuSchema,
    kboSchema,
    singleDayFortuneSchema,
    dailyFortuneSchema,
} from '../src/config/schemas';

// 정적 시스템 프롬프트 (OpenAI Prompt Caching 최적화: 1,024+ 토큰 정적 접두사 유지)
const STATIC_SPECIAL_SYSTEM_PROMPT = `
${BASE_SYSTEM_PROMPT}

당신의 임무는 사주와 성향(MBTI 입력 시 결합, 미입력 시 사주 기질 중심)을 정밀 융합하여 실용적 라이프 가이드를 제안하는 냉철하면서도 사려 깊은 운명 분석가이자 라이프 컨설턴트입니다.
    
[AI 사주 직접 계산 엄금 및 사실 수용 규칙]
★ 중요: 너는 생년월일시를 바탕으로 사주 원국(연주, 월주, 일주, 시주), 오행 비율, 십신을 절대로 직접 계산하려고 시도하지 마라!
★ 사용자 입력(User Prompt)에 제공되는 [System Context: Deterministic Saju Data] 사주 데이터는 코드 엔진(manseryeok)이 계산한 100% 검증 데이터이다. 제공된 데이터만을 사실로 받아들이고 이를 기반으로 깊이 있는 해석 가이드를 제시하라.

[핵심 규칙]
1. 사용자 입력의 [시간적 기준 정보](올해 2026년 병오년, 내년 2027년 정미년)를 반드시 기준으로 작성하며, 2023/2024/2025년을 올해로 언급하지 마세요.
2. 현실적이고 냉정한 진단·예측(리스크와 흔들리는 지점 직시)과 더불어, 마무리는 마음을 다독이는 담백하고 따뜻한 조언과 구체적인 실행 지침으로 전달하세요.
3. 압도적인 디테일과 3~5배 풍성한 분량: 단답형 한두 문장을 배제하고, 스키마에 명시된 분량 이상으로 충분히 구체적이고 입체적인 상황을 들어 서술하세요.
4. 가독성 최우선: 한 단락이 길어지지 않도록 문단과 문장을 적절히 나누고 줄 바꿈(\\n\\n)과 글머리표(-)를 적극 사용하세요.
5. 절대적 금지 사항 (CRITICAL): 답변 어디에도 마크다운 강조 기호인 별표 두 개(**), __, # 및 이모티콘/이모지를 절대로 사용하지 마세요.
6. MBTI 용어를 제외한 모든 언어는 한국어만 사용하세요. 한국어 단어 뒤에 영어 번역을 괄호로 병기하지 마세요. (예: "목(Wood)" (X), "목(木)" (O))
`.trim();

const schemas: Record<string, z.ZodType<any>> = {
    healing: z.object({
        place: z.string(),
        placeType: z.string(),
        activity: z.string(),
        reason: z.string(),
        summary: z.string()
    }),
    jamidusu: jamidusuSchema,
    trip: tripSchema,
    travel: tripSchema,
    kbo: kboSchema,
    fortune: dailyFortuneSchema,
    fortune_today: singleDayFortuneSchema,
    fortune_tomorrow: singleDayFortuneSchema
};

const KBO_TEAMS = [
    'KIA 타이거즈', '삼성 라이온즈', 'LG 트윈스', '두산 베어스', 'SSG 랜더스',
    'KT 위즈', '한화 이글스', '롯데 자이언츠', 'NC 다이노스', '키움 히어로즈'
];

function getDeterministicValue(seed: string, offset: number, min: number, max: number) {
    let hash = 0;
    const input = seed + offset.toString();
    for (let i = 0; i < input.length; i++) {
        hash = ((hash << 5) - hash) + input.charCodeAt(i);
        hash |= 0;
    }
    const val = Math.abs(hash);
    return min + (val % (max - min + 1));
}

function getDateString(offsetDays: number = 0): string {
    const d = new Date();
    d.setHours(d.getHours() + 9); // KST
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().split('T')[0]!; // YYYY-MM-DD
}

// 같은 입력에는 같은 결과를 돌려주기 위한 캐시 키. 캐시 대상이 아니면 null.
function buildCacheKey(targetType: string, body: any): string | null {
    const clean = (v: unknown) => String(v ?? '').trim().slice(0, 40);
    if (targetType === 'fortune_today' || targetType === 'fortune_tomorrow') {
        // 대상 날짜 기준 키: 어제 결제한 '내일의 운세'가 오늘의 운세와 같은 결과가 되도록 한다.
        const targetDate = getDateString(targetType === 'fortune_tomorrow' ? 1 : 0);
        return `fortune:${targetDate}:${clean(body?.birthDate)}:${clean(body?.mbti)}`;
    }
    if (targetType === 'jamidusu') {
        const date = clean(body?.targetBirthDate ?? body?.birthDate);
        const time = clean(body?.targetBirthTime ?? body?.birthTime) || '-';
        const gender = clean(body?.targetGender ?? body?.gender);
        return `jamidusu:${gender}:${date}:${time}`;
    }
    return null;
}

function getDeterministicKboResults(birthDate: string, mbti: string, currentTeam: string, dateOffset: number = 0) {
    const dateStr = getDateString(dateOffset);
    const mainSeed = `${birthDate}-${mbti}-${dateStr}`;
    
    const teamScores = KBO_TEAMS.map(team => ({
        team,
        score: getDeterministicValue(mainSeed, team.length + team.charCodeAt(0), 40, 98)
    })).sort((a, b) => b.score - a.score);

    const bestTeam = teamScores[0]?.team || KBO_TEAMS[0]!;
    const worstTeam = teamScores[teamScores.length - 1]?.team || KBO_TEAMS[KBO_TEAMS.length - 1]!;
    const currentTeamScore = teamScores.find(t => t.team === currentTeam)?.score || 50;
    const winFairyScore = getDeterministicValue(mainSeed + (currentTeam === '없음 (아직 없음)' ? bestTeam : currentTeam), 777, 30, 95);

    const dimensionLabels = ['열정 수치', '직관 에너지', '응원 화력', '승리 행운', '팀 로열티'];
    const dimensions = dimensionLabels.map((label, i) => ({
        label,
        value: getDeterministicValue(mainSeed + (currentTeam === '없음 (아직 없음)' ? bestTeam : currentTeam), i + 999, 40, 100)
    }));

    return {
        date: dateStr,
        score: currentTeamScore,
        winFairyScore,
        bestTeam,
        worstTeam,
        dimensions
    };
}

export const config = {
    runtime: 'edge',
};

export default async function handler(req: Request) {
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    const reqCorsHeaders = getCorsHeaders(req);

    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { 
            status: 405, 
            headers: reqCorsHeaders 
        });
    }

    const url = new URL(req.url, 'http://localhost');
    const body = await req.json();
    const rawType = url.searchParams.get('type') || body?.type || body?.serviceType || body?.analysisType || 'trip';
    const scope = url.searchParams.get('scope') || body?.scope;
    
    let targetType = rawType as string;
    if (targetType === 'travel') targetType = 'trip';
    if (targetType === 'fortune') {
        if (scope === 'today') targetType = 'fortune_today';
        else if (scope === 'tomorrow') targetType = 'fortune_tomorrow';
    }
    
    const currentSchema = schemas[targetType] || schemas.trip;

    if (!currentSchema) {
        return new Response(JSON.stringify({ error: `Invalid analysis type: ${rawType}` }), { 
            status: 400, 
            headers: reqCorsHeaders 
        });
    }

    // 서비스별 단건 결제 티켓 검증 + Rate Limit 검증 (오늘의 운세는 무료 제공)
    let serviceType: string | undefined = undefined;
    let allowedServiceTypes: string[] | undefined = undefined;
    let requirePaymentReceipt = true;
    if (targetType === 'fortune_today') {
        serviceType = 'FORTUNE_TODAY';
        allowedServiceTypes = ['FORTUNE_TODAY'];
        requirePaymentReceipt = false;
    } else if (targetType === 'fortune_tomorrow') {
        serviceType = 'FORTUNE_TOMORROW';
        allowedServiceTypes = ['FORTUNE_TOMORROW'];
    } else if (targetType === 'jamidusu') {
        serviceType = 'JAMIDUSU';
        allowedServiceTypes = ['JAMIDUSU'];
    } else if (targetType === 'trip') {
        serviceType = 'TRIP';
        allowedServiceTypes = ['TRIP', 'COMPATIBILITY_TRIP'];
    } else if (targetType === 'kbo') {
        serviceType = 'KBO';
        allowedServiceTypes = ['KBO'];
    } else {
        serviceType = 'FORTUNE_TODAY';
        allowedServiceTypes = ['TRIP', 'COMPATIBILITY_TRIP', 'FORTUNE_TODAY', 'MBTI_SAJU', 'REGENERATE_MBTI_SAJU'];
        requirePaymentReceipt = false;
    }

    const cacheKey = buildCacheKey(targetType, body);
    let cachedResult: unknown = null;

    const authResult = await authenticateUser(req, {
        serviceType,
        allowedServiceTypes,
        requirePaymentReceipt,
        cost: requirePaymentReceipt ? undefined : 0,
        allowAnonymous: true,
    });

    if (authResult.errorResponse) {
        return authResult.errorResponse;
    }

    if (cachedResult) {
        return new Response(JSON.stringify(cachedResult), {
            headers: { ...reqCorsHeaders, 'Content-Type': 'text/plain; charset=utf-8' }
        });
    }

    const { 
        birthDate, birthTime, mbti, region, selectedRegion, tripType, duration, name, 
        startDate, endDate, targetBirthDate, targetBirthTime, targetGender, requirements,
        sajuData, targetSajuData
    } = body;

    const finalRegion = region || selectedRegion || (tripType === 'international' ? '해외 추천 지역' : '전국');
    const finalPeriod = startDate && endDate
        ? `${startDate} ~ ${endDate}`
        : duration
            ? `${duration}일 일정`
            : '자유 일정';
    const mbtiPromptValue = formatMbtiForPrompt(mbti);
    const temporalBlock = getTemporalAnchorBlock();

    // Always compute deterministic Saju data
    let saju = getPreciseSajuData({ birthDate, birthTime, gender: body.gender });
    let sajuContextBlock = buildRichSajuContext(saju);

    const elementNames: Record<string, string> = { wood: '목(木)', fire: '화(火)', earth: '토(土)', metal: '금(金)', water: '수(水)' };
    const translateRatio = (ratio: any) => {
        if (!ratio) return {};
        const result: any = {};
        for (const [k, v] of Object.entries(ratio)) {
            result[elementNames[k] || k] = v;
        }
        return result;
    };

    let userQuery = '';

    if (targetType === 'healing') {
        userQuery = `MBTI: ${mbtiPromptValue}, 일간: ${saju?.dayMaster?.korean || '알수없음'}, 오행분포: ${JSON.stringify(translateRatio(saju?.elementRatio))}, 선호 지역: ${finalRegion}`;
    } else if (targetType === 'jamidusu') {
        // 프런트는 birthDate/birthTime/gender로 보내므로 target* 값이 없으면 이를 사용한다.
        const jmBirthDate = targetBirthDate ?? birthDate;
        const jmBirthTime = targetBirthTime ?? birthTime;
        const jmGender = targetGender ?? body.gender;
        const finalTargetSaju = jmBirthDate
            ? getPreciseSajuData({ birthDate: jmBirthDate, birthTime: jmBirthTime, gender: jmGender })
            : saju;
        saju = finalTargetSaju;
        sajuContextBlock = buildRichSajuContext(finalTargetSaju);
        userQuery = `[정통 자미두수 12궁 명반 분석 요청]
성별: ${jmGender === 'male' ? '남성' : '여성'}
생년월일시: ${jmBirthDate} ${jmBirthTime || '시간모름'}
MBTI: ${mbtiPromptValue}
사주: 일간 ${finalTargetSaju?.dayMaster?.korean || '모름'}, 오행분포 ${JSON.stringify(translateRatio(finalTargetSaju?.elementRatio))}

[생성 작업 지침 - 심층 분량 · 이모지 금지]
1. main_character: 위 명식을 자미두수의 주요 주성(자미, 칠살, 파군, 탐랑, 천기, 태음, 천동 등)으로 치환해 묵직하고 인상적인 주성 호칭을 도출하세요. (이모지 금지)
2. destiny_palace (명궁): 타고난 본성과 겉으로 드러나는 이미지 대비 내면의 현실적 딜레마를 350~450자(2~3문단 \\n\\n)로 서술하세요.
3. career_palace (관록궁): 조직/독립 적합성, 성과가 나는 일처리 방식, 주의할 번아웃/마찰 패턴을 350~450자(2~3문단 \\n\\n)로 서술하세요.
4. wealth_style (재백궁): 돈이 붙는 구조와 소비/투자 시 가장 조심해야 할 누수 패턴, 현실적 재물 전략을 350~450자(2~3문단 \\n\\n)로 서술하세요.
5. love_style (부처궁): 끌리는 상대 유형, 연애에서 반복되는 갈등 구조, 오래 버티는 관계의 조건을 350~450자(2~3문단 \\n\\n)로 서술하세요.
6. lucky_items: 자미두수에서 나를 돕는 길성이나 행운 요소 정확히 3개(name + meaning 100~160자 구체적 활용법).
7. summary: 올해 기준 명반 전체를 꿰뚫는 현실적 과제와 따뜻하고 단단한 응원 총평을 400~550자(3문단 \\n\\n)로 작성하세요.
8. 절대 영어나 이모지를 넣지 말고 어려운 한자는 풀어쓰되 명궁/관록궁/재백궁/부처궁의 깊이감을 살리세요.`;

    } else if (targetType === 'job') {
        userQuery = `MBTI: ${mbtiPromptValue}, 사주 일간: ${saju?.dayMaster?.korean || '알수없음'}, 오행분포: ${JSON.stringify(translateRatio(saju?.elementRatio))}`;
    } else if (targetType === 'trip') {
        userQuery = `[여행지 및 일정 분석 요청]
사용자 이름: ${name || '이용자'}
MBTI: ${mbtiPromptValue}
사주 일간: ${saju?.dayMaster?.korean || '알수없음'} (${saju?.dayMaster?.chinese || ''})
오행 분포: ${JSON.stringify(translateRatio(saju?.elementRatio))}
여행 구분: ${tripType === 'international' ? '해외여행' : '국내여행'}
선호 지역: ${finalRegion}
여행 기간: ${finalPeriod}
요청사항: ${requirements || '특별한 요청 없음'}

[생성 작업 지침]
1. concept: 이번 여행을 관통하는 핵심 테마 한 문장 (이모지 금지).
2. places (3곳): 사용자의 사주(일간, 오행 부족/과다 보완)와 성향 기준으로, 왜 지금 이 시기에 이곳이 필요한지 냉정하게 짚어주는 reason(250~350자, 2문단)과 구체적 동선/활동 activity(180~250자), photoSpot, food를 모두 충실히 채우세요.
3. itinerary: 요청한 여행 일수(${duration || 3}일 내외)에 맞춰 1일차~N일차별 오전/오후/저녁의 구체적이고 현실적인 일정을 구성하세요.
4. companion & luckyItem: 함께 가면 시너지가 나는 동행 스타일/갈등 방지 포인트(180~250자, 단 다른 MBTI 4글자 코드를 적지 말고 한국어 성향 표현으로 서술)와 컨디션·기운 보완 아이템(100~150자)을 서술하세요.
5. summary(300~450자), bestTime(150~220자), tip(180~250자): 헛된 미사여구 대신 실제 일정 조율과 마음 환기에 도움이 되는 현실 조언과 따뜻한 응원을 담으세요.`;
    } else if (targetType === 'kbo') {
        const isNoTeam = requirements === '없음 (아직 없음)';
        const currentTeam = isNoTeam ? '없음' : (requirements || 'KIA');
        const kboDeterministic = getDeterministicKboResults(birthDate || '', mbti || '', currentTeam, 0);
        const kboTomorrow = getDeterministicKboResults(birthDate || '', mbti || '', currentTeam, 1);

        const currentTeamScore = kboDeterministic.score;
        const winFairyScore = kboDeterministic.winFairyScore;
        const bestTeam = kboDeterministic.bestTeam;
        const worstTeam = kboDeterministic.worstTeam;

        userQuery = `[KBO 야구단 궁합 및 직관 운세 분석 요청]
사용자 이름: ${name || '이용자'}
MBTI: ${mbtiPromptValue}
사주 일간: ${saju?.dayMaster?.korean || '알수없음'}
오행 분포: ${JSON.stringify(translateRatio(saju?.elementRatio))}
현재 응원 구단: ${currentTeam} (추천 여부: ${isNoTeam ? '추천됨' : '기존 팬'})

[사전 계산된 데이터 (절대 준수)]
- 해당 구단과의 궁합 점수(score): ${currentTeamScore}점
- 오늘 직관 시 승리요정 지수(winFairyScore): ${winFairyScore}점
- 내일 예정 궁합 점수(tomorrowScore): ${kboTomorrow.score}점
- 내일 예정 승리요정 지수(tomorrowWinFairyScore): ${kboTomorrow.winFairyScore}점
- 나에게 가장 운명적인 최고 궁합 구단(bestTeam): ${bestTeam}
- 나와 상극인 주의해야 할 구단(worstTeam): ${worstTeam}
- 5대 지표: ${JSON.stringify(kboDeterministic.dimensions)}

[생성 지침 - 심층 분량 · 이모지 금지]
1. supportedTeamAnalysis: 현재 구단(${currentTeam})과의 궁합 점수(${currentTeamScore}점)에 대해 사주 오행·일간 및 성향 관점에서 잘 맞는 결, 경기 흐름이 꼬일 때 주의해야 할 감정 패턴, 직관을 더 즐겁게 만드는 따뜻한 조언까지 **450~600자(3문단 \\n\\n)**로 풍성하게 서술하세요.
2. dailyMessage: 오늘 이 구단과의 기운을 담은 담백하고 선명한 한 줄 (40~80자, 이모지 금지).
3. recommendedSeat: 사주와 성향 기준 추천 구장 좌석 구역과 이유 (100~160자).
4. luckyFood: 오늘 기운을 보완하는 구장 먹거리와 이유 (100~160자).
5. 숫자/점수 필드(score, winFairyScore, tomorrowScore, tomorrowWinFairyScore, bestTeam, worstTeam, dimensions, date)는 위 사전 계산된 데이터 그대로 채우고, 본문 분석은 현재 응원 구단 위주로 서술하세요.`;
    } else if (targetType === 'fortune_today' || targetType === 'fortune_tomorrow' || targetType === 'fortune') {
        const yearStr = birthDate?.split('-')[0] || '1990';
        const zodiac = ["쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양", "원숭이", "닭", "개", "돼지"][(parseInt(yearStr) - 4) % 12];
        const dateTag = scope === 'tomorrow' || targetType === 'fortune_tomorrow' ? '내일' : '오늘';
        const targetDate = getDateString(dateTag === '내일' ? 1 : 0);
        userQuery = `[대상 날짜: ${targetDate} (${dateTag})]
띠: ${zodiac}, 생년월일: ${birthDate}, MBTI: ${mbtiPromptValue}, 사주 일간: ${saju?.dayMaster?.korean || '알수없음'}, 오행분포: ${JSON.stringify(translateRatio(saju?.elementRatio))}.
반드시 '${dateTag}'(${targetDate})의 운세만 생성하세요. 생성되는 운세의 date 필드는 반드시 '${targetDate}' 이어야 합니다.
- fortune 본문은 반드시 600~900자(4~5문단 \\n\\n)로 (1) 오늘/내일 전체 기운의 냉정한 현실 진단, (2) 일·학업과 재물에서 조심할 변수, (3) 대인·연애 관계에서의 태도, (4) 하루를 버텨내는 스스로를 위한 따뜻한 조언 순으로 풍성하게 서술하세요.
- mission은 오늘 바로 해볼 수 있는 현실적 미션과 따뜻한 한마디(80~140자)로 작성하세요. 이모지와 ** 기호는 절대 사용하지 마세요.`;
    }

    const factualLockBlock = buildSingleFactualLockBlock({ saju, mbti, name });
    const finalUserQuery = `${temporalBlock}\n\n${sajuContextBlock}\n\n${userQuery}\n\n${factualLockBlock}`;

    let receiptReleased = false;
    const safeReleaseReceipt = async () => {
        if (!requirePaymentReceipt || receiptReleased) return;
        receiptReleased = true;
        await releaseServiceReceipt(authResult.supabaseAdmin, authResult.receiptToken);
    };

    try {
        let lastError;
        for (let attempt = 0; attempt < 4; attempt++) {
            try {
                const { model } = getAIProvider(attempt);
                const result = await streamObject({
                    model,
                    schema: currentSchema,
                    system: STATIC_SPECIAL_SYSTEM_PROMPT,
                    prompt: finalUserQuery,
                    temperature: 0.4,
                    maxOutputTokens: 16384,
                    maxRetries: 0,
                    onError: async ({ error }) => {
                        console.warn(`[analysis-special stream onError - ${targetType}]:`, error);
                        await safeReleaseReceipt();
                    },
                    onFinish: async ({ object, error }) => {
                        if (!object || error) {
                            await safeReleaseReceipt();
                            return;
                        }
                        // 검증을 통과한 완성 결과만 저장 (같은 날/같은 입력이면 재사용)
                        if (!cacheKey || !authResult.user) return;
                        try {
                            await authResult.supabaseAdmin
                                .from('ai_result_cache')
                                .upsert(
                                    { user_id: authResult.user.id, cache_key: cacheKey, result: object },
                                    { onConflict: 'user_id,cache_key', ignoreDuplicates: true }
                                );
                        } catch (cacheError) {
                            console.warn('[ai_result_cache] save failed:', cacheError);
                        }
                    },
                });
                return wrapResponseWithFactualGuard(
                    result.toTextStreamResponse({ headers: reqCorsHeaders }),
                    { expectedSingleMbti: mbti }
                );
            } catch (error) {
                lastError = error;
                console.warn(`Attempt ${attempt + 1} failed for type ${targetType}:`, error);
                
                if (!isRetryableAIError(error)) {
                    console.error(`Non-retryable error on attempt ${attempt + 1}:`, error);
                    break;
                }
            }
        }
        throw lastError;
    } catch (error: any) {
        await safeReleaseReceipt();
        console.error(`[Streaming Error - ${targetType}]:`, error);
        return new Response(JSON.stringify({ error: "분석 중 오류가 발생했습니다." }), { 
            status: 500, 
            headers: reqCorsHeaders 
        });
    }
}
