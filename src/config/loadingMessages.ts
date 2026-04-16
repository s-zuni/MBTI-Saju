import { ServiceType } from '../components/ServiceNavigation';

export const HUMOROUS_LOADING_MESSAGES: Record<ServiceType | 'default', string[]> = {
    mbti: [
        "당신의 영혼을 털기 위해 사주와 MBTI가 회담 중입니다...",
        "MBTI와 사주가 서로 싸우지 않게 잘 중재하고 있어요.",
        "자아 성찰의 시간! 당신의 내면을 탈탈 털어볼게요.",
        "운명의 지도를 펼치고 있습니다. 잠시만요, 길을 좀 잃었네요..."
    ],
    compatibility: [
        "두 분의 궁합도를 계산하기 위해 우주의 기운을 모으고 있어요.",
        "천생연분인지 웬수인지 판별 중입니다. 마음의 준비를 하세요!",
        "하늘이 정해준 인연인지, 제가 한번 꼬셔보겠습니다...",
        "상대방의 마음을 읽는 중... (아, 이건 비밀인데!)"
    ],
    trip: [
        "당신의 운명적 목적지를 찾기 위해 비행기 표를 예매 중입니다.",
        "방구석 탈출을 돕기 위해 최고의 명당을 수소문 중이에요.",
        "인생샷 명소를 찾기 위해 인스타그램 서버를 해킹(?) 중..."
    ],
    naming: [
        "대박 날 이름을 짓기 위해 옥편을 초고속으로 넘기고 있습니다.",
        "이름 하나로 팔자를 바꿔보겠습니다. 조금만 기다려주세요!",
        "강남 건물주가 될 만한 이름을 고심 중입니다."
    ],
    fortune: [
        "내일의 운세를 미리 훔쳐보는 중입니다. (쉿!)",
        "행운의 여신이랑 협상 중이에요. 조금만 더 이득을 챙겨볼게요.",
        "오늘의 운을 끌어모아 내일로 몰빵하는 중..."
    ],
    kbo: [
        "승리 요정인지 패배 요정인지 판독 카메라 가동 중...",
        "심판의 판정보다 정확한 사주 판독이 진행 중입니다.",
        "야구장 맥주보다 시원한 궁합 결과를 가져올게요!"
    ],
    default: [
        "데이터를 분석 중입니다. 최대 30초 정도 소요될 수 있어요!",
        "우주 인터넷이 가끔 느려서 그래요. 조금만 기다려주세요.",
        "열심히 머리를 굴리고 있습니다. 연기가 날 수도 있어요!"
    ]
};

export const getRandomLoadingMessage = (service: ServiceType | 'default'): string => {
    const messages = HUMOROUS_LOADING_MESSAGES[service] || HUMOROUS_LOADING_MESSAGES.default;
    const randomIndex = Math.floor(Math.random() * messages.length);
    return messages[randomIndex] ?? messages[0] ?? "분석 중입니다...";
};
