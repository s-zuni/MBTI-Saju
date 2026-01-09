import { calculateSaju, SajuResult } from './saju';

export const MBTI_TYPES = [
    'ISTJ', 'ISFJ', 'INFJ', 'INTJ',
    'ISTP', 'ISFP', 'INFP', 'INTP',
    'ESTP', 'ESFP', 'ENFP', 'ENTP',
    'ESTJ', 'ESFJ', 'ENFJ', 'ENTJ'
];

interface AnalysisContext {
    mbti: string;
    birthDate: string;
    birthTime?: string;
    gender?: string;
    name?: string;
    saju?: SajuResult;
}

const getElementTraits = (element: string) => {
    switch (element) {
        case 'wood': return { trait: '성장과 추진력', desc: '나무처럼 빳빳하게 솟아오르는 기상' };
        case 'fire': return { trait: '열정과 예의', desc: '태양처럼 밝게 빛나며 확산하는 에너지' };
        case 'earth': return { trait: '믿음과 포용', desc: '모든 것을 품어주는 대지 같은 중후함' };
        case 'metal': return { trait: '결단과 의리', desc: '바위처럼 단단하고 예리한 카리스마' };
        case 'water': return { trait: '지혜와 유연함', desc: '물이 흐르듯 어느 곳에나 적응하는 지혜' };
        default: return { trait: '알 수 없음', desc: '' };
    }
};

// 챗봇 답변 생성 (규칙 기반 + 사주 로직)
export const generateChatbotResponse = (question: string, context: AnalysisContext) => {
    const q = question.toLowerCase();
    const mbti = context.mbti || '알 수 없음';

    // 사주 계산 (컨텍스트에 없으면 즉석 계산)
    let saju = context.saju;
    if (!saju && context.birthDate) {
        saju = calculateSaju(context.birthDate, context.birthTime || null);
    }

    if (!saju) {
        return "죄송합니다. 생년월일 정보가 없어 사주를 분석할 수 없습니다. 마이페이지에서 프로필 정보를 먼저 입력해주세요.";
    }

    const { dayMaster, elements, elementRatio } = saju;
    const myElement = dayMaster.element; // wood, fire, etc.
    const myElementKorean = (() => {
        switch (myElement) {
            case 'wood': return '목(Wood)';
            case 'fire': return '화(Fire)';
            case 'earth': return '토(Earth)';
            case 'metal': return '금(Metal)';
            case 'water': return '수(Water)';
            default: return myElement;
        }
    })();

    const dayMasterName = dayMaster.korean; // 갑목, 을목...
    const traits = getElementTraits(myElement);

    // 공통 서두
    const intro = `당신은 [${mbti}]의 성향과 사주 ["${dayMasterName}(${myElementKorean})"]의 기운을 가지고 계시네요.`;

    if (q.includes('안녕') || q.includes('반가')) {
        return `안녕하세요! ${context.name ? context.name + '님, ' : ''}${intro} \n\n${traits.desc}을 품고 있는 당신에게 2026년은 어떤 의미일지 궁금하지 않으신가요? 연애운, 재물운, 직업운 등을 물어보세요!`;
    }

    if (q.includes('연애') || q.includes('사랑') || q.includes('결혼') || q.includes('남자') || q.includes('여자')) {
        let advice = "";
        if (myElement === 'water' || myElement === 'fire') {
            advice = "감수성이 풍부하고 매력이 넘치는 스타일이라 이성이 많이 따를 수 있습니다. 하지만 때로는 감정 기복을 조절하는 것이 중요해요.";
        } else if (myElement === 'wood' || myElement === 'metal') {
            advice = "주관이 뚜렷하고 리드하는 연애를 선호하시네요. 상대방의 의견을 조금 더 경청한다면 더욱 깊은 관계가 될 거예요.";
        } else {
            advice = "신중하고 한결같은 사랑을 하는 분이군요. 표현을 조금 더 적극적으로 해보는 건 어떨까요?";
        }

        return `[${mbti} x ${dayMasterName} 연애 분석]\n\n${intro}\n\n${advice}\n\n사주 오행으로 볼 때, 2026년에는 ${elements.fire > 1 ? '열정적인 만남이' : '안정적인 인연이'} 기다리고 있을 확률이 높습니다. ${context.birthTime ? `태어난 시간(${context.birthTime})을 고려하면 저녁 시간 데이트가 행운을 가져다 줄 거예요.` : ''}`;
    }

    if (q.includes('돈') || q.includes('재물') || q.includes('투자') || q.includes('부자')) {
        let wealthAdvice = "";
        if (elementRatio.earth > 20 || elementRatio.metal > 20) {
            wealthAdvice = "부동산이나 안전 자산 위주의 투자가 잘 맞습니다. 차곡차곡 쌓아가는 것이 큰 부를 이룰 수 있는 지름길입니다.";
        } else if (elementRatio.fire > 20 || elementRatio.water > 20) {
            wealthAdvice = "흐름을 읽는 눈이 탁월하시네요. 주식이나 트렌디한 투자처에 관심을 가져보셔도 좋겠지만, 충동적인 결정은 금물입니다.";
        } else {
            wealthAdvice = "성실함이 가장 큰 무기입니다. 꾸준한 저축과 자기 계발을 통한 몸값 상승이 최고의 재테크가 될 것입니다.";
        }

        return `[${mbti} x ${dayMasterName} 재물 분석]\n\n${intro}\n\n${wealthAdvice}\n\n내 사주에 재물 기운이 얼마나 있는지 궁금하시다면 마이페이지의 상세 분석을 확인해보세요!`;
    }

    if (q.includes('직업') || q.includes('진로') || q.includes('취업') || q.includes('사업')) {
        return `[${mbti} x ${dayMasterName} 직업 조언]\n\n${mbti}의 특성과 ${dayMasterName}의 기운("${traits.trait}")을 조합해보면, 당신은 주도적으로 무언가를 만들어내거나 사람들에게 영향을 미치는 일이 잘 어울립니다. \n\n${elements.wood > 2 ? '창의적이고 기획하는 업무' : elements.metal > 2 ? '원칙을 중요시하고 결단력이 필요한 업무' : '안정적이고 전문적인 업무'} 쪽으로 방향을 잡아보세요. 2026년은 새로운 기회가 열릴 수 있는 해입니다.`;
    }

    // Default fallback
    return `${intro} \n\n${mbti}의 논리성과 사주가 가진 ${traits.trait}의 에너지가 조화를 이루고 있습니다. 지금 갖고 계신 고민(${q})에 대해 조금 더 구체적으로 물어봐 주신다면(예: "내년 이직운은?", "지금 짝사랑 잘 될까?"), 사주 명리학적으로 더 자세히 풀어드릴게요!`;
};

