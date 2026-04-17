import { createGoogleGenerativeAI } from '@ai-sdk/google';
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

function getScoreComment(score: number): string {
    if (score >= 90) return '환상의 짝꿍';
    if (score >= 80) return '찰떡 궁합';
    if (score >= 70) return '좋은 인연';
    if (score >= 60) return '나쁘지 않은 사이';
    if (score >= 50) return '평범한 관계';
    return '인연이 약함';
}

function generateAnalysisText(mbti: string, dayMaster: string, team: string, score: number, winFairyScore: number, bestTeam: string, worstTeam: string): string {
    const scoreComment = getScoreComment(score);
    const winComment = winFairyScore >= 80 ? '직관 갈 때마다 팀 승리를 부르는 강력한 기운을 가지고 있어요' 
        : winFairyScore >= 65 ? '직관 가면 좋은 기운이 흐르는 편이에요'
        : winFairyScore >= 50 ? '직관 가면 무승부 정도는 기대해볼 수 있어요'
        : '지금은 직관보다 집관이 더 잘 맞는 시기예요';

    const mbtiComment = mbti.includes('E') 
        ? '외향적인 에너지가 구장의 열기와 시너지를 이뤄요'
        : '내향적인 집중력이 경기에 몰입하는 힘을 만들어줘요';

    return `${team}과의 궁합은 ${score}점으로 「${scoreComment}」 수준이에요.\n\n${mbtiComment}. 일간 ${dayMaster || '?'}의 기운과 구단의 팀 컬러가 만나는 지점에서 오늘의 점수가 결정됐어요.\n\n승리 요정 지수는 ${winFairyScore}점 — ${winComment}.\n\n참고로 현재 기운상 가장 잘 맞는 구단은 ${bestTeam}, 가장 엇갈리는 구단은 ${worstTeam}이에요.`;
}

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
    const winFairyScore = getDeterministicValue(mainSeed + currentTeam, 777, 30, 95);

    // 4. Dimensions
    const dimensionLabels = ['열정 수치', '직관 에너지', '응원 화력', '승리 행운', '팀 로열티'];
    const dimensions = dimensionLabels.map((label, i) => ({
        label,
        value: getDeterministicValue(mainSeed + currentTeam, i + 999, 40, 100)
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
    9. 절대로 한국어 단어 뒤에 영어 번역을 괄호로 병기하지 마세요.`;

    let userQuery = '';

    if (type === 'healing') {
        userQuery = `MBTI: ${mbti}, 일간: ${saju?.dayMaster?.korean || '알수없음'}, 오행분포: ${JSON.stringify(saju?.elementRatio || {})}, 선호 지역: ${region || '전국'}`;
    } else if (type === 'naming') {
        let finalTargetSaju = targetSajuData;
        if (!finalTargetSaju && targetBirthDate) {
            finalTargetSaju = calculateSaju(targetBirthDate, targetBirthTime);
        }
        userQuery = `성별: ${targetGender}, 사주: 일간 ${finalTargetSaju?.dayMaster?.korean || '모름'}, 오행분포 ${JSON.stringify(finalTargetSaju?.elementRatio || {})}, 생년월일 ${targetBirthDate}. 요청사항: ${requirements || '없음'}`;
    } else if (type === 'job') {
        userQuery = `MBTI: ${mbti}, 사주 일간: ${saju?.dayMaster?.korean || '알수없음'}`;
    } else if (type === 'trip') {
        userQuery = `이름: ${name}, MBTI: ${mbti}, 사주 일간: ${saju?.dayMaster?.korean}, 지역: ${region}, 기간: ${startDate} ~ ${endDate}, 요청사항: ${requirements}`;
    } else if (type === 'kbo') {
        const kboFixed = getDeterministicKboResults(birthDate || '', mbti || '', requirements || '없음', 0);
        const kboTomorrow = getDeterministicKboResults(birthDate || '', mbti || '', requirements || '없음', 1);
        const analysisText = generateAnalysisText(
            mbti || '알수없음',
            saju?.dayMaster?.korean || '알수없음',
            requirements || '없음',
            kboFixed.score,
            kboFixed.winFairyScore,
            kboFixed.bestTeam,
            kboFixed.worstTeam
        );
        
        // AI가 생성할 것은 dailyMessage (한 줄) 뿐. 나머지는 모두 서버에서 즉시 조합.
        userQuery = `구단: ${requirements || '없음'}, MBTI: ${mbti || '알수없음'}, 사주 일간: ${saju?.dayMaster?.korean || '알수없음'}, 오늘 궁합 점수: ${kboFixed.score}점, 승요지수: ${kboFixed.winFairyScore}점.

        [필수 준수 값 - 절대 변경 불가]
        score: ${kboFixed.score}
        supportedTeamAnalysis: "${analysisText.replace(/"/g, "'").replace(/\n/g, '\\n')}"
        winFairyScore: ${kboFixed.winFairyScore}
        bestTeam: "${kboFixed.bestTeam}"
        worstTeam: "${kboFixed.worstTeam}"
        dimensions: ${JSON.stringify(kboFixed.dimensions)}
        date: "${kboFixed.date}"
        tomorrowScore: ${kboTomorrow.score}
        tomorrowWinFairyScore: ${kboTomorrow.winFairyScore}

        [유일한 생성 작업]
        dailyMessage 필드 하나만 창의적으로 작성하세요: 오늘 이 구단과의 기운을 담은 짧고 재치있는 한 줄 (20자 이내). 예: '오늘은 직관 에너지 최고조! 경기장 가면 무조건 승리'`;
    } else if (type === 'fortune') {
        const yearStr = birthDate?.split('-')[0] || '1990';
        const zodiac = ["쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양", "원숭이", "닭", "개", "돼지"][(parseInt(yearStr) - 4) % 12];
        const dateTag = scope === 'tomorrow' ? '내일' : '오늘';
        userQuery = `[대상 날짜: ${dateTag}] 띠: ${zodiac}, 생년월일: ${birthDate}, MBTI: ${mbti}, 사주 일간: ${saju?.dayMaster?.korean || '알수없음'}. 반드시 '${dateTag}'의 운세만 생성하세요.`;
    }

    try {
        let lastError;
        for (let attempt = 0; attempt < 4; attempt++) {
            try {
                const { model, name } = getAIProvider(attempt);
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
                console.warn(`Attempt ${attempt + 1} (${getAIProvider(attempt).name}) failed for type ${type}:`, error);
                
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
