import { z } from 'zod';

// MbtiSaju Core Analysis
export const analysisSchema = z.object({
    reportTitle: z.string().describe("리포트 전체를 관통하는 묵직하고 인상적인 제목 한 문장"),
    keywords: z.string().describe("핵심 키워드 5개 쉼표 구분 (예: '외유내강, 2026 전환기, 재물 누수 주의, 실전 결단, 내면 균형')"),
    fusionNickname: z.string().describe("내담자의 사주 일주/일간과 성향을 결합한 상징적 호칭"),
    nature: z.object({
        dayPillarSummary: z.string().describe("일주(日柱)가 말해주는 타고난 삶의 기질과 핵심 서사를 200자 이상으로 구체적 서술"),
        dayMasterAnalysis: z.string().describe("일간(日干)의 본질이 직장·관계·선택의 순간에 어떻게 발현되는지 냉정한 강점과 맹점을 포함해 250~350자(2문단, \\n\\n)로 서술"),
        dayBranchAnalysis: z.string().describe("일지(日支)가 보여주는 속마음, 정서적 안정 조건, 친밀한 관계에서 반복되는 패턴을 250~350자(2문단, \\n\\n)로 서술"),
        monthBranchAnalysis: z.string().describe("월지(月支)가 규정하는 사회적 무대, 돈이 붙는 환경, 조직/독립 적합성을 250~350자(2문단, \\n\\n)로 서술")
    }),
    fiveElements: z.object({
        summary: z.string().describe("오행(목화토금수)의 편중과 결핍이 실제 체력, 감정 기복, 일의 성패에 미치는 영향을 250~350자(2문단)로 종합 진단"),
        elements: z.array(z.object({
            element: z.string().describe("오행 이름 (예: 목(木), 화(火), 토(土), 금(金), 수(水))"),
            count: z.number().describe("사주 원국 내 해당 오행 개수"),
            interpretation: z.string().describe("해당 오행의 많고 적음이 현실에서 만드는 성향과 보완 방향 (130~180자)")
        }))
    }),
    persona: z.object({
        mbtiNickname: z.string().describe("성향과 기질이 결합된 행동 페르소나 한 줄 명칭 (예: '속으로 판을 다 계산하고 움직이는 현실 전략가'. MBTI 미입력 시에도 사주 기질로 반드시 생생한 명칭을 지을 것. 절대 '정보 없음'·'해당 없음'·'미입력' 금지)"),
        dominantFunction: z.string().describe("겉으로 드러나는 핵심 행동 에너지와 문제 해결 방식 (MBTI 미입력 시 사주 기질 기준, 250~320자, 2문단)"),
        auxiliaryFunction: z.string().describe("타인과의 관계 및 압박 상황에서 무의식적으로 작동하는 내면 패턴과 현실 조언 (250~320자, 2문단)")
    }),
    deepIntegration: z.object({
        sajuBaseAnalysis: z.string().describe("사주 천간과 지지의 상호작용이 만드는 근본 기운의 흐름과 현실에서 반복되는 장면을 400~500자(2~3문단, \\n\\n)로 심층 해석"),
        mbtiIntegration: z.string().describe("사주 기운이 실제 성향·사고방식(MBTI 또는 기질)과 맞물려 시너지를 내는 순간과 반대로 스스로 발목을 잡는 지점을 400~500자(2~3문단, \\n\\n)로 냉철하게 분석"),
        synergyPoints: z.array(z.object({
            subtitle: z.string().describe("시너지 포인트 제목 (이모지 금지)"),
            content: z.string().describe("기질과 사주 기운이 결합해 성과를 내는 구체적 상황과 활용 전략 (220~280자)")
        })).describe("핵심 시너지 포인트 3가지")
    }),
    lifeGuideline: z.object({
        lightAndShadow: z.object({
            light: z.string().describe("기운이 건강하게 뻗을 때 발휘되는 압도적 강점과 주변에 주는 긍정적 영향 (350~450자, 2~3문단)"),
            shadow: z.string().describe("스트레스·조급함·방어기제가 올라올 때 나타나는 냉정한 그림자 패턴과 후회하기 쉬운 실수 (350~450자, 2~3문단)"),
            solution: z.string().describe("그림자를 제어하고 본래 강점을 되찾는 구체적 행동 해법과 스스로를 너무 몰아붙이지 않도록 다독이는 따뜻한 조언 (400~500자, 3문단)")
        }),
        luckyBooster: z.object({
            luckyColor: z.string().describe("부족한 오행을 채우는 색상과 일상 활용 팁 (40~70자)"),
            luckyItem: z.string().describe("몸에 지니거나 책상 옆에 두면 중심을 잡아주는 소품 (40~70자)"),
            luckyPlace: z.string().describe("기운이 막힐 때 생각을 정리하고 에너지를 보충할 공간 (40~70자)"),
            dailyRoutine: z.string().describe("감정 소모와 실행력 저하를 막는 구체적 하루 루틴 (60~100자)")
        })
    })
});

