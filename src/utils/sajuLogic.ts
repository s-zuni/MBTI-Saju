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
