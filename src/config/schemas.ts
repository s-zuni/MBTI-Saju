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
export const dailyFortuneSchema = z.object({
    today: z.object({
        fortune: z.string(),
        lucky: z.object({
            color: z.string(),
            number: z.string(),
            direction: z.string()
        }),
        mission: z.string().optional()
    }),
    tomorrow: z.object({
        fortune: z.string(),
        lucky: z.object({
            color: z.string(),
            number: z.string(),
            direction: z.string()
        }),
        mission: z.string().optional()
    })
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
    bestTeam: z.string(),
    worstTeam: z.string(),
    dimensions: z.array(z.object({
        label: z.string(),
        value: z.number()
    }))
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
    score: z.number(),
    summary: z.string(),
    keywords: z.array(z.string()),
    details: z.object({
        mbti_harmony: z.string(),
        saju_harmony: z.string(),
        synergy: z.string(),
        advice: z.string()
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
