import { useState, useCallback } from 'react';

export type ModalType =
    | 'analysis'
    | 'fortune'
    | 'mbtiSaju'
    | 'recommendation'
    | 'compatibility'
    | 'trip'
    | 'healing'
    | 'job'
    | 'tarot'
    | 'coinPurchase'
    | 'onboarding';

export interface ModalState {
    isOpen: boolean;
    mode?: any;
    data?: any;
}

export const useModalStore = () => {
    const [modals, setModals] = useState<Record<string, ModalState>>({
        analysis: { isOpen: false, mode: 'signup' },
        fortune: { isOpen: false },
        mbtiSaju: { isOpen: false },
        recommendation: { isOpen: false },
        compatibility: { isOpen: false },
        trip: { isOpen: false },
        healing: { isOpen: false },
        job: { isOpen: false },
        tarot: { isOpen: false },
        coinPurchase: { isOpen: false },
        onboarding: { isOpen: false },
    });

    const openModal = useCallback((type: ModalType, mode?: any, data?: any) => {
        setModals((prev) => ({
            ...prev,
            [type]: { isOpen: true, mode, data },
        }));
    }, []);

    const closeModal = useCallback((type: ModalType) => {
        setModals((prev) => ({
            ...prev,
            [type]: { ...prev[type], isOpen: false },
        }));
    }, []);

    const closeAllModals = useCallback(() => {
        setModals((prev) => {
            const newState = { ...prev };
            Object.keys(newState).forEach((key) => {
                newState[key] = { ...newState[key], isOpen: false };
            });
            return newState;
        });
    }, []);

    return {
        modals,
        openModal,
        closeModal,
        closeAllModals,
    };
};
