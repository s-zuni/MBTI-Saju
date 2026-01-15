import { supabase } from '../supabaseClient';
import { calculateSaju } from './saju';

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
    let prompt = "";
    let systemInstruction = "";

    // 1. Prepare Prompts based on Type
    if (type === 'job') {
        systemInstruction = `
        당신은 사주와 MBTI를 결합하여 최고의 커리어 컨설팅을 제공하는 AI 전문가입니다.
        사용자의 생년월일(사주)과 MBTI를 분석하여, 가장 잠재력을 발휘할 수 있는 직업을 추천해주세요.
        
        결과는 반드시 JSON 형식으로 반환해야 합니다:
        {
            "jobs": ["직업1", "직업2", "직업3"],
            "reason": "상세한 분석 내용 (300자 내외). 사용자의 사주 특징(오행 등)과 MBTI 성향을 엮어서 논리적으로 설명."
        }
        `;

        const saju = userProfile.birthDate ? calculateSaju(userProfile.birthDate, userProfile.birthTime) : null;
        prompt = `
        [사용자 정보]
        이름: ${userProfile.name}
        생년월일: ${userProfile.birthDate} ${userProfile.birthTime || '(시간모름)'}
        MBTI: ${userProfile.mbti}
        사주정보: ${saju ? `일주(${saju.dayMaster.korean}), 오행(${JSON.stringify(saju.elementRatio)})` : '정보없음'}
        
        이 사람에게 가장 잘 맞는 직업 3가지와 그 이유를 분석해줘.
        `;
    } else if (type === 'compatibility') {
        systemInstruction = `
        당신은 인간관계와 궁합을 전문적으로 분석하는 AI 카운슬러입니다.
        두 사람의 사주와 MBTI를 바탕으로 관계의 역학, 장점, 주의할 점을 깊이 있게 분석해주세요.
        
        결과는 반드시 JSON 형식으로 반환해야 합니다:
        {
            "score": 85,
            "keywords": "키워드1, 키워드2, 키워드3",
            "desc": "상세한 궁합 분석 내용 (500자 내외). 서로의 성향 차이, 보완점, 더 좋은 관계를 위한 조언 포함."
        }
        `;

        const mySaju = userProfile.birthDate ? calculateSaju(userProfile.birthDate, userProfile.birthTime) : null;
        const partnerSaju = partnerProfile.birthDate ? calculateSaju(partnerProfile.birthDate, partnerProfile.birthTime) : null;

        prompt = `
        [나(User) 정보]
        이름: ${userProfile.name}
        생년월일: ${userProfile.birthDate}
        MBTI: ${userProfile.mbti}
        사주: ${mySaju ? `일주(${mySaju.dayMaster.korean})` : ''}

        [상대방(Partner) 정보]
        이름: ${partnerProfile.name}
        생년월일: ${partnerProfile.birthDate}
        MBTI: ${partnerProfile.mbti}
        사주: ${partnerSaju ? `일주(${partnerSaju.dayMaster.korean})` : ''}
        
        관계: ${partnerProfile.relationshipType || '연인'}
        
        두 사람의 궁합을 분석해줘.
        `;
    }

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
