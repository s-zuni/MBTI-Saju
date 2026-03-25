import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Session } from '@supabase/supabase-js';

// Global state outside the hook to act as a singleton
let globalSession: Session | null = null;
let globalLoading = true;
let isAuthInitialized = false;

// Listeners to notify hooks of changes
let listeners: Array<(state: { session: Session | null; loading: boolean }) => void> = [];

// Global callbacks for TOKEN_REFRESHED event (used by useCredits etc.)
let tokenRefreshCallbacks: Array<() => void> = [];

export const onTokenRefreshed = (callback: () => void) => {
    tokenRefreshCallbacks.push(callback);
    return () => {
        tokenRefreshCallbacks = tokenRefreshCallbacks.filter((cb) => cb !== callback);
    };
};

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
                    // Step 1: Quick cache check
                    const { data: { session: cachedSession } } = await supabase.auth.getSession();

                    if (cachedSession) {
                        // Step 2: Validate token server-side with getUser()
                        // This is critical for Safari ITP where cached tokens may be stale
                        const { data: { user }, error: userError } = await supabase.auth.getUser();

                        if (userError || !user) {
                            // Token is invalid/expired → try refreshing
                            console.log('[useAuth] Cached token invalid, attempting refresh...');
                            const { data: refreshData } = await supabase.auth.refreshSession();
                            setGlobalState(refreshData.session, true);

                            if (refreshData.session) {
                                await fetchOrCreateProfile(refreshData.session).catch(err => console.error(err));
                            }
                        } else {
                            // Token is valid
                            setGlobalState(cachedSession, true);
                            await fetchOrCreateProfile(cachedSession).catch(err => console.error(err));
                        }
                    } else {
                        // No cached session at all
                        setGlobalState(null, true);
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
                    fetchOrCreateProfile(currentSession).catch(err => console.error(err));
                }

                // TOKEN_REFRESHED event: notify other hooks to re-fetch data
                if (event === 'TOKEN_REFRESHED') {
                    console.log('[useAuth] Token refreshed, notifying data hooks...');
                    tokenRefreshCallbacks.forEach(cb => {
                        try { cb(); } catch (e) { console.error('Token refresh callback error:', e); }
                    });
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

