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

// Special Analysis: Trip
export const namingSchema = z.object({
    names: z.array(z.object({
        hangul: z.string(),
        hanja: z.string(),
        meaning: z.string(),
        saju_compatibility: z.string()
    })),
    summary: z.string()
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