// MbtiSaju Yearly Fortune
export const yearlyFortuneSchema = z.object({
    yearlyFortune: z.object({
        theme: z.string().describe("올해 2026년 병오년(丙午年)의 핵심 흐름을 짚는 선명한 테마 한 문장 (2023/2024/2025년 언급 금지)"),
        overview: z.string().describe("올해 2026년 병오년(丙午年) 기준 전체 운세 흐름 총론 (반드시 750~1000자, 4문단 \\n\\n 구분). (1) 2026년 세운이 원국에 들어오며 생기는 냉정한 변화와 현실 예측, (2) 상반기와 하반기 전환점·재물/관계 변수, (3) 흔들릴 때 마음을 다잡는 진심 어린 따뜻한 조언 포함. 절대로 2023년이나 2024년을 올해로 적지 말 것."),
        keywords: z.array(z.string()).describe("2026년 핵심 운세 키워드 4~5개 (해시태그용 짧은 단어)")
    }),
    monthlyFortune: z.object({
        months: z.array(z.object({
            period: z.string().describe("2026년 시기 구분 (예: '2026년 1~2월', '3~4월', '5~6월', '7~8월', '9~10월', '11~12월' 순서로 6개 구간 전부 작성)"),
            energy: z.string().describe("해당 시기 기운과 핵심 변수를 요약한 제목 한 줄"),
            guide: z.string().describe("해당 시기 일·재물·관계에서 실제로 일어날 수 있는 흐름의 냉정한 예측, 해야 할 일/피해야 할 행동, 그리고 따뜻한 조언 (220~300자)")
        })).describe("2026년 한 해 전체를 다루는 6개 구간별 월간 흐름")
    })
});

// MbtiSaju Strategies
export const strategySchema = z.object({
    fieldStrategies: z.object({
        career: z.object({
            subtitle: z.string().describe("커리어·일 분야 핵심 전략 제목"),
            analysis: z.string().describe("2026년 기준 직장·사업·이직·성취 면에서의 현실적인 강점과 부딪힐 수 있는 구조적 리스크를 냉정하게 분석 (450~600자, 3문단 \\n\\n)"),
            advice: z.string().describe("당장 실행할 커리어 행동 전략(보고, 협상, 포트폴리오, 타이밍)과 지칠 때 방향을 잃지 않도록 돕는 따뜻한 조언 (350~450자, 2문단 \\n\\n)")
        }),
        love: z.object({
            subtitle: z.string().describe("연애·인간관계 분야 핵심 전략 제목"),
            analysis: z.string().describe("2026년 연애·대인관계에서 반복되기 쉬운 감정 패턴, 상대가 오해하거나 지치는 지점을 냉철하게 짚는 분석 (450~600자, 3문단 \\n\\n)"),
            advice: z.string().describe("관계를 망치지 않는 거리 조절법·대화법과 자기 마음을 지키는 따뜻한 관계 조언 (350~450자, 2문단 \\n\\n)")
        }),
        wealth: z.object({
            subtitle: z.string().describe("재물·자산 관리 분야 핵심 전략 제목"),
            analysis: z.string().describe("2026년 돈이 모이는 경로와 반대로 감정 소비·충동 투자·주변 인연으로 새어 나가는 패턴을 냉정하게 짚는 분석 (450~600자, 3문단 \\n\\n)"),
            advice: z.string().describe("구체적 자금 방어선·저축/투자 기준 및 조급함을 내려놓게 돕는 따뜻한 재물 조언 (350~450자, 2문단 \\n\\n)")
        })
    }),
    warnings: z.object({
        watchOut: z.array(z.object({
            title: z.string().describe("주의해야 할 흐름 제목"),
            description: z.string().describe("2026년 흐름 속에서 무심코 방심하다 흔들리기 쉬운 상황과 그 이유, 선제적 점검 기준 (260~340자)")
        })).describe("주의해야 할 흐름 3가지"),
        avoid: z.array(z.object({
            title: z.string().describe("반드시 피해야 할 패턴 제목"),
            description: z.string().describe("이 사주·성향 조합이 가장 큰 손실이나 후회를 겪는 치명적 선택 패턴과 멈춰 서야 할 구체적 신호 (260~340자)")
        })).describe("반드시 피해야 할 패턴 3가지")
    }),
    solution: z.string().describe("리포트 전체를 마무리하는 2026년 종합 솔루션 (550~700자, 3문단 \\n\\n). 현실적 우선순위 정리와 함께 내담자의 몫을 다정하고 단단하게 응원하는 따뜻한 마무리를 담을 것.")
});

