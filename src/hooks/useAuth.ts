import { useState, useEffect } from 'react';
import { supabase, ensureValidSession } from '../supabaseClient';
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
                const timeoutThreshold = 5000; // 5초 타임아웃
                
                try {
                    // Step 1: Unified session check via ensureValidSession
                    const cachedSession = await ensureValidSession();

                    if (cachedSession) {
                        // Step 2: Validate token server-side with getUser() (with shorter timeout)
                        const userResult = await Promise.race([
                            supabase.auth.getUser(),
                            new Promise((_, reject) => setTimeout(() => reject(new Error('User Validate Timeout')), timeoutThreshold))
                        ]) as { data: { user: any }, error: any };

                        const { data: { user }, error: userError } = userResult;

                        if (userError || !user) {
                            console.log('[useAuth] Cached token invalid or timeout, attempting refresh...');
                            const { data: refreshData } = await supabase.auth.refreshSession();
                            setGlobalState(refreshData.session, true);

                            if (refreshData.session) {
                                await fetchOrCreateProfile(refreshData.session).catch(err => console.error(err));
                            }
                        } else {
                            setGlobalState(cachedSession, true);
                            await fetchOrCreateProfile(cachedSession).catch(err => console.error(err));
                        }
                    } else {
                        setGlobalState(null, true);
                    }
                } catch (error: any) {
                    console.error('[useAuth] Auth init error/timeout:', error.message);
                    // 타임아웃 발생 시에도 로딩을 풀고 앱 진행 허용
                    if (error.message.includes('Timeout')) {
                        console.warn('[useAuth] Safari ITP detected, proceeding with null session');
                    }
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

