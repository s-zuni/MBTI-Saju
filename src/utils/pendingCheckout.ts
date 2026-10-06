// 결제창을 열었지만 완료하지 못한 크레딧 구매를 기억해 이어서 결제할 수 있게 한다.
const KEY = 'mbtiju_pending_checkout';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export interface PendingCheckout {
    planId: string;
    credits: number;
    price: number;
    ts: number;
}

export const savePendingCheckout = (p: Omit<PendingCheckout, 'ts'>) => {
    try {
        localStorage.setItem(KEY, JSON.stringify({ ...p, ts: Date.now() }));
    } catch {
        // ignore
    }
};

export const loadPendingCheckout = (): PendingCheckout | null => {
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return null;
        const p = JSON.parse(raw);
        if (typeof p?.planId !== 'string' || typeof p?.ts !== 'number' || Date.now() - p.ts > MAX_AGE_MS) {
            localStorage.removeItem(KEY);
            return null;
        }
        return p as PendingCheckout;
    } catch {
        return null;
    }
};

export const clearPendingCheckout = () => {
    try {
        localStorage.removeItem(KEY);
    } catch {
        // ignore
    }
};
