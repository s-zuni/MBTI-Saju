export const SAJU_ELEMENTS = {
    Wood: '목(Wood)',
    Fire: '화(Fire)',
    Earth: '토(Earth)',
    Metal: '금(Metal)',
    Water: '수(Water)',
};

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
}

// 2026년 운세 데이터 (시뮬레이션)
export const get2026Fortune = (context: AnalysisContext) => {
    // 간단한 로직: 생년월일 끝자리에 따라 운세 결정 (실제 사주 로직 대체)
    const yearPart = context.birthDate ? context.birthDate.split('-')[0] : '';
    const yearDigit = yearPart ? parseInt(yearPart.slice(-1) || '0') : 0;

    const loveLuck = [
        "2026년은 새로운 인연이 찾아오는 해입니다. 특히 봄에 만나는 사람을 주목하세요.",
        "기존의 연인과 더욱 깊어지는 시기입니다. 결혼 이야기가 오갈 수 있습니다.",
        "혼자만의 시간을 즐기며 자신을 가꾸기에 좋은 해입니다. 무리한 만남은 피하세요.",
        "예상치 못한 곳에서 운명의 상대를 만날 수 있습니다. 동호회 활동을 추천합니다.",
        "과거의 인연과 다시 연결될 수 있는 흐름이 있습니다. 재회운이 강합니다.",
        "인기가 많아지는 해입니다. 여러 사람 중에서 누구를 선택할지 고민하게 됩니다.",
        "안정적인 연애운이 흐르고 있습니다. 평범한 데이트 속에서 행복을 찾으세요.",
        "약간의 다툼이 있을 수 있으나, 비온 뒤 땅이 굳듯 더욱 단단해질 것입니다.",
        "친구에서 연인으로 발전할 가능성이 높은 해입니다. 주변을 잘 살펴보세요.",
        "연애보다는 일이나 학업에 집중하게 되는 시기입니다. 억지로 만남을 갖지 마세요."
    ];

    const wealthLuck = [
        "재물운이 상승 곡선을 그립니다. 투자를 고려해봐도 좋은 시기입니다.",
        "예상치 못한 수익이 발생할 수 있습니다. 로또를 구매해보는 것도 좋겠네요.",
        "지출 관리에 신경 써야 합니다. 충동구매를 자제하고 저축을 늘리세요.",
        "노력한 만큼 댓가가 따르는 정직한 해입니다. 성실함이 곧 재산입니다.",
        "문서운이 좋습니다. 부동산이나 계약 관련해서 좋은 소식이 있을 것입니다.",
        "돈이 들어오지만 그만큼 나가는 돈도 많습니다. 현금 흐름을 잘 관리하세요.",
        "주변 사람의 도움으로 금전적 이득을 얻을 수 있습니다. 인맥 관리가 중요합니다.",
        "새로운 사업이나 부업을 시작하기에 좋은 운기입니다. 과감한 도전이 필요합니다.",
        "빌려준 돈을 받거나 잊고 있던 돈을 찾게 됩니다. 작은 횡재수가 있습니다.",
        "안정적인 수입이 유지됩니다. 큰 욕심보다는 현상 유지에 힘쓰는 것이 좋습니다."
    ];

    return {
        love: loveLuck[yearDigit] || loveLuck[0],
        wealth: wealthLuck[yearDigit] || wealthLuck[0]
    };
};

// 종합 정밀 분석 생성 (2000자 내외 시뮬레이션)
export const getDetailedFusedAnalysis = (context: AnalysisContext) => {
    const { mbti, birthDate, birthTime, name } = context;
    const yearDigit = birthDate ? parseInt(birthDate.split('-')[0].slice(-1) || '0') : 0;
    const element = Object.values(SAJU_ELEMENTS)[yearDigit % 5] || '알 수 없음';
    const fortune2026 = get2026Fortune(context);

    return `
[${name || '사용자'}님의 MBTI x 사주 초정밀 융합 분석 보고서]

1. 근원적 성향 분석 (The Core)
당신은 ${mbti} 유형의 논리적이고 체계적인 사고방식과 사주 명리학적으로 ${element}의 기운을 타고났습니다. ${mbti}가 가진 특성은 현대 사회에서의 행동 양식을 결정짓는다면, ${element}의 기운은 당신의 무의식 깊은 곳에 자리 잡은 본능적인 에너지를 의미합니다. 이 두 가지가 결합되어 당신은 겉으로는 차분하고 이성적으로 보일 수 있으나, 내면에는 ${element} 특유의 ${element.includes('화') ? '폭발적인 열정' : element.includes('수') ? '깊은 지혜' : '단단한 심지'}를 품고 있습니다. 

특히 당신의 MBTI 유형은 문제 해결에 강점을 보이며, 이는 ${element}의 기운과 만나 더욱 시너지를 발휘합니다. 예를 들어, ${mbti}의 분석력은 ${element}의 직관력과 결합하여 남들이 보지 못하는 통찰력을 제공합니다. 때로는 ${mbti}의 특성으로 인해 타인에게 다소 냉철하게 비칠 수 있지만, 당신의 사주에 흐르는 기운은 사실 따뜻한 인간미를 갈구하고 있음을 보여줍니다.

2. 2026년 운명의 흐름 (Destiny Flow 2026)
다가오는 2026년은 당신에게 매우 중요한 전환점이 될 것입니다. MBTI 성향상 당신은 계획된 변화를 선호하겠지만, 운명의 흐름은 다소 역동적인 변화를 예고하고 있습니다. 

- 재물운(Wealth): "${fortune2026.wealth}"
올해 재물운의 흐름을 보았을 때, 당신의 ${mbti}적 판단력이 빛을 발할 시기입니다. 꼼꼼한 분석과 데이터를 기반으로 한 투자는 긍정적인 결과를 가져올 것입니다. 다만, ${element}의 기운이 약해지는 여름철에는 성급한 결정을 피하고 현금 유동성을 확보하는 것이 중요합니다.

- 연애/대인운(Love & Relationship): "${fortune2026.love}"
인간관계에서는 당신의 논리적인 면모보다는 감성적인 접근이 필요한 해입니다. ${birthTime ? `태어난 시간대인 ${birthTime}의 기운을 고려할 때, ` : ''}저녁 시간에 만남을 갖거나 활동을 하는 것이 당신의 매력을 더욱 돋보이게 할 것입니다. 솔로라면 의외의 장소에서 인연을 만날 수 있으며, 커플이라면 상대방의 감정을 먼저 읽으려는 노력이 관계를 한 단계 발전시킬 것입니다.

3. 직업 및 진로 조언 (Career Path)
당신의 ${mbti} 성향은 전문적이고 독립적인 업무 환경에서 최고의 효율을 발휘합니다. 여기에 ${element}의 기운을 더하면, 창의적이면서도 현실적인 결과물을 만들어내는 직업군이 적합합니다. 2026년에는 새로운 프로젝트나 이직 제안이 들어올 수 있으며, 이는 당신의 커리어에 있어 퀀텀 점프가 될 수 있는 기회입니다. 두려워하지 말고 도전하세요. 당신의 분석적 사고와 타고난 운이 당신을 성공으로 이끌 것입니다.

4. 융합 솔루션 (Final Solution)
결론적으로, 당신은 이성과 감성, 계획과 직관의 균형을 맞추는 것이 인생의 숙제이자 가장 큰 무기입니다. ${mbti}의 틀에만 갇히지 말고, ${element}가 주는 자연스러운 흐름에 몸을 맡겨보세요. 2026년은 당신이 준비한 만큼, 아니 그 이상으로 보상받는 한 해가 될 것입니다.

* 본 분석은 ${name || '사용자'}님의 MBTI와 생년월일시 데이터를 기반으로 정밀 분석한 결과입니다.
    `.trim();
};

