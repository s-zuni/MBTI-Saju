export interface TeamInfo {
    name: string;
    id: string;
    logo: string;
    primaryColor: string;
    secondaryColor: string;
    textColor: string;
}

const STORAGE_URL = 'https://tffvsyarxfujmvbqlutr.supabase.co/storage/v1/object/public/KBO%20LOGO/KBO%20LOGO';

export const TEAM_CONFIG: Record<string, TeamInfo> = {
    'KIA 타이거즈': {
        name: 'KIA 타이거즈',
        id: 'kia',
        logo: `${STORAGE_URL}/imgEmblem11.jpg`,
        primaryColor: '#EC1C24',
        secondaryColor: '#000000',
        textColor: '#FFFFFF'
    },
    '기아 타이거즈': { // Frontend alias
        name: 'KIA 타이거즈',
        id: 'kia',
        logo: `${STORAGE_URL}/imgEmblem11.jpg`,
        primaryColor: '#EC1C24',
        secondaryColor: '#000000',
        textColor: '#FFFFFF'
    },
    '삼성 라이온즈': {
        name: '삼성 라이온즈',
        id: 'samsung',
        logo: `${STORAGE_URL}/lions.png`,
        primaryColor: '#074CA1',
        secondaryColor: '#C4CED4',
        textColor: '#FFFFFF'
    },
    'LG 트윈스': {
        name: 'LG 트윈스',
        id: 'lg',
        logo: `${STORAGE_URL}/twins.png`,
        primaryColor: '#C5003D',
        secondaryColor: '#000000',
        textColor: '#FFFFFF'
    },
    '두산 베어스': {
        name: '두산 베어스',
        id: 'doosan',
        logo: `${STORAGE_URL}/bears.png`,
        primaryColor: '#131230',
        secondaryColor: '#ED1C24',
        textColor: '#FFFFFF'
    },
    'KT 위즈': {
        name: 'KT 위즈',
        id: 'kt',
        logo: `${STORAGE_URL}/kt.png`,
        primaryColor: '#000000',
        secondaryColor: '#ED1C24',
        textColor: '#FFFFFF'
    },
    'SSG 랜더스': {
        name: 'SSG 랜더스',
        id: 'ssg',
        logo: `${STORAGE_URL}/ssg_emblem1.png`,
        primaryColor: '#CE0E2D',
        secondaryColor: '#B69260',
        textColor: '#FFFFFF'
    },
    '롯데 자이언츠': {
        name: '롯데 자이언츠',
        id: 'lotte',
        logo: `${STORAGE_URL}/lotte_emblem.jpg`,
        primaryColor: '#002955',
        secondaryColor: '#DC0330',
        textColor: '#FFFFFF'
    },
    '한화 이글스': {
        name: '한화 이글스',
        id: 'hanwha',
        logo: `${STORAGE_URL}/eagles.png`,
        primaryColor: '#FF6600',
        secondaryColor: '#000000',
        textColor: '#FFFFFF'
    },
    'NC 다이노스': {
        name: 'NC 다이노스',
        id: 'nc',
        logo: `${STORAGE_URL}/dainos.png`,
        primaryColor: '#073270',
        secondaryColor: '#AF9164',
        textColor: '#FFFFFF'
    },
    '키움 히어로즈': {
        name: '키움 히어로즈',
        id: 'kiwoom',
        logo: `${STORAGE_URL}/kiwoom.png`, // Adjusted based on common patterns
        primaryColor: '#820024',
        secondaryColor: '#FFFFFF',
        textColor: '#FFFFFF'
    }
};

export const getTeamInfo = (teamName: string): TeamInfo | undefined => {
    return TEAM_CONFIG[teamName] || Object.values(TEAM_CONFIG).find(t => t.name === teamName);
};
