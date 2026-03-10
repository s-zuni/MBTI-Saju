import { supabase } from '../supabaseClient';


export interface ChatMessage {
    id: string; // UUID from DB or temp ID
    role: 'user' | 'assistant';
    content: string;
    createdAt: Date;
}

export interface ChatSession {
    id: string;
    title: string;
    updatedAt: Date;
}

/**
 * Creates a new chat session in Supabase
 */
export const createSession = async (userId: string, firstMessage?: string): Promise<string | null> => {
    try {
        const title = firstMessage ? firstMessage.substring(0, 30) + (firstMessage.length > 30 ? '...' : '') : '새로운 상담';
        const { data, error } = await supabase
            .from('chat_sessions')
            .insert({ user_id: userId, title })
            .select('id')
            .single();

        if (error) throw error;
        return data.id;
    } catch (error) {
        console.error("Failed to create session", error);
        return null;
    }
};

/**
 * Loads messages for a session
 */
export const loadMessages = async (sessionId: string): Promise<ChatMessage[]> => {
    try {
        const { data, error } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: true });

        if (error) throw error;

        return data.map((msg: any) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            createdAt: new Date(msg.created_at)
        }));
    } catch (error) {
        console.error("Failed to load messages", error);
        return [];
    }
};

/**
 * Sends a message to Gemini and saves context to Supabase
 */
export const sendMessage = async (
    sessionId: string,
    userMessage: string,
    history: ChatMessage[],
    userContext: any
): Promise<string> => {
    // 1. Save User Message locally
    await supabase.from('chat_messages').insert({
        session_id: sessionId,
        role: 'user',
        content: userMessage
    });

    try {
        let pastContext = '';
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: sessions } = await supabase.from('chat_sessions')
                .select('id').eq('user_id', user.id).neq('id', sessionId)
                .order('created_at', { ascending: false }).limit(3);

            if (sessions && sessions.length > 0) {
                const sessionIds = sessions.map(s => s.id);
                const { data: msgs } = await supabase.from('chat_messages')
                    .select('*').in('session_id', sessionIds)
                    .order('created_at', { ascending: false }).limit(5);
                if (msgs && msgs.length > 0) {
                    pastContext = msgs.reverse().map(m => `${m.role === 'user' ? '사용자' : '신령님'}: ${m.content}`).join('\n');
                }
            }
        }

        // 2. Call Backend API
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: userMessage,
                mbti: userContext.mbti,
                birthDate: userContext.birthDate,
                birthTime: userContext.birthTime,
                name: userContext.name,
                gender: userContext.gender,
                pastContext: pastContext,
                messages: history // Pass history for context
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error("API Error Details:", {
                status: response.status,
                statusText: response.statusText,
                data: errorData
            });
            throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorData.details || 'Unknown error'}`);
        }

        const data = await response.json();
        const responseText = data.reply;

        // 3. Save Bot Response to DB
        await supabase.from('chat_messages').insert({
            session_id: sessionId,
            role: 'assistant',
            content: responseText
        });

        // Update session timestamp
        await supabase.from('chat_sessions').update({ updated_at: new Date() }).eq('id', sessionId);

        return responseText;

    } catch (error) {
        console.error("Chat Service Error:", error);
        return `죄송합니다. 신령님과의 연결이 잠시 약해졌습니다. (오류: ${error instanceof Error ? error.message : '알 수 없는 오류'})`;
    }
};

/**
 * Generates specific analysis (Job, Compatibility) using Gemini
 */
export const getDetailedAnalysis = async (
    type: 'job' | 'compatibility',
    userProfile: any,
    partnerProfile?: any
): Promise<any> => {
    // 1. Prepare Prompts based on Type (Logic moved to Backend)
    // We just pass the profile data to the API as is.


    // 2. Call Backend API for Analysis
    try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const url = type === 'job' ? '/api/job' : '/api/compatibility';
        const bodyPayload = type === 'job'
            ? { ...userProfile }
            : { myProfile: userProfile, partnerProfile, relationshipType: partnerProfile?.relationshipType || 'lover' };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify(bodyPayload)
        });

        if (!response.ok) {
            const errBase = await response.json().catch(() => ({}));
            throw new Error(`Analysis API Error: ${errBase.error || response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error("Analysis Service Error", error);
        throw new Error("심층 분석 중 오류가 발생했습니다.");
    }
};
