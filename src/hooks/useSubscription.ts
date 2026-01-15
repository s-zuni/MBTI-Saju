import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Session } from '@supabase/supabase-js';

export type Tier = 'free' | 'basic' | 'deep';

export const TIERS = {
    FREE: 'free',
    BASIC: 'basic',
    DEEP: 'deep'
} as const;

export const FEATURES = {
    TODAY_FORTUNE: 'today_fortune',
    MY_PAGE: 'my_page',
    COMMUNITY: 'community',
    STORE: 'store',
    MBTI_SAJU_ANALYSIS: 'mbti_saju_analysis',
    TRIP: 'trip',
    HEALING: 'healing',
    JOB: 'job',
    COMPATIBILITY: 'compatibility',
    TAROT: 'tarot',
    AI_CHAT: 'ai_chat'
} as const;

type FeatureKey = typeof FEATURES[keyof typeof FEATURES];

const TIER_ACCESS: Record<Tier, FeatureKey[]> = {
    [TIERS.FREE]: [
        FEATURES.TODAY_FORTUNE,
        FEATURES.MY_PAGE,
        FEATURES.COMMUNITY,
        FEATURES.STORE
    ],
    [TIERS.BASIC]: [
        FEATURES.TODAY_FORTUNE,
        FEATURES.MY_PAGE,
        FEATURES.COMMUNITY,
        FEATURES.STORE,
        FEATURES.MBTI_SAJU_ANALYSIS,
        FEATURES.TRIP,
        FEATURES.HEALING,
        FEATURES.JOB,
        FEATURES.COMPATIBILITY
    ],
    [TIERS.DEEP]: [
        FEATURES.TODAY_FORTUNE,
        FEATURES.MY_PAGE,
        FEATURES.COMMUNITY,
        FEATURES.STORE,
        FEATURES.MBTI_SAJU_ANALYSIS,
        FEATURES.TRIP,
        FEATURES.HEALING,
        FEATURES.JOB,
        FEATURES.COMPATIBILITY,
        FEATURES.TAROT,
        FEATURES.AI_CHAT
    ]
};

export const useSubscription = (session: Session | null) => {
    const [tier, setTier] = useState<Tier>('free');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!session) {
            setTier('free');
            setLoading(false);
            return;
        }

        const fetchProfile = async () => {
            try {
                const { data } = await supabase
                    .from('profiles')
                    .select('tier')
                    .eq('id', session.user.id)
                    .single();

                if (data) {
                    setTier(data.tier as Tier);
                }
            } catch (err) {
                console.error('Error fetching subscription:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [session]);

    const checkAccess = (feature: FeatureKey) => {
        // Deep tier has access to everything in Basic and Free logic above handles it via explicit lists
        // Ideally we check if the feature exists in the list for the current tier
        return TIER_ACCESS[tier].includes(feature);
    };

    return { tier, loading, checkAccess };
};
