export type Gender = 'male' | 'female';
export type DayBoundary = 'jasi' | 'splitJasi' | 'midnight';

export interface PillarDetail {
    gan: string;
    zhi: string;
    ganHanja: string;
    zhiHanja: string;
    ganKorean: string;
    zhiKorean: string;
    ganElement: string;
    zhiElement: string;
    ganShiShen: string;
    zhiShiShen: string;
    hiddenStems: string[];
    twelveStages: string;
    twelveSpirits: string;
}

export interface DayMasterInfo {
    korean: string;
    chinese: string;
    element: string;
    polarity: string;
    description: string;
}

export interface FiveElementsCount {
    wood: number;
    fire: number;
    earth: number;
    metal: number;
    water: number;
}

export interface FiveElementsRatio {
    wood: number;
    fire: number;
    earth: number;
    metal: number;
    water: number;
}

export interface LuckPillarItem {
    age: number;
    stem: string;
    branch: string;
    korean: string;
    hanja: string;
}

export interface LuckPillarsData {
    forward: boolean;
    startAge: number;
    startYears: number;
    startMonths: number;
    pillars: LuckPillarItem[];
}

export interface PreciseSajuData {
    ganZhi: {
        year: string;
        month: string;
        day: string;
        hour: string;
    };
    ganZhiHanja: {
        year: string;
        month: string;
        day: string;
        hour: string;
    };
    dayMaster: DayMasterInfo;
    pillars: {
        year: PillarDetail;
        month: PillarDetail;
        day: PillarDetail;
        hour: PillarDetail;
    };
    elements: FiveElementsCount;
    elementRatio: FiveElementsRatio;
    voidBranches: string[];
    luckPillars?: LuckPillarsData;
    trueSolarTimeApplied: boolean;
    dayBoundaryRule: string;
}

export interface SajuInput {
    birthDate: string;
    birthTime?: string | null;
    gender?: Gender | string;
    isLunar?: boolean;
    isLeapMonth?: boolean;
    longitude?: number;
    dayBoundary?: DayBoundary;
}
