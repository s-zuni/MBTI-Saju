import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '../supabaseClient';
import { calculateSaju } from './saju';

const API_KEY = process.env.REACT_APP_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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
    // 1. Save User Message
    await supabase.from('chat_messages').insert({
        session_id: sessionId,
        role: 'user',
        content: userMessage
    });

    // 2. Prepare Context & Prompt
    let sajuText = "";
    if (userContext.birthDate) {
        try {
            const saju = calculateSaju(userContext.birthDate, userContext.birthTime);
            sajuText = `사용자 사주: 일주(${saju.dayMaster.korean}), 오행분포(목${saju.elementRatio.wood}%, 화${saju.elementRatio.fire}%, 토${saju.elementRatio.earth}%, 금${saju.elementRatio.metal}%, 수${saju.elementRatio.water}%)`;
        } catch (e) { }
    }

    const systemPrompt = `
    당신은 신비롭고 지혜로운 'AI 운명 상담사'입니다.
    사용자의 MBTI(${userContext.mbti || '알수없음'})와 사주 정보(${sajuText})를 바탕으로 고민을 들어주고 조언해줍니다.
    
    1. 공감하기: 먼저 사용자의 감정에 깊이 공감해주세요.
    2. 융합 분석: MBTI(심리)와 사주(운명)를 엮어서 설명해주세요. (예: "INFJ의 직관과 화(Fire)의 열정이 만나...")
    3. 말투: 따뜻하고 정중한 존댓말(~해요체). 신비로운 느낌을 주되 위로가 되어야 합니다.
    4. 길이: 너무 길지 않게, 모바일에서 읽기 편하게 답변해주세요.
    `;

    // 3. Call Gemini
    try {
        const chat = model.startChat({
            history: history.map(h => ({
                role: h.role === 'user' ? 'user' : 'model',
                parts: [{ text: h.content }]
            })),
            systemInstruction: systemPrompt
        });

        const result = await chat.sendMessage(userMessage);
        const responseText = result.response.text();

        // 4. Save Bot Response
        await supabase.from('chat_messages').insert({
            session_id: sessionId,
            role: 'assistant', // Supabase enum uses 'assistant', Gemini uses 'model'
            content: responseText
        });

        // Update session timestamp
        await supabase.from('chat_sessions').update({ updated_at: new Date() }).eq('id', sessionId);

        return responseText;

    } catch (error) {
        console.error("Gemini API Error", error);
        return "죄송합니다. 신령님과의 연결이 잠시 약해졌습니다. 잠시 후 다시 말씀해 주세요.";
    }
};
