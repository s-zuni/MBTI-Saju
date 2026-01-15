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

    // 2. Call Gemini
    try {
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            systemInstruction: { role: 'system', parts: [{ text: systemInstruction }] },
            generationConfig: { responseMimeType: "application/json" } // Force JSON output
        });

        const responseText = result.response.text();
        return JSON.parse(responseText);
    } catch (error) {
        console.error("Gemini Analysis Error", error);
        throw new Error("AI 분석 중 오류가 발생했습니다.");
    }
};
