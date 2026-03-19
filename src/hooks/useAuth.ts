import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Session } from '@supabase/supabase-js';

export const useAuth = () => {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchOrCreateProfile = async (session: Session) => {
        try {
            const { user } = session;

            // Optimization: If profile metadata already exists in the session, skip fetching
            if (user.user_metadata?.mbti && user.user_metadata?.birth_date) {
                return;
            }

            const { data: profile, error: fetchError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

            if (!profile) {
                const { error: upsertError } = await supabase
                    .from('profiles')
                    .upsert({
                        id: user.id,
                        email: user.email,
                        name: user.user_metadata.full_name || user.user_metadata.name || user.user_metadata.user_name || 'User',
                        gender: user.user_metadata.gender || null,
                        mbti: user.user_metadata.mbti || null,
                        birth_date: user.user_metadata.birth_date || null,
                        birth_time: user.user_metadata.birth_time || null,
                        tier: 'free',
                        credits: 0,
                        updated_at: new Date().toISOString(),
                    });
                if (upsertError) throw upsertError;
            }
        } catch (error) {
            console.error('Profile init error:', error);
            // Non-blocking error
        }
    };

    useEffect(() => {
        let isSubscribed = true;

        const initializeAuth = async () => {
            try {
                const { data: { session: currentSession } } = await supabase.auth.getSession();
                if (isSubscribed) {
                    setSession(currentSession);
                    if (currentSession) await fetchOrCreateProfile(currentSession);
                }
            } catch (error) {
                console.error('Auth init error:', error);
            } finally {
                if (isSubscribed) setLoading(false);
            }
        };

        initializeAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
            if (isSubscribed) {
                setSession(currentSession);
                if (currentSession && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED')) {
                    await fetchOrCreateProfile(currentSession);
                }
                setLoading(false); // Ensure loading is false on any auth change
            }
        });

        return () => {
            isSubscribed = false;
            subscription.unsubscribe();
        };
    }, []);

    return { session, loading };
};
