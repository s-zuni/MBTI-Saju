import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText, convertToModelMessages } from 'ai';
import { calculateSaju } from './_utils/saju';

export const config = {
    runtime: 'edge',
};

export default async (req: Request) => {
    const corsHeaders = {
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
        'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization',
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405, headers: corsHeaders });
    }

    try {
        const body = await req.json();
        const { message, mbti, birthDate, birthTime, name, gender, messages, pastContext } = body;
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.REACT_APP_GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

        if (!GEMINI_API_KEY) {
            return new Response(JSON.stringify({ error: '서버 설정 오류: GEMINI_API_KEY가 누락되었습니다.' }), { status: 500, headers: corsHeaders });
        }

        // Calculate Saju
        let sajuInfo = "Saju information not available";
        if (birthDate) {
            try {
                const saju = calculateSaju(birthDate, birthTime);
                sajuInfo = `
                - Day Master (Il-Gan): ${saju.dayMaster.korean} (${saju.dayMaster.description})
                - Five Elements: Wood ${saju.elementRatio.wood}%, Fire ${saju.elementRatio.fire}%, Earth ${saju.elementRatio.earth}%, Metal ${saju.elementRatio.metal}%, Water ${saju.elementRatio.water}%
                `;
            } catch (e) {
                console.error("Saju Calculation Error", e);
            }
        }

        const systemPrompt = `
        You are a deeply analytical "Saju & MBTI Counselor" who provides realistic and fact-based insights.
        Your goal is to provide logical and objective counseling based on the user's data. Avoid vague comfort or ambiguous answers.
        
        **CRITICAL RULE**: 
        - DO NOT USE markdown bold formatting (double asterisks like **text**) in your response under any circumstances.
        - NEVER use **. If you need to emphasize, use bullet points or structured sentences.
        
        **USER PROFILE**:
        - Name: ${name || 'User'}
        - MBTI: ${mbti || 'Unknown'}
        - Gender: ${gender || 'Unknown'}
        - Birth: ${birthDate} ${birthTime || ''}
        
        **SAJU INFO**:
        ${sajuInfo}
 
        ${pastContext ? `**PAST CONSULTATION MEMORY**:
        The following is a brief history of past interactions with this user:
        ${pastContext}\n` : ''}
 
        **PERSONA GUIDELINES**:
        1. **Identity**: You are a professional analyzer of fate. You decode the complex interplay between cosmic energy (Saju) and psychological patterns (MBTI).
        2. **Tone**: Realistic, objective, and somewhat "cold" in your analysis, but delivered in a polite, respectful manner. Use formal yet gentle Korean (~해요 style).
        3. **Fact-Based Analysis**: Provide deep, specific insights. If the data shows challenges, state them clearly. Do not offer general or ambiguous advice. End with a constructive perspective.
        4. **Holistic Integration**: Seamlessly combine Saju elements (Five Elements, Day Master) and MBTI traits. Provide examples of how these interact in the user's specific context.
 
        **FORMATTING RULES**:
        - Use emojis (🌿, 🔥, 💧, ✨) sparingly to add atmosphere.
        - **심층적이고 풍부한 분석**: 사용자의 질문에 대해 최소 3~4개의 명확한 관점이나 포인트(예: 1년차, 2년차 조언 등)를 포함하여 깊이 있게 분석하세요. 답변의 전체 분량은 공백 포함 약 600~800자 정도로 상세해야 합니다.
        - **절대적 금지 사항 (CRITICAL)**: 답변 어디에도 마크다운 강조 기호인 별표 두 개(**)를 절대로 사용하지 마세요. 대신 문단 구분, 줄바꿈, 이모지, 글머리 기호(1., 2., •) 등을 사용하여 가독성을 높이세요. ** 을 사용하면 시스템 오류가 발생하니 주의하세요.
        - **Language**: Korean Only.
        `;

        const google = createGoogleGenerativeAI({ apiKey: GEMINI_API_KEY });
        
        const coreMessages = messages ? await convertToModelMessages(messages.slice(-10)) : [];
        if (coreMessages.length === 0 || (coreMessages[coreMessages.length - 1] as any).role !== 'user') {
            (coreMessages as any).push({ role: 'user', content: message });
        }

        const result = await streamText({
            model: google('gemini-2.5-flash'),
            system: systemPrompt,
            messages: coreMessages as any,
        });

        return result.toTextStreamResponse({ headers: corsHeaders });
    } catch (error: any) {
        console.error('ChatServer Error:', error);
        return new Response(JSON.stringify({ error: error.message || "채팅 분석 중 오류가 발생했습니다." }), { status: 500, headers: corsHeaders });
    }
};
