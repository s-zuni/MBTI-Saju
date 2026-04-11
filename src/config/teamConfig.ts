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
        logo: 'https://api.mbtiju.com/storage/v1/object/sign/KBO%20LOGO/KBO%20LOGO/wordmark.jpg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV84YmZiZGM2Ny0wNzMxLTQxNDUtYTczYy1lM2ExYWE2YjdjYzgiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJLQk8gTE9HTy9LQk8gTE9HTy93b3JkbWFyay5qcGciLCJpYXQiOjE3NzU5MDE4MTIsImV4cCI6MTgwNzQzNzgxMn0.I56U2uxR9T4XkozGQDWO0CmfeIHfL-E0ir6O9xYyXb8',
        primaryColor: '#EA0029',
        secondaryColor: '#000000',
        textColor: '#FFFFFF'
    },
    '기아 타이거즈': {
        name: 'KIA 타이거즈',
        id: 'kia',
        logo: 'https://api.mbtiju.com/storage/v1/object/sign/KBO%20LOGO/KBO%20LOGO/wordmark.jpg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV84YmZiZGM2Ny0wNzMxLTQxNDUtYTczYy1lM2ExYWE2YjdjYzgiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJLQk8gTE9HTy9LQk8gTE9HTy93b3JkbWFyay5qcGciLCJpYXQiOjE3NzU5MDE4MTIsImV4cCI6MTgwNzQzNzgxMn0.I56U2uxR9T4XkozGQDWO0CmfeIHfL-E0ir6O9xYyXb8',
        primaryColor: '#EA0029',
        secondaryColor: '#000000',
        textColor: '#FFFFFF'
    },
    '삼성 라이온즈': {
        name: '삼성 라이온즈',
        id: 'samsung',
        logo: 'https://api.mbtiju.com/storage/v1/object/sign/KBO%20LOGO/KBO%20LOGO/lions.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV84YmZiZGM2Ny0wNzMxLTQxNDUtYTczYy1lM2ExYWE2YjdjYzgiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJLQk8gTE9HTy9LQk8gTE9HTy9saW9ucy5wbmciLCJpYXQiOjE3NzU5MDE3NzksImV4cCI6MTgwNzQzNzc3OX0.Zfc5zHj17rSGdULj7pCod28KVkt-dZB3uATbPDmj6kE',
        primaryColor: '#074CA1',
        secondaryColor: '#C4CED4',
        textColor: '#FFFFFF'
    },
    'LG 트윈스': {
        name: 'LG 트윈스',
        id: 'lg',
        logo: 'https://api.mbtiju.com/storage/v1/object/sign/KBO%20LOGO/KBO%20LOGO/twins.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV84YmZiZGM2Ny0wNzMxLTQxNDUtYTczYy1lM2ExYWE2YjdjYzgiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJLQk8gTE9HTy9LQk8gTE9HTy90d2lucy5wbmciLCJpYXQiOjE3NzU5MDE4MDUsImV4cCI6MTgwNzQzNzgwNX0.b-HukAw8EWt86POUnjNMdY9I9HmIXGMCo-C-G7n2iBc',
        primaryColor: '#C5003D',
        secondaryColor: '#000000',
        textColor: '#FFFFFF'
    },
    '두산 베어스': {
        name: '두산 베어스',
        id: 'doosan',
        logo: 'https://api.mbtiju.com/storage/v1/object/sign/KBO%20LOGO/KBO%20LOGO/bears.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV84YmZiZGM2Ny0wNzMxLTQxNDUtYTczYy1lM2ExYWE2YjdjYzgiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJLQk8gTE9HTy9LQk8gTE9HTy9iZWFycy5wbmciLCJpYXQiOjE3NzU5MDE2NTYsImV4cCI6MTgwNzQzNzY1Nn0.mIm-tubz3QUpOJ8s1IhPI7zT6Ca9yGU3zYEG9Bsh2ao',
        primaryColor: '#131230',
        secondaryColor: '#ED1C24',
        textColor: '#FFFFFF'
    },
    'KT 위즈': {
        name: 'KT 위즈',
        id: 'kt',
        logo: 'https://api.mbtiju.com/storage/v1/object/sign/KBO%20LOGO/KBO%20LOGO/kt.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV84YmZiZGM2Ny0wNzMxLTQxNDUtYTczYy1lM2ExYWE2YjdjYzgiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJLQk8gTE9HTy9LQk8gTE9HTy9rdC5wbmciLCJpYXQiOjE3NzU5MDE3NjcsImV4cCI6MTgwNzQzNzc2N30.CZ4LnkDnn7nZV1piIVs5usxx5u6yA9p49uY0iMCwAZ4',
        primaryColor: '#000000',
        secondaryColor: '#ED1C24',
        textColor: '#FFFFFF'
    },
    'SSG 랜더스': {
        name: 'SSG 랜더스',
        id: 'ssg',
        logo: 'https://api.mbtiju.com/storage/v1/object/sign/KBO%20LOGO/KBO%20LOGO/ssg_emblem1.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV84YmZiZGM2Ny0wNzMxLTQxNDUtYTczYy1lM2ExYWE2YjdjYzgiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJLQk8gTE9HTy9LQk8gTE9HTy9zc2dfZW1ibGVtMS5wbmciLCJpYXQiOjE3NzU5MDE3OTUsImV4cCI6MTgwNzQzNzc5NX0.IFOhVIbs6OfjSq3FcPDOrecVXMohcpA5UQbMTv1vd9k',
        primaryColor: '#CE0E2D',
        secondaryColor: '#B69260',
        textColor: '#FFFFFF'
    },
    '롯데 자이언츠': {
        name: '롯데 자이언츠',
        id: 'lotte',
        logo: 'https://api.mbtiju.com/storage/v1/object/sign/KBO%20LOGO/KBO%20LOGO/lotte_emblem.jpg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV84YmZiZGM2Ny0wNzMxLTQxNDUtYTczYy1lM2ExYWE2YjdjYzgiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJLQk8gTE9HTy9LQk8gTE9HTy9sb3R0ZV9lbWJsZW0uanBnIiwiaWF0IjoxNzc1OTAxNzg3LCJleHAiOjE4MDc0Mzc3ODd9.WhC-EBRY7oClYH0VoYsfl8W6lLfOsq9-u7mXXlNwjgs',
        primaryColor: '#002955',
        secondaryColor: '#DC0330',
        textColor: '#FFFFFF'
    },
    '한화 이글스': {
        name: '한화 이글스',
        id: 'hanwha',
        logo: 'https://api.mbtiju.com/storage/v1/object/sign/KBO%20LOGO/KBO%20LOGO/eagles.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV84YmZiZGM2Ny0wNzMxLTQxNDUtYTczYy1lM2ExYWE2YjdjYzgiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJLQk8gTE9HTy9LQk8gTE9HTy9lYWdsZXMucG5nIiwiaWF0IjoxNzc1OTAxNzQ3LCJleHAiOjE4MDc0Mzc3NDd9.nn7ndWmCNEt4rh9WGw8fQLEswtgA3YGt3kqweaAgkQM',
        primaryColor: '#FF6600',
        secondaryColor: '#000000',
        textColor: '#FFFFFF'
    },
    'NC 다이노스': {
        name: 'NC 다이노스',
        id: 'nc',
        logo: 'https://api.mbtiju.com/storage/v1/object/sign/KBO%20LOGO/KBO%20LOGO/dainos.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV84YmZiZGM2Ny0wNzMxLTQxNDUtYTczYy1lM2ExYWE2YjdjYzgiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJLQk8gTE9HTy9LQk8gTE9HTy9kYWlub3MucG5nIiwiaWF0IjoxNzc1OTAxNjcyLCJleHAiOjE4MDc0Mzc2NzJ9.n7ePTJuScqwGTbNG2kIhLuxvuFWnKFuWxhExHMFSo4c',
        primaryColor: '#073270',
        secondaryColor: '#AF9164',
        textColor: '#FFFFFF'
    },
    '키움 히어로즈': {
        name: '키움 히어로즈',
        id: 'kiwoom',
        logo: 'https://api.mbtiju.com/storage/v1/object/sign/KBO%20LOGO/KBO%20LOGO/imgEmblem11.jpg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV84YmZiZGM2Ny0wNzMxLTQxNDUtYTczYy1lM2ExYWE2YjdjYzgiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJLQk8gTE9HTy9LQk8gTE9HTy9pbWdFbWJsZW0xMS5qcGciLCJpYXQiOjE3NzU5MDE3NTYsImV4cCI6MTgwNzQzNzc1Nn0.0uoDGzP2J-ENWPMrjfG1AeeAALOWosXDfg1mTM9exD0',
        primaryColor: '#820024',
        secondaryColor: '#FFFFFF',
        textColor: '#FFFFFF'
    }
};

export const getTeamInfo = (teamName: string): TeamInfo | undefined => {
    return TEAM_CONFIG[teamName] || Object.values(TEAM_CONFIG).find(t => t.name === teamName);
};
