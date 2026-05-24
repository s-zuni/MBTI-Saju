import { z } from 'zod';

// MbtiSaju Core Analysis
export const analysisSchema = z.object({
    reportTitle: z.string(),
    keywords: z.string(),
    fusionNickname: z.string(),
    nature: z.object({
        dayPillarSummary: z.string(),
        dayMasterAnalysis: z.string(),
        dayBranchAnalysis: z.string(),
        monthBranchAnalysis: z.string()
    }),
    fiveElements: z.object({
        elements: z.array(z.object({
            element: z.string(),
            count: z.number(),
            interpretation: z.string()
        }))
    }),
    persona: z.object({
        mbtiNickname: z.string(),
        dominantFunction: z.string(),
        auxiliaryFunction: z.string()
    }),
    deepIntegration: z.object({
        integrationPoints: z.array(z.object({
            subtitle: z.string(),
            content: z.string()
        }))
    })
});

// MbtiSaju Yearly Fortune
export const yearlyFortuneSchema = z.object({
    yearlyFortune: z.object({
        theme: z.string(),
        overview: z.string(),
        keywords: z.array(z.string())
    }),
    monthlyFortune: z.object({
        months: z.array(z.object({
            period: z.string(),
            energy: z.string(),
            guide: z.string()
        }))
    })
});

// MbtiSaju Strategies
export const strategySchema = z.object({
    fieldStrategies: z.object({
        career: z.object({ subtitle: z.string(), analysis: z.string(), advice: z.string() }),
        love: z.object({ subtitle: z.string(), analysis: z.string(), advice: z.string() }),
        wealth: z.object({ subtitle: z.string(), analysis: z.string(), advice: z.string() })
    }),
    warnings: z.object({
        watchOut: z.array(z.object({ title: z.string(), description: z.string() })),
        avoid: z.array(z.object({ title: z.string(), description: z.string() }))
    }),
    solution: z.string()
});

// Full Consolidated Analysis
export const fullAnalysisSchema = z.intersection(
    z.intersection(analysisSchema, yearlyFortuneSchema),
    strategySchema
);

// Quick Fortune (Daily/Tomorrow)
const fortuneItemSchema = z.object({
    fortune: z.string(),
    lucky: z.object({
        color: z.string(),
        number: z.string(),
        direction: z.string()
    }),
    mission: z.string().optional(),
    charm_stats: z.array(z.object({
        label: z.string(),
        value: z.number()
    })).optional(),
    lucky_ootd: z.string().optional()
});

export const dailyFortuneSchema = z.object({
    today: fortuneItemSchema,
    today_date: z.string().describe("오늘 날짜 (YYYY-MM-DD)"),
    tomorrow: fortuneItemSchema,
    tomorrow_date: z.string().describe("내일 날짜 (YYYY-MM-DD)")
});

export const singleDayFortuneSchema = z.object({
    fortune: fortuneItemSchema,
    date: z.string().describe("날짜 (YYYY-MM-DD)")
});

// Special Analysis: Trip
export const tripSchema = z.object({
    concept: z.string().describe("이번 여행의 메인 컨셉 (예: '갑목과 INFP가 만나는 감성 힐링 여행')").optional(),
    places: z.array(z.object({
        name: z.string().describe("여행지 이름 (구체적인 장소나 도시)"),
        reason: z.string().describe("사주와 MBTI 기반 추천 이유"),
        activity: z.string().describe("이곳에서 꼭 해야 할 활동"),
        photoSpot: z.string().describe("인생샷 포토스팟 및 사진 꿀팁").optional(),
        food: z.string().describe("행운을 부르는 추천 맛집/메뉴").optional()
    })),
    itinerary: z.array(z.object({
        day: z.string(),
        schedule: z.array(z.string())
    })),
    companion: z.string().describe("함께 가면 시너지가 나는 MBTI 또는 사주 일간 추천").optional(),
    luckyItem: z.string().describe("여행에 챙겨가면 좋은 행운의 아이템 (OOTD, 소품 등)").optional(),
    summary: z.string(),
    bestTime: z.string(),
    tip: z.string()
});

// Special Analysis: KBO Baseball
export const kboSchema = z.object({
    score: z.number(),
    supportedTeamAnalysis: z.string(),
    winFairyScore: z.number().describe("나의 기운과 구장 기운의 합을 분석한 승리 요정 지수 (0-100)"),
    bestTeam: z.string(),
    worstTeam: z.string(),
    dimensions: z.array(z.object({
        label: z.string(),
        value: z.number()
    })),
    date: z.string().describe("오늘 날짜 (YYYY-MM-DD)"),
    dailyMessage: z.string().describe("오늘의 KBO 운세 한 줄 메시지 (예: '오늘은 직관 에너지가 최고조! 직관 가도 OK')"),
    recommendedSeat: z.string().describe("오늘의 직관 자리 추천 (사주와 MBTI 바탕)"),
    luckyFood: z.string().describe("오늘, 행운의 직관음식 (사주와 MBTI 바탕)"),
    tomorrowScore: z.number().describe("내일 예정 궁합 점수 (0-100)"),
    tomorrowWinFairyScore: z.number().describe("내일 예정 승리 요정 지수 (0-100)")
});

// Special Analysis: Jamidusu
export const jamidusuSchema = z.object({
    main_character: z.string().describe("나의 메인 수호별 캐릭터 (예: 거침없는 팩폭러, 칠살성)"),
    love_style: z.string().describe("연애 스타일 분석 (부처궁 해석)"),
    wealth_style: z.string().describe("재물 및 소비 성향 분석 (재백궁 해석)"),
    charm_points: z.array(z.string()).length(3).describe("나의 매력 포인트 3가지"),
    summary: z.string().describe("한 줄 요약 메세지")
});

// Special Analysis: Compatibility
export const compatibilitySchema = z.object({
    score: z.number().optional(),
    summary: z.string(),
    keywords: z.array(z.string()),
    details: z.object({
        ideal_mbti: z.string(),
        ideal_saju: z.string(),
        overall_compatibility: z.string()
    })
});

// Tarot
export const tarotSchema = z.object({
    cardReadings: z.array(z.object({
        cardName: z.string(),
        interpretation: z.string()
    })),
    overallReading: z.string(),
    advice: z.string()
});

// Daily Relationship Chemistry
export const relationshipSchema = z.object({
    results: z.array(z.object({
        id: z.string(),
        score: z.number(),
        msg: z.string()
    }))
});
