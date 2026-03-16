import { useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Session } from '@supabase/supabase-js';

const THIRTY_MINUTES = 30 * 60 * 1000;

/**
 * Hook to automatically log out the user after a period of inactivity.
 */
export const useInactivityLogout = (session: Session | null) => {
    const lastActivityRef = useRef<number>(Date.now());

    useEffect(() => {
        if (!session) return;

        const updateActivity = () => {
            lastActivityRef.current = Date.now();
        };

        // Track various user interactions
        window.addEventListener('mousemove', updateActivity);
        window.addEventListener('keydown', updateActivity);
        window.addEventListener('click', updateActivity);
        window.addEventListener('touchstart', updateActivity);
        window.addEventListener('scroll', updateActivity);

        const checkInactivity = setInterval(async () => {
            const now = Date.now();
            if (now - lastActivityRef.current > THIRTY_MINUTES) {
                console.log('Inactivity timeout reached. Logging out...');
                await supabase.auth.signOut({ scope: 'local' });
                window.location.href = '/';
            }
        }, 60000); // Check every minute

        return () => {
            window.removeEventListener('mousemove', updateActivity);
            window.removeEventListener('keydown', updateActivity);
            window.removeEventListener('click', updateActivity);
            window.removeEventListener('touchstart', updateActivity);
            window.removeEventListener('scroll', updateActivity);
            clearInterval(checkInactivity);
        };
    }, [session]);
};
