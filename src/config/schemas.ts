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
        sajuBaseAnalysis: z.string(),
        mbtiIntegration: z.string(),
        synergyPoints: z.array(z.object({
            subtitle: z.string(),
            content: z.string()
        }))
    }),
    lifeGuideline: z.object({
        lightAndShadow: z.object({
            light: z.string(),
            shadow: z.string(),
            solution: z.string()
        }),
        luckyBooster: z.object({
            luckyColor: z.string(),
            luckyItem: z.string(),
            luckyPlace: z.string(),
            dailyRoutine: z.string()
        })
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
    mission: z.string().describe("오늘의 미션 (해당없을시 빈 문자열)"),
    charm_stats: z.array(z.object({
        label: z.string(),
        value: z.number()
    })).describe("매력 스탯 (해당없을시 빈 배열 반환)"),
    lucky_ootd: z.string().describe("행운의 ootd (해당없을시 빈 문자열)")
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
    concept: z.string().describe("이번 여행의 메인 컨셉 (예: '갑목과 INFP가 만나는 감성 힐링 여행'. 해당없을시 빈문자열)"),
    places: z.array(z.object({
        name: z.string().describe("여행지 이름 (구체적인 장소나 도시)"),
        reason: z.string().describe("사주와 MBTI 기반 추천 이유"),
        activity: z.string().describe("이곳에서 꼭 해야 할 활동"),
        photoSpot: z.string().describe("인생샷 포토스팟 및 사진 꿀팁 (해당없을시 빈문자열)"),
        food: z.string().describe("행운을 부르는 추천 맛집/메뉴 (해당없을시 빈문자열)")
    })),
    itinerary: z.array(z.object({
        day: z.string(),
        schedule: z.array(z.string())
    })),
    companion: z.string().describe("함께 가면 시너지가 나는 MBTI 또는 사주 일간 추천 (해당없을시 빈문자열)"),
    luckyItem: z.string().describe("여행에 챙겨가면 좋은 행운의 아이템 (OOTD, 소품 등) (해당없을시 빈문자열)"),
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
    main_character: z.string().describe("나의 메인 자미두수 캐릭터 (예: 거침없는 팩폭러, 칠살성)"),
    destiny_palace: z.string().describe("타고난 본성 (명궁) 분석"),
    career_palace: z.string().describe("나의 재능과 성공 (관록궁) 분석"),
    wealth_style: z.string().describe("재물운 (재백궁) 분석"),
    love_style: z.string().describe("연애 스타일 (부처궁) 분석"),
    lucky_items: z.array(z.string()).describe("나를 돕는 길성 & 행운 요소 3가지"),
    summary: z.string().describe("전체 명반에 대한 총평 및 조언")
});

