import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamObject } from 'ai';
import { z } from 'zod';
import { calculateSaju } from './_utils/saju';
import { corsHeaders, handleCors } from './_utils/cors';
import { PRIMARY_MODEL, FALLBACK_MODEL } from './_utils/model';

const luckySchema = z.object({
    color: z.string().describe("행운의 색상"),
    number: z.string().describe("행운의 숫자"),
    direction: z.string().describe("행운의 방향")
});

const fortuneItemSchema = z.object({
    fortune: z.string().describe("상세 운세 분석 내용 (반드시 줄바꿈(\\n)을 2-3회 사용하여 가독성을 높일 것)"),
    lucky: luckySchema,
    mission: z.string().optional().describe("오늘의 미션 (2-30대 여성이 좋아할 만한 재치 있고 센스 있는 미션/조언)"),
    charm_stats: z.array(z.object({
        label: z.string().describe("매력 지수 항목 (예: 매력, 에너지, 연애운, 금전운 등)"),
        value: z.number().describe("수치 (0-100)")
    })).length(5).describe("오늘의 5대 매력/운세 스탯"),
    lucky_ootd: z.string().describe("오늘의 추천 OOTD 스타일 (예: '청량한 크롭탑과 와이드 데님 팬츠')")
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
        supportedTeamAnalysis: z.string().describe("궁합 분석을 단호하고 친근한 어조로 약 400-500자 내외로 냉정하게 평가. 반드시 가독성을 위해 단락을 나누고 \\n\\n을 자주 사용하여 줄바꿈을 명확히 할 것."),
        winFairyScore: z.number().describe("사용자의 기운(사주, MBTI)과 해당 구단 홈 구장의 기운(위치, 역사 등)을 분석해 도출한 승리 요정 지수 (0-100)"),
        bestTeam: z.string().describe("나와 가장 궁합이 잘 맞는 KBO 구단"),
        worstTeam: z.string().describe("나와 가장 궁합이 안 맞는 KBO 구단"),
        dimensions: z.array(z.object({
            label: z.string().describe("평가 척도 이름"),
            value: z.number().describe("해당 척도 점수 (0-100)")
        })).length(5)
    }),
    fortune: z.object({
        today: fortuneItemSchema,
        today_date: z.string().describe("오늘 날짜 (YYYY-MM-DD)"),
        tomorrow: fortuneItemSchema,
        tomorrow_date: z.string().describe("내일 날짜 (YYYY-MM-DD)")
    })
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

