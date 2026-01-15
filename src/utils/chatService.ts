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
    // 1. Save User Message locally for optimism (optional, but we save to DB here)
    await supabase.from('chat_messages').insert({
        session_id: sessionId,
        role: 'user',
        content: userMessage
    });

    try {
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
                messages: history // Pass history for context
            })
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.statusText}`);
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
        console.error("Chat Service Error", error);
        return "죄송합니다. 신령님과의 연결이 잠시 약해졌습니다. (서버 연결 실패)";
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
        const response = await fetch('/api/analysis', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ type, userProfile, partnerProfile })
        });

        if (!response.ok) {
            throw new Error(`Analysis API Error: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error("Analysis Service Error", error);
        throw new Error("AI 분석 중 오류가 발생했습니다.");
    }
};