// Special Analysis: Compatibility
export const compatibilitySchema = z.object({
    score: z.number().describe("점수 (해당없을시 0)"),
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

// 재물 사주 (Gold/Wealth Fortune)
export const goldSchema = z.object({
    wealthType: z.string(),
    overview: z.string(),
    sajuAnalysis: z.object({
        dayMasterWealth: z.string().describe("일간과 재성의 밸런스: 사주를 정밀 분석하여 사업/재물 운명과 그릇을 300자 이상으로 구체적 서술"),
        wealthStructure: z.string().describe("재물 원국 구조 (격국): 발생 가능한 구체적인 리스크/기회 예시를 들어 300자 이상으로 서술"),
        elementBalance: z.string().describe("오행 균형과 재물 공급력: '~~이 충분하여 ~~하나 ~~이 부족해 ~~한 일이 발생할 수 있다. 따라서 ~~가 필요하며 실행 예시는 ~~이다' 포맷으로 실천 요령까지 서술"),
    }),
    timingAnalysis: z.object({
        currentYear: z.string().describe("올해 (2026년) 대운/세운 흐름: 명리학적 원인과 구체적 액션 플랜을 1.5배 이상 분량으로 서술"),
        nextYear: z.string().describe("내년 (2027년) 대운/세운 흐름: 명리학적 원인과 구체적 기회/전략을 1.5배 이상 분량으로 서술"),
        peakPeriod: z.string().describe("재물 피크 시기: 최고 명리 기운 시점과 모델 확장/투자 승부 조언"),
        cautionPeriod: z.string().describe("주의가 필요한 위험기: 리스크 방지 행동강령 및 자산 방어 솔루션"),
    }),
    fieldAnalysis: z.string().describe("해당없을시 빈 문자열"),
    comparison: z.string().describe("해당없을시 빈 문자열"),
    mbtiAdvice: z.object({
        strength: z.string().describe("MBTI 강점 발휘: 사용자의 MBTI가 재물/사업 운에서 발휘되는 구체적 상황과 예시를 2배 이상 분량으로 서술"),
        weakness: z.string().describe("MBTI 약점 제어: 재물 탕진/오판을 유발하는 MBTI 약점과 제어법을 구체적 예시와 함께 서술"),
        actionPlan: z.string().describe("MBTI 실천 계획: 사주 기운과 MBTI를 결합한 구체적 실천 행동 리스트"),
    }),
    score: z.number(),
    luckyElements: z.array(z.string()),
    verdict: z.string(),
    mbtiSajuWealthReport: z.string().describe("MBTI-사주 뼈 때리는 재물 보고서 (마크다운)"),
});

// 연애 사주 (Love Saju)
export const loveSajuSchema = z.object({
    analysisType: z.string(),
    overallScore: z.number(),
    summary: z.string().describe("두 사람의 궁합 핵심을 총평하는 350자 이상의 정밀 요약 서술"),
    sajuCompatibility: z.object({
        dayMasterRelation: z.string().describe("일간 합충 정밀 분석: 잘 맞는 부분과 안 맞는 부분을 명리학적 이유를 들어 냉철하게 500자 이상(3단락 구조)으로 정밀 진단"),
        fiveElementHarmony: z.string().describe("오행 조화 분석: 오행의 과다/부족 및 상생 시너지와 상극 마찰 요인을 500자 이상(3단락 구조)으로 정밀 진단"),
        specialStars: z.string().describe("특수 신살 및 기운: 도화, 홍염, 원진, 귀문 등 신살의 영향과 액땜 실천법을 500자 이상(3단락 구조)으로 정밀 분석"),
        hiddenConflicts: z.string().describe("내재된 잠재 갈등: 겉으로 드러나지 않는 사주/성격적 마찰과 위기 발생 모멘트를 500자 이상(3단락 구조)으로 뼈 때리게 분석"),
    }),
    dimensions: z.array(z.object({
        label: z.string(),
        value: z.number(),
        description: z.string(),
    })),
    timingForecast: z.object({
        sixMonths: z.string().describe("6개월 후: 사주 운세 흐름 정보(200자) + 구체적 행동강령(200자)을 결합하여 총 400자 이상 서술"),
        oneYear: z.string().describe("1년 후: 사주 운세 흐름 정보(200자) + 구체적 행동강령(200자)을 결합하여 총 400자 이상 서술"),
        threeYears: z.string().describe("3년 후: 장기적 사주 운세 흐름(200자) + 구체적 행동강령(200자)을 결합하여 총 400자 이상 서술"),
    }),
    mbtiStrategy: z.object({
        myApproach: z.string().describe("나의 관계 지향적 접근법: 내 MBTI 약점/주의점을 상대방 MBTI와 긴밀히 연계하여 400자 이상으로 뼈 때리게 서술"),
        partnerApproach: z.string().describe("상대를 끌어당기는 공략법: 상대방 MBTI 성향과 사주 기운을 고려해 실전 데이트/소통 냉철한 조언을 400자 이상 서술"),
        conflictResolution: z.string().describe("갈등 임계점 해소법: 사주와 MBTI 궁합을 종합 분석한 갈등 극복 및 즉각 적용 가능한 실전 솔루션을 400자 이상 서술"),
    }),
    specialSection: z.string().describe("마음 포착 및 승부 솔루션: '향후 N개월 안에 승부를 봐야 합니다' 등 사주 기운과 사실적 타임라인을 선제시한 후 500자 이상으로 종합 제언 및 승부 지침 서술"),
    verdict: z.string(),
    keywords: z.array(z.string()),
});

