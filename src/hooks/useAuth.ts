import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Session } from '@supabase/supabase-js';

// Global state outside the hook to act as a singleton
let globalSession: Session | null = null;
let globalLoading = true;
let isAuthInitialized = false;

// Listeners to notify hooks of changes
let listeners: Array<(state: { session: Session | null; loading: boolean }) => void> = [];

const notifyListeners = () => {
    listeners.forEach((listener) => listener({ session: globalSession, loading: globalLoading }));
};

const setGlobalState = (session: Session | null, loading: boolean) => {
    globalSession = session;
    globalLoading = loading;
    notifyListeners();
};

const fetchOrCreateProfile = async (currentSession: Session) => {
    try {
        const { user } = currentSession;

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
    }
};

export const useAuth = () => {
    const [state, setState] = useState({ session: globalSession, loading: globalLoading });

    useEffect(() => {
        listeners.push(setState);

        if (!isAuthInitialized) {
            isAuthInitialized = true;

            const initializeAuth = async () => {
                try {
                    // Safari ITP Retry Logic: Sometimes storage takes a moment to be available
                    let currentSession = null;
                    let retries = 0;
                    
                    while (retries < 3) {
                        const { data: { session } } = await supabase.auth.getSession();
                        if (session) {
                            currentSession = session;
                            break;
                        }
                        retries++;
                        if (retries < 3) await new Promise(resolve => setTimeout(resolve, 500));
                    }

                    setGlobalState(currentSession, true); // Loading visually until profile sync check
                    
                    if (currentSession) {
                        await fetchOrCreateProfile(currentSession).catch(err => console.error(err));
                    }
                } catch (error) {
                    console.error('Auth init error:', error);
                } finally {
                    setGlobalState(globalSession, false);
                }
            };

            initializeAuth();

            supabase.auth.onAuthStateChange(async (event, currentSession) => {
                if (currentSession && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED')) {
                    // Profile fetch might run in background
                    fetchOrCreateProfile(currentSession).catch(err => console.error(err));
                }
                setGlobalState(currentSession, false);
            });
        }

        return () => {
            listeners = listeners.filter((li) => li !== setState);
        };
    }, []);

    return { session: state.session, loading: state.loading };
};
