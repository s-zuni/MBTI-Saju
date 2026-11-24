import { streamText } from 'ai';
import { getPreciseSajuData, buildRichSajuContext } from './_utils/saju';
import { corsHeaders, handleCors, getCorsHeaders } from './_utils/cors';
import {
    getAIProvider,
    isRetryableAIError,
    BASE_SYSTEM_PROMPT,
    getTemporalAnchorBlock,
    formatMbtiForPrompt,
} from './_utils/ai-provider';
import { authenticateUser, getSupabaseAdmin, releaseServiceReceipt } from './_utils/auth';

export const config = {
    runtime: 'edge',
};

// 정적 시스템 프롬프트 (OpenAI Prompt Caching 최적화: 1024+ 토큰 정적 접두사 유지)
const STATIC_CHAT_SYSTEM_PROMPT = `
${BASE_SYSTEM_PROMPT}

오직 데이터(사주+성향)에 기반해 현실적이고 냉정한 진단과 따뜻한 조언을 함께 전하는 심층 상담을 제공하세요.

[AI 사주 직접 계산 엄금]
★ 중요: 사주 원국이나 오행을 절대 스스로 재계산하지 말고, 사용자 메시지에 제공된 사주 데이터만을 100% 진실로 적용하세요.

[어투]
- ~해요 체, 현실적이고 직설적이되 말 끝은 따뜻하게 감싸는 태도
- 서론 없이 바로 핵심부터 시작할 것
- 빈말 칭찬 금지, 데이터 기반 팩트와 구체적 대처법 + 담백한 위로 중심

[분석 원칙]
- 제공된 [시간적 기준 정보](올해 2026년 병오년, 내년 2027년 정미년)를 기준으로 시기를 판단하세요. 2023/2024/2025년을 올해로 언급 금지.
- 사주 진단 -> 성향/행동 패턴 결합 -> 현실 해결책 + 따뜻한 당부 순으로 답변하세요.

[언어 및 형식 규칙 - 중요]
- 모든 분석 내용은 반드시 한국어만 사용하세요. (MBTI 용어 제외)
- 오행(목, 화, 토, 금, 수)을 언급할 때 영어(Wood, Fire 등)를 절대 사용하지 마세요.
- 한국어 단어 뒤에 영어 번역을 괄호로 병기하지 마세요. (예: "목(Wood)" (X), "목(木)" (O))
- 별표 두 개(**) 및 마크다운 특수문자(__, # 등)와 이모티콘/이모지 사용 절대 금지
- 나열이 필요하면 글머리 기호(-)와 숫자(1. 2.)만 사용하고 문단 사이를 \\n\\n로 넉넉히 띄우세요.
`.trim();

export default async (req: Request) => {
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    const reqCorsHeaders = getCorsHeaders(req);

    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { 
            status: 405, 
            headers: reqCorsHeaders 
        });
    }

    let receiptToRelease: string | null = null;
    let supabaseForRelease: any = null;

    try {
        const body = await req.json().catch(() => ({}));
        const { sessionId, message, mbti, birthDate, birthTime, name, gender, messages, pastContext } = body;

        // 1. 호출자 인증 및 AI_CHAT_5 결제 티켓(5회권) 검증
        const authCheck = await authenticateUser(req, {
            allowAnonymous: true,
            serviceType: 'AI_CHAT_5',
            allowedServiceTypes: ['AI_CHAT_5'],
            requirePaymentReceipt: true,
        });
        if (authCheck.errorResponse) {
            return authCheck.errorResponse;
        }
        receiptToRelease = authCheck.receiptToken ?? null;
        supabaseForRelease = authCheck.supabaseAdmin;

        const userId = authCheck.user?.id || null;
        const isGuestSession = !userId || !sessionId || String(sessionId).startsWith('guest_');

        if (!sessionId) {
            await releaseServiceReceipt(supabaseForRelease, receiptToRelease);
            return new Response(JSON.stringify({ error: '유효한 채팅 세션(sessionId)이 필요합니다.' }), { 
                status: 400, 
                headers: reqCorsHeaders 
            });
        }

        const supabaseAdmin = getSupabaseAdmin();

        if (!isGuestSession) {
            const { data: sessionData, error: sessionError } = await supabaseAdmin
                .from('chat_sessions')
                .select('id')
                .eq('id', sessionId)
                .eq('user_id', userId)
                .single();

            if (!sessionData || sessionError) {
                await releaseServiceReceipt(supabaseForRelease, receiptToRelease);
                return new Response(JSON.stringify({ error: '유효한 채팅 세션을 찾을 수 없습니다.' }), { 
                    status: 404, 
                    headers: reqCorsHeaders 
                });
            }

            if (message && typeof message === 'string') {
                const { error: insertError } = await supabaseAdmin
                    .from('chat_messages')
                    .insert({
                        session_id: sessionId,
                        role: 'user',
                        content: message.trim()
                    });

                if (insertError) {
                    console.error('Failed to save user message in chat_messages:', insertError);
                }
            }

            await supabaseAdmin
                .from('chat_sessions')
                .update({ updated_at: new Date().toISOString() })
                .eq('id', sessionId);
        }

        // Calculate Saju deterministically
        let sajuInfo = "사주 정보를 불러올 수 없습니다.";
        if (birthDate) {
            try {
                const saju = getPreciseSajuData({ birthDate, birthTime, gender });
                sajuInfo = buildRichSajuContext(saju);
            } catch (e) {
                console.error("Saju Calculation Error", e);
            }
        }

        const userContextBlock = `${getTemporalAnchorBlock()}

[상담자 프로필 및 사주 데이터]
- 성함: ${name || '사용자'}
- MBTI: ${formatMbtiForPrompt(mbti)}
- 성별: ${gender || '알 수 없음'}
- 생년월일시: ${birthDate} ${birthTime || ''}

${sajuInfo}
${pastContext ? `\n[이전 상담 요약]\n${pastContext}\n` : ''}`.trim();

        // Manual conversion to CoreMessage format to avoid 'parts' related TypeError in v6 SDK
        const coreMessages = messages ? messages.slice(-10).map((m: any) => ({
            role: m.role,
            content: m.content
        })) : [];

        if (coreMessages.length === 0 || (coreMessages[coreMessages.length - 1] as any).role !== 'user') {
            (coreMessages as any).push({ 
                role: 'user', 
                content: `${userContextBlock}\n\n[상담 질문]\n${message || ''}` 
            });
        } else {
            const lastIdx = coreMessages.length - 1;
            coreMessages[lastIdx].content = `${userContextBlock}\n\n[상담 질문]\n${coreMessages[lastIdx].content}`;
        }

        try {
            let lastError;
            for (let attempt = 0; attempt < 4; attempt++) {
                try {
                    const { model } = getAIProvider(attempt);
                    const result = await streamText({
                        model,
                        system: STATIC_CHAT_SYSTEM_PROMPT,
                        messages: coreMessages as any,
                    });
                    return result.toTextStreamResponse({ 
                        headers: reqCorsHeaders 
                    });
                } catch (error) {
                    lastError = error;
                    console.warn(`Attempt ${attempt + 1} failed for chat:`, error);
                    if (!isRetryableAIError(error)) break;
                }
            }
            throw lastError;
        } catch (error: any) {
            throw error;
        }
    } catch (error: any) {
        await releaseServiceReceipt(supabaseForRelease, receiptToRelease);
        console.error('ChatServer Error:', error);
        return new Response(JSON.stringify({ error: '채팅 분석 중 오류가 발생했습니다.' }), { 
            status: 500, 
            headers: reqCorsHeaders 
        });
    }
};
