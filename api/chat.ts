import { streamText } from 'ai';
import { getPreciseSajuData, buildRichSajuContext } from './_utils/saju';
import { corsHeaders, handleCors, getCorsHeaders } from './_utils/cors';
import { getAIProvider, isRetryableAIError, BASE_SYSTEM_PROMPT } from './_utils/ai-provider';
import { authenticateUser, getSupabaseAdmin } from './_utils/auth';

export const config = {
    runtime: 'edge',
};

// 정적 시스템 프롬프트 (OpenAI Prompt Caching 최적화: 1024+ 토큰 정적 접두사 유지)
const STATIC_CHAT_SYSTEM_PROMPT = `
${BASE_SYSTEM_PROMPT}

오직 데이터(사주+MBTI)에 기반해 날카롭고 간결하게 핵심만 짚는 상담을 제공하세요.

[AI 사주 직접 계산 엄금]
★ 중요: 사주 원국이나 오행을 절대 스스로 재계산하지 말고, 사용자 메시지에 제공된 사주 데이터만을 100% 진실로 적용하세요.

[어투]
- ~해요 체, 단호하고 직설적
- 서론 없이 바로 핵심부터 시작할 것
- 감성적 위로나 헛된 칭찬 금지 (데이터에 기반한 팩트와 솔루션 중심)

[분석 원칙]
- MBTI 성향과 사주 오행/일간/운의 기운을 반드시 3단계 융합 공식(사주 진단 -> MBTI 결합 -> 행동 교정 솔루션)으로 분석
- 한계와 약점을 가감 없이 지적하고, MBTI가 즉시 실행 가능한 현실적 행동 지침으로 마무리
- 핵심 2~3가지로 압축. 군더더기 없이 임팩트 있게

[언어 규칙 - 중요]
- 모든 분석 내용은 반드시 한국어만 사용하세요.
- 오행(목, 화, 토, 금, 수)을 언급할 때 영어(Wood, Fire 등)를 절대 사용하지 마세요.
- 한국어 단어 뒤에 영어 번역을 괄호로 병기하지 마세요. (예: "목(Wood)" (X), "목(木)" (O))

[형식 규칙]
- 별표 두 개(**) 및 마크다운 특수문자(__, # 등) 절대 사용 금지
- 강조가 필요한 경우 이모지(🌿 🔥 💧 ✨)와 글머리 기호(• 1. 2.)만 사용할 것
- 모든 대답은 마크다운 기호 없는 깔끔한 일반 텍스트로 전달
- 한국어만 사용
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

    try {
        const body = await req.json().catch(() => ({}));
        const { sessionId, message, mbti, birthDate, birthTime, name, gender, messages, pastContext } = body;

        // 1. 호출자 인증 (세션 유효성 우선 검증)
        const authCheck = await authenticateUser(req, { allowAnonymous: false, cost: 0 });
        if (authCheck.errorResponse) {
            return authCheck.errorResponse;
        }
        const userId = authCheck.user!.id;

        // 2. sessionId 검증 (소유권 확인)
        if (!sessionId) {
            return new Response(JSON.stringify({ error: '유효한 채팅 세션(sessionId)이 필요합니다.' }), { 
                status: 400, 
                headers: reqCorsHeaders 
            });
        }

        const supabaseAdmin = getSupabaseAdmin();
        const { data: sessionData, error: sessionError } = await supabaseAdmin
            .from('chat_sessions')
            .select('id')
            .eq('id', sessionId)
            .eq('user_id', userId)
            .single();

        if (!sessionData || sessionError) {
            return new Response(JSON.stringify({ error: '유효한 채팅 세션을 찾을 수 없습니다.' }), { 
                status: 404, 
                headers: reqCorsHeaders 
            });
        }

        // 3. 서버 권위 데이터(chat_messages 실제 저장 수)로 과금 턴 엄격 판정
        // 클라이언트의 body.shouldDeductCredit이나 messages 배열 길이는 완전히 무시함
        const { count: dbMsgCount, error: countError } = await supabaseAdmin
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', sessionId)
            .eq('role', 'user');

        if (countError) {
            console.error('Failed to query chat_messages count:', countError);
            return new Response(JSON.stringify({ error: '채팅 기록 조회에 실패했습니다.' }), { 
                status: 500, 
                headers: reqCorsHeaders 
            });
        }

        const userTurnCount = dbMsgCount || 0;
        // 5회 단위 과금: 0, 5, 10, 15... 번째 메시지 전송 시 20 크레딧 차감
        const isChargeTurn = userTurnCount % 5 === 0;

        // 4. 과금 턴인 경우 크레딧 차감 (원자적 DB RPC 호출, 부족 시 402 즉시 반환)
        if (isChargeTurn) {
            const deductResult = await authenticateUser(req, {
                serviceType: 'AI_CHAT_5',
                cost: 20
            });

            if (deductResult.errorResponse) {
                return deductResult.errorResponse;
            }
        }

        // 5. 크레딧 검증 성공 후 서버에서 권위적으로 사용자 메시지 저장 (턴 수 카운트 확정)
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

        // 세션 갱신 시간 업데이트
        await supabaseAdmin
            .from('chat_sessions')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', sessionId);

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

        const userContextBlock = `[상담자 프로필 및 사주 데이터]
- 성함: ${name || '사용자'}
- MBTI: ${mbti || '알 수 없음'}
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
        console.error('ChatServer Error:', error);
        return new Response(JSON.stringify({ error: error.message || "채팅 분석 중 오류가 발생했습니다." }), { 
            status: 500, 
            headers: reqCorsHeaders 
        });
    }
};