// 챗봇 답변 생성 (규칙 기반)
export const generateChatbotResponse = (question: string, context: AnalysisContext) => {
    const q = question.toLowerCase();
    const mbti = context.mbti || '알 수 없음';
    const element = Object.values(SAJU_ELEMENTS)[(context.birthDate ? parseInt(context.birthDate.split('-')[0].slice(-1) || '0') : 0) % 5] || '알 수 없음';

    // 간단한 키워드 매칭
    if (q.includes('안녕')) {
        return `안녕하세요! ${context.name ? context.name + '님, ' : ''}당신의 MBTI는 ${mbti}이고, 사주 오행은 ${element}입니다. 이 두 가지 정보를 바탕으로 당신의 운명을 읽어드릴게요. 무엇이 궁금하신가요?`;
    }

    if (q.includes('연애') || q.includes('사랑') || q.includes('결혼')) {
        const fortune = get2026Fortune(context).love;
        return `[${mbti} x ${element} 연애 분석]\n\n${mbti} 유형은 사랑에 있어 신중하지만, ${element}의 기운을 가진 당신은 한번 불타오르면 걷잡을 수 없는 열정을 가지고 계시네요.\n\n2026년의 흐름을 보면: "${fortune}"\n\n${context.birthTime ? `참고로 태어난 시간(${context.birthTime})의 영향으로 늦은 밤에 감성적인 대화를 나누는 것이 도움이 됩니다.` : '태어난 시간을 알려주시면 더 정확한 데이트 시간을 추천해 드릴 수 있어요.'}`;
    }

    if (q.includes('돈') || q.includes('재물') || q.includes('사업')) {
        const fortune = get2026Fortune(context).wealth;
        return `[${mbti} x ${element} 재물 분석]\n\n분석적인 ${mbti} 성향과 ${element}의 기운이 만나 ${element === '토(Earth)' ? '부동산이나 안정적인 자산' : '주식이나 변동성 있는 투자'}에 강점을 보입니다.\n\n2026년 재물운: "${fortune}"\n\n조급해하지 말고 본인의 판단을 믿으세요.`;
    }

    if (q.includes('직업') || q.includes('진로') || q.includes('취업')) {
        return `${mbti} 유형은 창의적이고 독립적인 환경에서 능력을 발휘합니다. 사주를 볼 때 올해는 새로운 도전을 하기에 적합한 시기이니, 평소 관심 있던 분야에 도전해보세요.`;
    }

    return `흥미로운 질문이네요! ${mbti}의 논리성과 ${element}의 직관을 모두 고려했을 때, 지금은 마음의 소리를 듣는 것이 중요해 보입니다. 더 구체적인 운세(2026년 연애운, 재물운 등)를 물어보시면 자세히 알려드릴게요.`;
};

// 헬퍼 함수들
const getMbtiLoveStyle = (mbti: string) => {
    if (mbti.includes('NF')) return '낭만적이고 깊은 감정을 중시';
    if (mbti.includes('NT')) return '지적 교감을 중요하게 생각';
    if (mbti.includes('SJ')) return '신뢰와 안정을 최우선으로';
    if (mbti.includes('SP')) return '함께 즐길 수 있는 경험을 선호';
    return '진심을 다해';
};

const getMbtiWealthStyle = (mbti: string) => {
    if (mbti.includes('J')) return '계획적이고 꼼꼼하게 관리';
    if (mbti.includes('P')) return '유동적이고 기회를 포착';
    return '운을 믿기보다 노력';
};