// Consolidated Yearly Fortune + Field Strategies schema for parallel half-B streaming
export const fortuneStrategySchema = yearlyFortuneSchema.extend(strategySchema.shape);

// Full Consolidated Analysis (flat object schema — avoids top-level allOf rejected by OpenAI Structured Outputs)
export const fullAnalysisSchema = analysisSchema
    .extend(yearlyFortuneSchema.shape)
    .extend(strategySchema.shape);

// Quick Fortune (Daily/Tomorrow)
const fortuneItemSchema = z.object({
    fortune: z.string().describe("오늘/내일의 운세를 냉정한 현실 진단과 따뜻한 조언을 담아 4~5문단(600~900자, \\n\\n 구분)으로 풍부하게 서술 (이모지·마크다운 금지)"),
    lucky: z.object({
        color: z.string().describe("행운의 색상과 활용 이유 (25~50자)"),
        number: z.string().describe("행운의 숫자"),
        direction: z.string().describe("행운의 방향")
    }),
    mission: z.string().describe("오늘 바로 실천할 수 있는 구체적이고 현실적인 미션과 따뜻한 한마디 (80~140자)"),
    charm_stats: z.array(z.object({
        label: z.string().describe("오늘의 에너지 지표 이름 (예: 집중력, 대인운, 재물감각, 추진력, 마음안정)"),
        value: z.number().describe("수치 (0-100)")
    })).describe("5가지 에너지 스탯"),
    lucky_ootd: z.string().describe("기운을 보완하는 구체적인 옷차림 추천 (40~80자)")
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
    concept: z.string().describe("이번 여행의 핵심 테마 한 문장 (이모지 금지)"),
    places: z.array(z.object({
        name: z.string().describe("여행지 이름 (구체적인 지역·장소)"),
        reason: z.string().describe("사주(일간·오행 보완)와 성향 기준으로 왜 이곳이 잘 맞는지, 현실적으로 어떤 환기가 일어나는지 250~350자(2문단 \\n\\n)로 서술"),
        activity: z.string().describe("이곳에서 꼭 해보면 좋은 구체적 동선과 활동 (180~250자)"),
        photoSpot: z.string().describe("가장 빛이 좋고 기록으로 남기기 좋은 스팟과 시간대 팁 (60~120자)"),
        food: z.string().describe("부족한 오행을 채워주는 현지 추천 음식과 이유 (60~120자)")
    })).describe("추천 여행지 3곳"),
    itinerary: z.array(z.object({
        day: z.string().describe("일차 제목 (예: '1일차 — 비움과 감각 전환')"),
        schedule: z.array(z.string()).describe("오전·오후·저녁 시간대별 구체적 이동·휴식 일정 3~4개 (각 60~100자)")
    })),
    companion: z.string().describe("함께 가면 기운의 균형이 맞는 동행 스타일과 주의할 갈등 포인트 (180~250자)"),
    luckyItem: z.string().describe("여행 중 컨디션과 기운을 지켜주는 아이템과 이유 (100~150자)"),
    summary: z.string().describe("이번 여행을 통해 얻어가야 할 현실적 전환점과 따뜻한 응원 총평 (300~450자, 2문단)"),
    bestTime: z.string().describe("올해·계절 흐름상 가장 기운이 잘 통하는 출발 추천 시기와 이유 (150~220자)"),
    tip: z.string().describe("여행 중 지치거나 계획이 틀어질 때를 대비한 현실 조언과 따뜻한 당부 (180~250자)")
});

// Special Analysis: KBO Baseball
export const kboSchema = z.object({
    score: z.number().describe("선택한 구단과의 궁합 점수 (0-100)"),
    supportedTeamAnalysis: z.string().describe("사주 오행·일간과 성향 기반으로 구단과의 케미, 직관 시 감정 기복 관리, 경기 흐름에 흔들리지 않는 팁까지 450~600자(3문단 \\n\\n)로 깊이 있게 서술 (이모지 금지)"),
    winFairyScore: z.number().describe("승리 요정 지수 (0-100)"),
    bestTeam: z.string().describe("최강 궁합 구단"),
    worstTeam: z.string().describe("상극 구단"),
    dimensions: z.array(z.object({
        label: z.string().describe("평가 척도 이름"),
        value: z.number().describe("해당 척도 점수 (0-100)")
    })).describe("5가지 평가 지표"),
    date: z.string().describe("오늘 날짜 (YYYY-MM-DD)"),
    dailyMessage: z.string().describe("오늘 KBO 직관·응원 운세 핵심 메시지 한 줄 (40~80자)"),
    recommendedSeat: z.string().describe("사주와 성향에 맞춘 구장 좌석 구역 추천과 구체적 이유 (100~160자)"),
    luckyFood: z.string().describe("기운을 보완해 주는 구장 먹거리 추천과 이유 (100~160자)"),
    tomorrowScore: z.number().describe("내일 예정 궁합 점수 (0-100)"),
    tomorrowWinFairyScore: z.number().describe("내일 예정 승리 요정 지수 (0-100)")
});

