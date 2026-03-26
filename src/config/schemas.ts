import { z } from 'zod';

export const mbtiSajuSchema = z.object({
    reportTitle: z.string(),
    summary: z.string(),
    mainAnalysis: z.object({
        character: z.string(),
        fate: z.string()
    }),
    elements: z.array(z.object({
        element: z.string(),
        score: z.number(),
        description: z.string()
    })),
    detailedAnalysis: z.object({
        love: z.string(),
        career: z.string(),
        wealth: z.string()
    }),
    luckyItems: z.object({
        colors: z.array(z.string()),
        numbers: z.array(z.number()),
        directions: z.array(z.string())
    })
});

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

export const jobSchema = z.object({
    job_analysis: z.array(z.object({
        job: z.string(),
        compatibility: z.string(),
        reason: z.string(),
        strategy: z.string()
    })),
    summary: z.string()
});

export const namingSchema = z.object({
    names: z.array(z.object({
        hangul: z.string(),
        hanja: z.string(),
        meaning: z.string(),
        saju_compatibility: z.string()
    })),
    summary: z.string()
});

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

export const fortuneSchema = z.object({
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

export const tarotSchema = z.object({
    cardReadings: z.array(z.object({
        cardName: z.string(),
        interpretation: z.string()
    })),
    overallReading: z.string(),
    advice: z.string()
});
