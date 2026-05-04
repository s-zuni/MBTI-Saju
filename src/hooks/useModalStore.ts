import { useState, useCallback, useEffect } from 'react';

export type ModalType =
    | 'analysis'
    | 'fortune'
    | 'mbtiSaju'
    | 'recommendation'
    | 'compatibility'
    | 'trip'
    | 'naming'
    | 'cherry'
    | 'tarot'
    | 'creditPurchase'
    | 'onboarding'
    | 'deepReport'

    | 'deepReportEvent'
    | 'kbo';

export interface ModalState {
    isOpen: boolean;
    mode?: any;
    data?: any;
}

// Global state outside the hook to act as a singleton
let globalModals: Record<string, ModalState> = {
    analysis: { isOpen: false, mode: 'signup' },
    fortune: { isOpen: false },
    mbtiSaju: { isOpen: false },
    recommendation: { isOpen: false },
    compatibility: { isOpen: false },
    trip: { isOpen: false },
    naming: { isOpen: false },
    cherry: { isOpen: false },
    tarot: { isOpen: false },
    creditPurchase: { isOpen: false },
    onboarding: { isOpen: false },
    deepReport: { isOpen: false },

    deepReportEvent: { isOpen: false },
    kbo: { isOpen: false },
};

// Listeners to notify hooks of changes
let listeners: Array<(state: Record<string, ModalState>) => void> = [];

const notifyListeners = () => {
    listeners.forEach((listener) => listener({ ...globalModals }));
};

export const useModalStore = () => {
    const [modals, setModals] = useState<Record<string, ModalState>>(globalModals);

    useEffect(() => {
        listeners.push(setModals);
        return () => {
            listeners = listeners.filter((li) => li !== setModals);
        };
    }, []);

    const openModal = useCallback((type: ModalType, mode?: any, data?: any) => {
        globalModals = {
            ...globalModals,
            [type]: { isOpen: true, mode, data },
        };
        notifyListeners();
    }, []);

    const closeModal = useCallback((type: ModalType) => {
        globalModals = {
            ...globalModals,
            [type]: { ...globalModals[type], isOpen: false },
        };
        notifyListeners();
    }, []);

    const closeAllModals = useCallback(() => {
        const newState = { ...globalModals };
        Object.keys(newState).forEach((key) => {
            newState[key] = { ...newState[key], isOpen: false };
        });
        globalModals = newState;
        notifyListeners();
    }, []);

    return {
        isAnyModalOpen: Object.values(modals).some((m) => m.isOpen),
        modals,
        openModal,
        closeModal,
        closeAllModals,
    };
};