function getDeterministicKboResults(birthDate: string, mbti: string, currentTeam: string) {
    const mainSeed = `${birthDate}-${mbti}`;
    
    // 1. Team rankings based on mainSeed
    const teamScores = KBO_TEAMS.map(team => ({
        team,
        score: getDeterministicValue(mainSeed, team.length + team.charCodeAt(0), 40, 98)
    })).sort((a, b) => b.score - a.score);

    const bestTeam = teamScores[0]?.team || KBO_TEAMS[0];
    const worstTeam = teamScores[teamScores.length - 1]?.team || KBO_TEAMS[KBO_TEAMS.length - 1];

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
    const currentSchema = schemas[type as string];

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

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.REACT_APP_GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!GEMINI_API_KEY) {
        return new Response(JSON.stringify({ error: 'Missing API Key' }), { 
            status: 500, 
            headers: corsHeaders 
        });
    }

    let saju = sajuData;
    if (!saju && birthDate) {
        try { saju = calculateSaju(birthDate, birthTime); } catch (e) { console.error('Saju error:', e); }
    }

    let systemPrompt = `당신은 20대 여성의 감성과 니즈를 완벽하게 파악하고 있는 '트렌디 웰니스 & 라이프 컨설턴트'입니다.
    
    [핵심 규칙]
    1. 모든 답변은 20대 여성이 흥미를 느낄 수 있도록 친근하고 감각적인 어투를 사용하세요 (반말과 존댓말 중 친근한 톤 유지).
    2. 답변 내용을 단순한 줄글로 나열하지 말고, 반드시 '글머리표(-)'와 '줄바꿈(\\n)'을 사용하여 시각적 가독성을 극대화하세요.
    3. '오늘의 미션'은 소소하지만 확실한 행복(소확행)이나, 인스타 인증하기 좋은 챌린지 형태로 제안하세요.
    4. 'charm_stats'는 오늘 사용자의 기운이 어디에 집중되어 있는지 5가지 항목으로 분석하세요 (예: 도화살 에너지, 인싸력, 귀여움 등).
    5. 'lucky_ootd'는 행운의 컬러를 활용하면서도 현재 10-20대 사이에서 유행하는 구체적인 패션 스타일이나 아이템으로 추천하세요.
    6. 절대적 금지 사항 (CRITICAL): 답변 어디에도 마크다운 강조 기호인 별표 두 개(**)를 절대로 사용하지 마세요.
    7. MBTI 용어를 제외한 모든 언어는 한국어만 사용하세요.
    8. 절대로 한국어 단어 뒤에 영어 번역을 괄호로 병기하지 마세요.`;

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
        const kboFixed = getDeterministicKboResults(birthDate || '', mbti || '', requirements || '없음');
        
        userQuery = `이름: ${name || '사용자'}, MBTI: ${mbti || '알수없음'}, 사주 일간: ${saju?.dayMaster?.korean || '알수없음'}, 오행분포: ${JSON.stringify(saju?.elementRatio || {})}.
        현재 응원 구단: ${requirements || '없음'}.
        
        [중요: 결과 데이터 필수 준수]
        아래의 데이터는 사주-MBTI 동기화 엔진을 통해 이미 확정된 결과입니다. JSON 응답 시 반드시 이 값을 사용하세요:
        - 궁합 점수(score): ${kboFixed.score}
        - 승리 요정 지수(winFairyScore): ${kboFixed.winFairyScore}
        - 최강 궁합 구단(bestTeam): ${kboFixed.bestTeam}
        - 최악 궁합 구단(worstTeam): ${kboFixed.worstTeam}
        - 성향 파라미터(dimensions): ${JSON.stringify(kboFixed.dimensions)}

        [수행 작업]
        1. 위에서 확정된 결과를 바탕으로, 왜 이런 점수와 구단 매칭 결과가 나왔는지 사주와 MBTI 관점에서 논리적으로(때로는 팩트 폭격으로) 상세히 분석하세요. 
        2. 가독성을 위해 반드시 3~4개의 단락으로 나누고, 단락 사이에는 \\n\\n을 사용하여 줄바꿈을 확실히 하세요. 
        3. 전체 내용은 공백 포함 400-500자 내외여야 합니다.
        4. 절대로 한국어 단어 뒤에 영어 번역을 괄호로 병기하지 마세요.`;
    } else if (type === 'fortune') {
        const yearStr = birthDate?.split('-')[0] || '1990';
        const zodiac = ["쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양", "원숭이", "닭", "개", "돼지"][(parseInt(yearStr) - 4) % 12];
        userQuery = `띠: ${zodiac}, 생년월일: ${birthDate}, MBTI: ${mbti}, 사주 일간: ${saju?.dayMaster?.korean || '알수없음'}`;
    }

    const google = createGoogleGenerativeAI({ apiKey: GEMINI_API_KEY });

    try {
        let result;
        try {
            // Primary
            result = await streamObject({
                model: google(PRIMARY_MODEL),
                schema: currentSchema,
                system: systemPrompt,
                prompt: userQuery,
            });
        } catch (error) {
            console.warn(`Primary model failed for type ${type}, falling back to ${FALLBACK_MODEL}:`, error);
            // Fallback
            result = await streamObject({
                model: google(FALLBACK_MODEL),
                schema: currentSchema,
                system: systemPrompt,
                prompt: userQuery,
            });
        }

        return result.toTextStreamResponse({ headers: corsHeaders });
    } catch (error: any) {
        console.error(`[Streaming Error - ${type}]:`, error);
        return new Response(JSON.stringify({ error: "분석 중 오류가 발생했습니다.", details: error.message }), { 
            status: 500, 
            headers: corsHeaders 
        });
    }
}