export const SAJU_ELEMENTS = {
    wood: '木(목)',
    fire: '火(화)',
    earth: '土(토)',
    metal: '金(금)',
    water: '水(수)'
};

export const getMbtiDescription = (mbti: string) => {
    const descriptions: { [key: string]: string } = {
        'ISTJ': '신중하고 책임감이 강하며, 한번 시작한 일은 끝까지 해내는 성격입니다. 보수적인 경향이 있지만 그만큼 위기 관리 능력이 뛰어납니다.',
        'ISFJ': '차분하고 인내심이 강하며 타인의 감정을 잘 살핍니다. 안정적인 환경을 선호하며, 주변 사람들에게 헌신적인 태도를 보입니다.',
        'INFJ': '통찰력이 뛰어나고 사람들의 본심을 꿰뚫어 보는 능력이 있습니다. 이상주의적인 면모가 있지만, 확고한 신념을 가지고 행동합니다.',
        'INTJ': '독창적이고 분석적인 사고를 하며, 목표를 달성하기 위해 체계적인 계획을 세웁니다. 지적 호기심이 강하고 비판적인 시각을 가집니다.',
        'ISTP': '논리적이고 뛰어난 상황 적응력을 가지고 있습니다. 효율성을 중시하며, 필요할 때는 과감하게 행동하는 결단력이 있습니다.',
        'ISFP': '온화하고 예술적인 감각이 뛰어나며, 현재의 순간을 즐길 줄 압니다. 타인에게 강요하지 않으며 자유로운 영혼을 가지고 있습니다.',
        'INFP': '진정성을 중요하게 생각하며, 높은 도덕적 기준을 가지고 있습니다. 몽상가 기질이 있지만, 자신이 믿는 가치에는 열정적입니다.',
        'INTP': '지적 호기심이 많고 추상적인 개념을 즐깁니다. 조용하지만 분석적이며, 기존의 틀을 깨는 창의적인 아이디어를 냅니다.',
        'ESTP': '에너지 넘치고 직설적이며, 문제를 즉각적으로 해결하는 능력이 뛰어납니다. 새로운 경험을 즐기고 모험을 두려워하지 않습니다.',
        'ESFP': '사교적이고 활동적이며, 주위 사람들을 즐겁게 만듭니다. 현실 감각이 뛰어나고 구체적인 경험을 통해 배우는 것을 좋아합니다.',
        'ENFP': '열정적이고 창의적이며, 사람들과 어울리는 것을 좋아합니다. 긍정적인 에너지를 전파하며, 새로운 가능성을 항상 탐구합니다.',
        'ENTP': '변화와 도전을 즐기며, 논쟁을 통해 진리를 탐구하는 것을 좋아합니다. 다방면에 재능이 있고 아이디어가 끊이지 않습니다.',
        'ESTJ': '구체적이고 현실적이며, 조직을 이끄는 리더십이 탁월합니다. 규칙과 질서를 중요시하며, 목표를 향해 효율적으로 나아갑니다.',
        'ESFJ': '친절하고 사교적이며, 타인을 돕는 일에 보람을 느낍니다. 조화와 협력을 중요하게 생각하며, 책임감이 강한 협력자입니다.',
        'ENFJ': '카리스마가 있고 타인에게 영감을 주는 리더형입니다. 사람에 대한 관심이 많고, 공동체의 성장을 위해 헌신합니다.',
        'ENTJ': '단호하고 결정력이 있으며, 장기적인 비전을 가지고 목표를 달성합니다. 통솔력이 뛰어나고 논리적인 판단을 내립니다.'
    };
    return descriptions[mbti] || '당신의 MBTI 성향에 대한 심층 분석입니다.';
};

