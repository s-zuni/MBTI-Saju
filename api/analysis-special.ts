import { streamObject } from 'ai';
import { z } from 'zod';
import { calculateSaju } from './_utils/saju';
import { corsHeaders, handleCors } from './_utils/cors';
import { getAIProvider, isRetryableAIError } from './_utils/ai-provider';

const luckySchema = z.object({
    color: z.string().describe("행운의 색상"),
    number: z.string().describe("행운의 숫자"),
    direction: z.string().describe("행운의 방향")
});

const fortuneItemSchema = z.object({
    fortune: z.string().describe("상세 운세 분석 내용 (반드시 줄바꿈(\\n)을 2-3회 사용하여 가독성을 높일 것)"),
    lucky: luckySchema,
    mission: z.string().describe("오늘의 미션 (2-30대 여성이 좋아할 만한 재치 있고 센스 있는 미션/조언)"),
    charm_stats: z.array(z.object({
        label: z.string().describe("매력 지수 항목 (예: 매력, 에너지, 연애운, 금전운 등)"),
        value: z.number().describe("수치 (0-100)")
    })).length(5).describe("오늘의 5대 매력/운세 스탯"),
    lucky_ootd: z.string().describe("오늘의 추천 OOTD 스타일 (예: '청량한 크롭탑과 와이드 데님 팬츠')")
});

const fortuneSchemaSingle = z.object({
    fortune: fortuneItemSchema,
    date: z.string().describe("날짜 (YYYY-MM-DD)")
});

const schemas: Record<string, any> = {
    healing: z.object({
        place: z.string(),
        placeType: z.string(),
        activity: z.string(),
        reason: z.string(),
        summary: z.string()
    }),
    naming: z.object({
        names: z.array(z.object({
            hangul: z.string(),
            hanja: z.string(),
            meaning: z.string(),
            saju_compatibility: z.string()
        })),
        summary: z.string()
    }),
    trip: z.object({
        places: z.array(z.object({
            name: z.string(),
            reason: z.string(),
            activity: z.string()
        })),
        itinerary: z.array(z.object({
            day: z.string(),
            schedule: z.array(z.string())
        })),
        summary: z.string(),
        bestTime: z.string(),
        tip: z.string()
    }),
    kbo: z.object({
        score: z.number().describe("선택한 구단과의 궁합 점수 (0-100)"),
        supportedTeamAnalysis: z.string().describe("사주와 MBTI 기반 궁합 분석 (서버 생성)"),
        winFairyScore: z.number().describe("승리 요정 지수 (0-100)"),
        bestTeam: z.string().describe("최강 궁합 구단"),
        worstTeam: z.string().describe("최악 궁합 구단"),
        dimensions: z.array(z.object({
            label: z.string().describe("평가 척도 이름"),
            value: z.number().describe("해당 척도 점수 (0-100)")
        })).length(5),
        date: z.string().describe("오늘 날짜 (YYYY-MM-DD)"),
        dailyMessage: z.string().describe("오늘의 KBO 운세 한 줄 메시지"),
        recommendedSeat: z.string().optional().describe("오늘의 직관 자리 추천 (사주와 MBTI 바탕)"),
        luckyFood: z.string().optional().describe("오늘, 행운의 직관음식 (사주와 MBTI 바탕)"),
        tomorrowScore: z.number().describe("내일 궁합 점수"),
        tomorrowWinFairyScore: z.number().describe("내일 승요지수")
    }),
    fortune: z.object({
        today: fortuneItemSchema,
        today_date: z.string().describe("오늘 날짜 (YYYY-MM-DD)"),
        tomorrow: fortuneItemSchema,
        tomorrow_date: z.string().describe("내일 날짜 (YYYY-MM-DD)")
    }),
    fortune_today: fortuneSchemaSingle,
    fortune_tomorrow: fortuneSchemaSingle
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
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().split('T')[0]!; // YYYY-MM-DD in UTC
}