// Special Analysis: Jamidusu
export const jamidusuSchema = z.object({
    main_character: z.string().describe("나의 메인 자미두수 주성 호칭 (예: '판을 읽고 끝내 중심을 세우는 자미성(紫微星)', 이모지 금지)"),
    destiny_palace: z.string().describe("명궁(命宮) 분석: 타고난 본성, 겉으로 보이는 이미지와 내면의 고독/강점을 냉정하고 깊이 있게 350~450자(2~3문단 \\n\\n)로 서술"),
    career_palace: z.string().describe("관록궁(官祿宮) 분석: 조직 내 포지션, 재능이 빛나는 업종, 일할 때 주의할 번아웃/마찰 패턴을 350~450자(2~3문단 \\n\\n)로 서술"),
    wealth_style: z.string().describe("재백궁(財帛宮) 분석: 돈이 모이고 빠져나가는 패턴, 피해야 할 투기/소비 습관, 현실적 자산 전략을 350~450자(2~3문단 \\n\\n)로 서술"),
    love_style: z.string().describe("부처궁(夫妻宮) 분석: 끌리는 상대 유형, 연애·결혼에서 반복되는 갈등 구조, 오래 가는 인연의 조건을 350~450자(2~3문단 \\n\\n)로 서술"),
    lucky_items: z.array(z.object({
        name: z.string().describe("길성 또는 행운 요소 이름 (예: 문창성)"),
        meaning: z.string().describe("초심자도 바로 이해할 수 있는 구체적 작용과 일상 활용법 (100~160자)")
    })).describe("나를 돕는 길성 및 행운 요소 3가지"),
    summary: z.string().describe("올해 기준 자미두수 명반 종합 총평: 냉정한 삶의 과제와 따뜻하고 단단한 응원 조언 (400~550자, 3문단 \\n\\n)")
});

// Special Analysis: Compatibility
export const compatibilitySchema = z.object({
    score: z.number().describe("궁합 점수 (0-100)"),
    summary: z.string().describe("두 사람(또는 이상형) 인연의 핵심 본질과 관계를 꿰뚫는 한 줄 총평 (80~140자)"),
    keywords: z.array(z.string()).describe("핵심 궁합 키워드 4~5개"),
    details: z.object({
        ideal_mbti: z.string().describe("성향·대화·생활 패턴 차원의 궁합 분석: 잘 맞는 결, 갈등이 터지는 말투와 생활 습관, 현실 대처법을 450~600자(3문단 \\n\\n)로 냉철하게 서술 (MBTI 미입력 시 사주 기질 기준)"),
        ideal_saju: z.string().describe("사주 일간·오행·신살 기반 궁합 분석: 서로 채워주는 오행과 부딪히는 기운, 끌림과 피로의 원인을 450~600자(3문단 \\n\\n)로 상세히 서술"),
        overall_compatibility: z.string().describe("관계 심층 종합 진단 및 향후 흐름(올해 2026년 기준 6개월/1년/3년 흐름, 승부/갈등 해소 전략, 마음을 지키는 따뜻한 조언)을 1,600~2,200자(여러 문단 \\n\\n, 글머리표 '-' 활용, 이모지 금지)로 깊이 있게 작성")
    })
});

// Tarot
export const tarotSchema = z.object({
    cardReadings: z.array(z.object({
        cardName: z.string().describe("뽑힌 카드의 정확한 한글 또는 영문 이름"),
        interpretation: z.string().describe("해당 카드가 질문자의 현재 위치에서 뜻하는 냉정한 현실 진단, 심리 상태, 구체적 변수를 350~500자(2~3문단 \\n\\n)로 깊이 있게 해석 (이모지 금지)")
    })),
    overallReading: z.string().describe("선택된 카드들을 하나로 엮어 현재 상황의 흐름과 앞으로 벌어질 가능성을 냉철하게 짚어주고 따뜻한 시선으로 정리하는 종합 리딩 (600~800자, 3~4문단 \\n\\n)"),
    advice: z.string().describe("지금 당장 취해야 할 현실적 태도·행동 기준과 스스로를 다독이는 따뜻한 실천 조언 (350~450자, 2~3문단 \\n\\n)")
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
    mbtiSajuWealthReport: z.string().describe("MBTI-사주 뼈 때리는 재물 보고서 (### 1. ~ ### 4. 마크다운 헤더 구조, 이모지 금지, 1500~2200자)"),
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

