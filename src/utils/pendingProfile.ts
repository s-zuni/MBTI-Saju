// 가입 전 맛보기에서 입력한 값을 가입 후 프로필 완성 단계에서 재사용하기 위한 임시 저장소
const KEY = 'mbtiju_pending_profile';

export interface PendingProfile {
    birthDate: string;
    gender: string;
    mbti?: string | undefined;
}

export const savePendingProfile = (p: PendingProfile) => {
    try {
        localStorage.setItem(KEY, JSON.stringify(p));
    } catch {
        // 저장소 접근 불가 시 무시 (프로필 단계에서 직접 입력)
    }
};

export const loadPendingProfile = (): PendingProfile | null => {
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return null;
        const p = JSON.parse(raw);
        if (typeof p?.birthDate !== 'string' || typeof p?.gender !== 'string') return null;
        return p;
    } catch {
        return null;
    }
};

export const clearPendingProfile = () => {
    try {
        localStorage.removeItem(KEY);
    } catch {
        // ignore
    }
};