// Template-based analysis removed in favor of dynamic AI generation to satisfy "MBTI/Saju essential use" requirement.

function getDeterministicKboResults(birthDate: string, mbti: string, currentTeam: string, dateOffset: number = 0) {
    const dateStr = getDateString(dateOffset);
    // Include today's date in the seed so scores change daily
    const mainSeed = `${birthDate}-${mbti}-${dateStr}`;
    
    // 1. Team rankings based on mainSeed
    const teamScores = KBO_TEAMS.map(team => ({
        team,
        score: getDeterministicValue(mainSeed, team.length + team.charCodeAt(0), 40, 98)
    })).sort((a, b) => b.score - a.score);

    const bestTeam = teamScores[0]?.team || KBO_TEAMS[0]!;
    const worstTeam = teamScores[teamScores.length - 1]?.team || KBO_TEAMS[KBO_TEAMS.length - 1]!;

    // 2. Specific score for currentTeam
    const currentTeamScore = teamScores.find(t => t.team === currentTeam)?.score || 50;
    
    // 3. Win Fairy Score (User + Stadium synergy)
    const winFairyScore = getDeterministicValue(mainSeed + (currentTeam === '없음 (아직 없음)' ? bestTeam : currentTeam), 777, 30, 95);

    // 4. Dimensions
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

    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { 
            status: 405, 
            headers: corsHeaders 
        });
    }

    const url = new URL(req.url, 'http://localhost');
    const body = await req.json();
    const type = url.searchParams.get('type') || body.type;
    const scope = url.searchParams.get('scope') || body.scope;
    
    let targetType = type as string;
    if (type === 'fortune') {
        if (scope === 'today') targetType = 'fortune_today';
        else if (scope === 'tomorrow') targetType = 'fortune_tomorrow';
    }
    
    const currentSchema = schemas[targetType];

    if (!currentSchema) {
        return new Response(JSON.stringify({ error: `Invalid analysis type: ${type}` }), { 
            status: 400, 
            headers: corsHeaders 
        });
    }

    const { 
        birthDate, birthTime, mbti, region, name, 
        startDate, endDate, targetBirthDate, targetBirthTime, targetGender, requirements,
        sajuData, targetSajuData
    } = body;

    // API Key checking is now handled centrally in ai-provider.ts

    let saju = sajuData;
    if (!saju && birthDate) {
        try { saju = calculateSaju(birthDate, birthTime); } catch (e) { console.error('Saju error:', e); }
    }

    const elementNames: Record<string, string> = { wood: '목(木)', fire: '화(火)', earth: '토(土)', metal: '금(金)', water: '수(水)' };
    const translateRatio = (ratio: any) => {
        if (!ratio) return {};
        const result: any = {};
        for (const [k, v] of Object.entries(ratio)) {
            result[elementNames[k] || k] = v;
        }
        return result;
    };

    let systemPrompt = `당신은 20대 여성의 감성과 니즈를 완벽하게 파악하고 있는 '트렌디 웰니스 & 라이프 컨설턴트'입니다.
    
    [핵심 규칙]
    1. 모든 답변은 20대 여성이 흥미를 느낄 수 있도록 친근하고 감각적인 어투를 사용하세요.
    2. 가독성 최우선: 줄 바꿈을 매우 자주 사용하세요. 한 문장이 끝나면 가급적 줄을 바꿉니다 (\\n\\n). 
    3. 모든 나열 방식은 반드시 '글머리표(-)'를 사용하여 시각적으로 깔끔하게 정리하세요.
    4. '오늘의 미션'은 소소하지만 확실한 행복(소확행)이나, 인스타 인증하기 좋은 챌린지 형태로 제안하세요.
    5. 'charm_stats'는 오늘 사용자의 기운이 어디에 집중되어 있는지 5가지 항목으로 분석하세요.
    6. 'lucky_ootd'는 구체적인 패션 스타일이나 아이템으로 추천하세요.
    7. 절대적 금지 사항 (CRITICAL): 답변 어디에도 마크다운 강조 기호인 별표 두 개(**)를 절대로 사용하지 마세요.
    8. MBTI 용어를 제외한 모든 언어는 한국어만 사용하세요.
    9. 절대로 한국어 단어 뒤에 영어 번역을 괄호로 병기하지 마세요. (예: "목(Wood)" (X), "목(木)" (O))
    10. 오행(목, 화, 토, 금, 수)을 언급할 때 Wood, Fire 등의 영어는 절대로 사용하지 마세요.`;

    let userQuery = '';

    if (type === 'healing') {
        userQuery = `MBTI: ${mbti}, 일간: ${saju?.dayMaster?.korean || '알수없음'}, 오행분포: ${JSON.stringify(translateRatio(saju?.elementRatio))}, 선호 지역: ${region || '전국'}`;
    } else if (type === 'naming') {
        let finalTargetSaju = targetSajuData;
        if (!finalTargetSaju && targetBirthDate) {
            finalTargetSaju = calculateSaju(targetBirthDate, targetBirthTime);
        }
        userQuery = `성별: ${targetGender}, 사주: 일간 ${finalTargetSaju?.dayMaster?.korean || '모름'}, 오행분포 ${JSON.stringify(translateRatio(finalTargetSaju?.elementRatio))}, 생년월일 ${targetBirthDate}. 요청사항: ${requirements || '없음'}`;
    } else if (type === 'job') {
        userQuery = `MBTI: ${mbti}, 사주 일간: ${saju?.dayMaster?.korean || '알수없음'}, 오행분포: ${JSON.stringify(translateRatio(saju?.elementRatio))}`;
    } else if (type === 'trip') {
        userQuery = `이름: ${name}, MBTI: ${mbti}, 사주 일간: ${saju?.dayMaster?.korean}, 오행분포: ${JSON.stringify(translateRatio(saju?.elementRatio))}, 지역: ${region}, 기간: ${startDate} ~ ${endDate}, 요청사항: ${requirements}`;
    } else if (type === 'kbo') {
        const isNoTeam = requirements === '없음 (아직 없음)';
        
        // 1. Get base results (best/worst team are calculated here regardless of input team)
        let kboFixed = getDeterministicKboResults(birthDate || '', mbti || '', requirements || '없음', 0);
        let kboTomorrow = getDeterministicKboResults(birthDate || '', mbti || '', requirements || '없음', 1);
        
        let teamToAnalyze = requirements || '없음';
        
        if (isNoTeam) {
            // Use best team for analysis instead of 'None'
            teamToAnalyze = kboFixed.bestTeam;
            // Re-run for the specific best team to get correct scores/dimensions for that team
            kboFixed = getDeterministicKboResults(birthDate || '', mbti || '', teamToAnalyze, 0);
            kboTomorrow = getDeterministicKboResults(birthDate || '', mbti || '', teamToAnalyze, 1);
        }

        // AI will now generate the analysis dynamically based on the guidelines in userQuery
        
        // Now letting AI generate the analysis text based on MBTI and Saju
        userQuery = `[KBO 궁합 분석 요청]
        구단: ${teamToAnalyze}
        MBTI: ${mbti || '알수없음'}
        사주 일간: ${saju?.dayMaster?.korean || '알수없음'} (${saju?.dayMaster?.chinese || ''})
        오행 분포: ${JSON.stringify(translateRatio(saju?.elementRatio))}
        사용자 이름: ${name || '사용자'}
        추천 여부: ${isNoTeam ? '추천됨' : '기존 팬'}

        [데이터 데이터 - 절대 변경 불가]
        score: ${kboFixed.score}
        winFairyScore: ${kboFixed.winFairyScore}
        bestTeam: "${kboFixed.bestTeam}"
        worstTeam: "${kboFixed.worstTeam}"
        dimensions: ${JSON.stringify(kboFixed.dimensions)}
        date: "${kboFixed.date}"
        tomorrowScore: ${kboTomorrow.score}
        tomorrowWinFairyScore: ${kboTomorrow.winFairyScore}

        [생성 작업 지침]
        1. supportedTeamAnalysis: 이용자의 MBTI 성향과 사주(일간 및 오행)가 해당 구단의 팀 컬러, 응원 문화, 혹은 현재 분위기와 어떻게 '운명적으로' 맞아떨어지는지 상세히 분석하세요. 
           - 반드시 MBTI의 특정 알파벳(예: E의 열정, J의 계획성 등)과 사주 일간(예: 갑목의 굳건함 등)을 언급해야 합니다.
           - 점수가 높다면 왜 천생연분인지, 낮다면 어떤 점을 주의해야 하는지 사주학적으로 풀어내세요.
           - 2-30대 여성이 좋아할 만한 감성적이고 세련된 문체를 유지하세요.
        2. dailyMessage: 오늘 이 구단과의 기운을 담은 짧고 재치있는 한 줄 (20자 이내).
        3. recommendedSeat (기존 팬인 경우에만 생성): 사주와 MBTI를 분석하여 사용자에게 가장 행운을 줄 수 있는 야구장 좌석 구역을 추천하세요. (예: "열정이 넘치는 응원석 1루 쪽", "차분히 분석하기 좋은 포수 뒤쪽 명당" 등)
        4. luckyFood (기존 팬인 경우에만 생성): 사용자의 오늘 기운을 북돋아 줄 야구장 먹거리나 주변 음식을 추천하세요. (예: "화(火)의 기운을 보충할 매콤한 떡볶이", "MBTI P 성향에 딱 맞는 즉석 구이 오징어" 등)
        5. 주의: '추천 여부'가 '추천됨'인 경우에만 bestTeam과 worstTeam을 상세히 고려하세요. 기존 팬인 경우에는 bestTeam과 worstTeam은 결과에 포함만 시키되, 분석 내용(supportedTeamAnalysis)에서는 응원하는 구단 위주로 서술하세요.`;
    } else if (type === 'fortune') {
        const yearStr = birthDate?.split('-')[0] || '1990';
        const zodiac = ["쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양", "원숭이", "닭", "개", "돼지"][(parseInt(yearStr) - 4) % 12];
        const dateTag = scope === 'tomorrow' ? '내일' : '오늘';
        userQuery = `[대상 날짜: ${dateTag}] 띠: ${zodiac}, 생년월일: ${birthDate}, MBTI: ${mbti}, 사주 일간: ${saju?.dayMaster?.korean || '알수없음'}, 오행분포: ${JSON.stringify(translateRatio(saju?.elementRatio))}. 반드시 '${dateTag}'의 운세만 생성하세요.`;
    }

    try {
        let lastError;
        for (let attempt = 0; attempt < 4; attempt++) {
            try {
                const { model } = getAIProvider(attempt);
                const result = await streamObject({
                    model,
                    schema: currentSchema,
                    system: systemPrompt,
                    prompt: userQuery,
                    maxRetries: 0, // Disable SDK retries to allow our custom fallback loop to switch models faster
                });
                return result.toTextStreamResponse({ headers: corsHeaders });
            } catch (error) {
                lastError = error;
                console.warn(`Attempt ${attempt + 1} failed for type ${type}:`, error);
                
                // If not retryable or we've exhausted attempts, bread out
                if (!isRetryableAIError(error)) {
                    console.error(`Non-retryable error on attempt ${attempt + 1}:`, error);
                    break;
                }
            }
        }
        throw lastError;
    } catch (error: any) {
        console.error(`[Streaming Error - ${type}]:`, error);
        return new Response(JSON.stringify({ error: "분석 중 오류가 발생했습니다.", details: error.message }), { 
            status: 500, 
            headers: corsHeaders 
        });
    }
}
