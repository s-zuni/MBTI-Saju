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

export const useAuth = () => {
    const [state, setState] = useState({ session: globalSession, loading: globalLoading });

    useEffect(() => {
        // Subscribe to global state changes
        listeners.push(setState);

        if (!isAuthInitialized) {
            isAuthInitialized = true;

            const initializeAuth = async () => {
                // Safety timeout: If Supabase local storage is partitioned/hanging on Safari,
                // forcefully release the loading state after 5 seconds.
                const timeoutId = setTimeout(() => {
                    console.warn('Auth initialization timeout triggered. Forcing loading to false.');
                    setGlobalState(globalSession, false);
                }, 5000);

                try {
                    const { data: { session: currentSession } } = await supabase.auth.getSession();
                    setGlobalState(currentSession, true); // Keep loading true while fetching profile
                    
                    if (currentSession) {
                        fetchOrCreateProfile(currentSession).catch(err => console.error('Non-blocking profile fetch error:', err));
                    }
                } catch (error) {
                    console.error('Auth init error:', error);
                } finally {
                    clearTimeout(timeoutId);
                    setGlobalState(globalSession, false);
                }
            };

            initializeAuth();

            supabase.auth.onAuthStateChange(async (event, currentSession) => {
                setGlobalState(currentSession, globalLoading); // Update session, maintain loading
                
                if (currentSession && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED')) {
                    fetchOrCreateProfile(currentSession).catch(err => console.error('Non-blocking profile sync error:', err));
                }
                
                setGlobalState(currentSession, false); // Ensure loading is false on any auth change
            });
        }

        return () => {
            // Unsubscribe on unmount
            listeners = listeners.filter((li) => li !== setState);
        };
    }, []);

    return { session: state.session, loading: state.loading };
};