export const getSajuDescription = (element: string) => {
    switch (element) {
        case 'wood': return '당신은 봄의 새싹처럼 뻗어나가는 성장 의지를 가졌습니다. 굽히지 않는 올곧음과 자비로운 마음씨(仁)를 동시에 지니고 있어, 리더로서의 자질이 충분합니다. 때로는 고집이 세다는 평을 들을 수 있으나, 이는 곧 추진력을 의미합니다.';
        case 'fire': return '당신은 한여름의 태양처럼 뜨거운 열정과 예의(禮)를 중시합니다. 매사에 적극적이고 화려함을 즐기며, 사람들의 이목을 끄는 매력이 있습니다. 가끔 감정이 앞서 실수를 할 수 있으니 차분함을 기르는 것이 좋습니다.';
        case 'earth': return '당신은 만물을 포용하는 대지처럼 흔들리지 않는 믿음(信)을 줍니다. 중용을 지키며 어느 한쪽으로 치우치지 않는 안정감이 가장 큰 장점입니다. 다만 너무 신중하여 기회를 놓칠 수 있으니 때로는 과감함이 필요합니다.';
        case 'metal': return '당신은 단단한 바위나 보석처럼 결단력과 의리(義)를 목숨처럼 여깁니다. 냉철한 판단력 맺고 끊음이 확실하여 공사 구분이 명확합니다. 너무 날카로운 지적은 타인에게 상처가 될 수 있으니 유연함이 필요합니다.';
        case 'water': return '당신은 유유히 흐르는 물처럼 지혜(智)와 유연함을 갖췄습니다. 환경에 따라 자신을 바꿀 줄 아는 처세술이 뛰어나고, 생각이 깊어 총명합니다. 속내를 잘 드러내지 않아 음흉하다는 오해를 살 수 있으니 표현을 늘려보세요.';
        default: return '당신의 타고난 사주 기운에 대한 심층 분석입니다.';
    }
};

export const getDetailedFusedAnalysis = (data: { mbti: string; birthDate: string; birthTime?: string; name?: string }) => {
    try {
        const saju = calculateSaju(data.birthDate, data.birthTime || null);
        const { dayMaster, elements } = saju;

        const traits = getElementTraits(dayMaster.element);

        return `[MBTI x 사주 정밀 분석]

${data.name ? data.name + '님의 ' : ''}핵심 성향은 MBTI [${data.mbti}]와 사주 [${dayMaster.korean}(${SAJU_ELEMENTS[dayMaster.element as keyof typeof SAJU_ELEMENTS]})]의 만남으로 설명됩니다.

1. 타고난 기운 (사주)
당신은 "${traits.trait}"을(를) 상징하는 ${dayMaster.korean} 일주를 타고났습니다. ${traits.desc}

2. 후천적 성격 (MBTI)
${data.mbti} 유형으로서 논리적이고 체계적인 사고를 선호하며, 이는 사주의 기운과 만나 독특한 시너지를 냅니다.

3. 2026년 융합 운세,
2026년 병오년(붉은 말의 해)은 火(화)의 기운이 강한 해입니다. 당신의 사주 오행 구성(木:${elements.wood}, 火:${elements.fire}, 土:${elements.earth}, 金:${elements.metal}, 水:${elements.water})을 볼 때, 올해는 새로운 도전을 하기에 적합한 시기입니다.

4. 행운의 조언
주변의 흐름에 너무 휩쓸리지 말고, 본인만의 중심을 잡는 것이 중요합니다.`;
    } catch (e) {
        return "분석 중 오류가 발생했습니다. 생년월일을 확인해주세요.";
    }
};

export const get2026Fortune = (element: string) => {
    return "2026년 병오년은 변화와 열정의 시기입니다. 당신의 오행 기운과 조화를 이루어 좋은 성과를 거두시길 바랍니다.";
};
