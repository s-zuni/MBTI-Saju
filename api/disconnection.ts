import { createClient } from '@supabase/supabase-js';
import { setNodeCorsHeaders } from './_utils/cors';

/**
 * Toss Mini-app Disconnection Callback Handler
 * 
 * This endpoint is called by Toss when a user disconnects the service.
 * It updates the user's status in the 'profiles' table to ensure data isolation
 * and proper service state management.
 * 
 * Documentation: https://developers-apps-in-toss.toss.im/login/console.html#_4-연결-끊기-콜백-정보
 */

export default async function handler(req: any, res: any) {
    // 1. Handle CORS
    setNodeCorsHeaders(res);
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // 2. Validate Basic Auth (Security)
    // Toss sends the custom Basic Auth header you configured in the console.
    const authHeader = req.headers.authorization;
    const expectedAuth = process.env.TOSS_CALLBACK_AUTH;

    if (expectedAuth && authHeader !== expectedAuth) {
        console.warn('[Disconnection] Unauthorized request attempt');
        return res.status(401).json({
            success: false,
            message: 'Unauthorized: Invalid Basic Auth header.'
        });
    }

    // 3. Validate Method
    if (req.method !== 'POST') {
        return res.status(405).json({
            success: false,
            message: 'Method Not Allowed. Use POST.'
        });
    }

    // 3. Initialize Supabase Admin Client
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('[Disconnection] Missing Supabase configuration');
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error: Missing configuration.'
        });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    try {
        // 4. Extract User Identifier
        // Toss sends userKey and referrer in the POST body
        const { userKey, user_id, referrer } = req.body;
        const targetUserId = userKey || user_id;

        if (!targetUserId) {
            return res.status(400).json({
                success: false,
                message: 'Missing user identifier (userKey or user_id).'
            });
        }

        console.log(`[Disconnection] Processing disconnection for user: ${targetUserId}, Referrer: ${referrer}`);

        // 5. Update User Profile
        // We set is_active to false and record the unlinked timestamp.
        // This does not delete the user data but marks the Toss connection as inactive.
        const { error } = await supabaseAdmin
            .from('profiles')
            .update({
                is_active: false,
                unlinked_at: new Date().toISOString()
            })
            .eq('id', targetUserId);

        if (error) {
            console.error('[Disconnection] Database update failed:', error);
            throw error;
        }

        // 6. Return Success
        return res.status(200).json({
            success: true,
            message: 'Successfully processed disconnection callback.'
        });

    } catch (error: any) {
        console.error('[Disconnection] Unexpected error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error',
            error: error.message
        });
    }
}
