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
    gender?: string;
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

// 챗봇 답변 생성 (규칙 기반)
export const generateChatbotResponse = (question: string, context: AnalysisContext) => {
    const q = question.toLowerCase();
    const mbti = context.mbti || '알 수 없음';

    // 간단한 키워드 매칭
    if (q.includes('안녕')) {
        return `안녕하세요! 당신의 MBTI는 ${mbti}이시군요. 사주와 MBTI를 기반으로 무엇이든 물어보세요.`;
    }

    if (q.includes('연애') || q.includes('사랑') || q.includes('남자친구') || q.includes('여자친구')) {
        return `${mbti} 성향의 분들은 사랑에 빠지면 ${getMbtiLoveStyle(mbti)}하는 경향이 있죠. 2026년의 연애운을 보면, "${get2026Fortune(context).love}" 라고 나오네요. 적극적으로 행동해보세요!`;
    }

    if (q.includes('돈') || q.includes('재물') || q.includes('부자') || q.includes('로또')) {
        return `${mbti} 분들은 재테크에 있어서도 ${getMbtiWealthStyle(mbti)}한 스타일이시네요. 사주상 2026년 재물운은 "${get2026Fortune(context).wealth}" 흐름입니다.`;
    }

    if (q.includes('직업') || q.includes('진로') || q.includes('취업')) {
        return `${mbti} 유형은 창의적이고 독립적인 환경에서 능력을 발휘합니다. 사주를 볼 때 올해는 새로운 도전을 하기에 적합한 시기이니, 평소 관심 있던 분야에 도전해보세요.`;
    }

    return `흥미로운 질문이네요! ${mbti}적인 관점과 사주 명리학적으로 볼 때, 그 문제는 마음의 흐름을 따르는 것이 중요합니다. 더 구체적인 운세가 궁금하다면 '2026년 연애운'이나 '재물운'이라고 물어봐주세요.`;
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
