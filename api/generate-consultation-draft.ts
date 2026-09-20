import { generateText } from 'ai';
import { corsHeaders, handleCors, getCorsHeaders } from './_utils/cors';
import { authenticateUser } from './_utils/auth';
import { getAIProvider, isRetryableAIError, BASE_SYSTEM_PROMPT } from './_utils/ai-provider';
import { getPreciseSajuData, buildRichSajuContext } from './_utils/saju';

export const config = {
    runtime: 'edge',
};

/**
 * POST /api/generate-consultation-draft
 * 관리자 전용 AI 답변 초안 생성 엔드포인트.
 *
 * - generate-deep-report.ts 와 동일한 admin 인증 패턴 사용
 * - BASE_SYSTEM_PROMPT를 정적 접두사로 사용 (프롬프트 캐싱 순서 준수)
 * - 생성된 초안을 consultation_questions.ai_draft_answer에 저장 후 반환
 * - AI → 사용자 직접 발송 경로 없음 (초안만 반환, 관리자가 수정 후 별도 전송)
 */
export default async function handler(req: Request) {
    const corsResult = handleCors(req);
    if (corsResult) return corsResult;

    const reqCorsHeaders = getCorsHeaders(req);

    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
            status: 405,
            headers: reqCorsHeaders,
        });
    }

    // 관리자 인증 및 인가 검증 (generate-deep-report.ts 패턴 동일)
    const authResult = await authenticateUser(req);
    if (authResult.errorResponse) return authResult.errorResponse;

    const { data: profile } = await authResult.supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', authResult.user!.id)
        .maybeSingle();

    if (profile?.role !== 'admin') {
        return new Response(JSON.stringify({ error: '관리자 권한이 필요합니다.' }), {
            status: 403,
            headers: reqCorsHeaders,
        });
    }

    try {
        const body = await req.json();
        const { question_id } = body;

        if (!question_id) {
            return new Response(JSON.stringify({ error: 'question_id가 필요합니다.' }), {
                status: 400,
                headers: reqCorsHeaders,
            });
        }

        const supabaseAdmin = authResult.supabaseAdmin;

        // 1. 질문 + 사용자 프로필(사주/MBTI) 조회
        const { data: question, error: questionError } = await supabaseAdmin
            .from('consultation_questions')
            .select(`
                id,
                question_text,
                user_id,
                profiles:user_id (
                    name,
                    mbti,
                    birth_date,
                    birth_time,
                    gender
                )
            `)
            .eq('id', question_id)
            .single();

        if (questionError || !question) {
            return new Response(JSON.stringify({ error: '해당 질문을 찾을 수 없습니다.' }), {
                status: 404,
                headers: reqCorsHeaders,
            });
        }

        // 2. 사주 데이터 계산 (saju.ts 유틸리티 사용)
        const profile_data = Array.isArray(question.profiles)
            ? question.profiles[0]
            : question.profiles;

        let sajuContext = '사주 정보 없음 (생년월일 미등록)';
        if (profile_data?.birth_date) {
            try {
                const saju = getPreciseSajuData({
                    birthDate: profile_data.birth_date,
                    birthTime: profile_data.birth_time || '12:00',
                    gender: profile_data.gender,
                });
                sajuContext = buildRichSajuContext(saju);
            } catch (e) {
                console.error('[generate-consultation-draft] Saju calculation error:', e);
            }
        }

        // 3. 프롬프트 구성
        // BASE_SYSTEM_PROMPT를 정적 접두사로 사용 (prompt caching 최적화)
        const systemPrompt = `${BASE_SYSTEM_PROMPT}

당신은 지금 관리자로서 유료 상담 고객에게 보낼 답변 초안을 작성하고 있습니다.

[답변 작성 지침]
1. 내담자의 사주 원국과 MBTI를 반드시 결합하여 분석하라.
2. 질문에 직접적으로 답하되, 사주·MBTI 데이터를 근거로 구체적인 조언을 제시하라.
3. 담담하고 실용적인 톤으로 작성하라. 감성적 위로나 막연한 칭찬은 금지한다.
4. 분량: 500~1,000자 내외 (관리자가 추후 수정 가능한 초안이므로 핵심 포인트 중심으로).
5. 마크다운 기호(**bold**, ## 등) 사용 금지. 일반 텍스트로 작성.
6. 마지막에 "이 내용은 AI가 생성한 초안입니다. 관리자가 검토 후 수정하여 전달됩니다."와 같은 AI 생성 안내는 넣지 마라 (관리자 내부용이므로).`;

        const userPrompt = `[내담자 정보]
이름: ${profile_data?.name || '이름 미등록'}
MBTI: ${profile_data?.mbti || '미등록'}
성별: ${profile_data?.gender || '미등록'}
생년월일시: ${profile_data?.birth_date || '미등록'} ${profile_data?.birth_time || ''}

[System Context: Deterministic Saju Data]
${sajuContext}

[내담자 질문]
${question.question_text}

위 내담자의 질문에 대한 전문가 상담 답변 초안을 작성해주세요.`;

        // 4. AI 초안 생성 (streaming 아닌 generateText 사용 - 저장 후 반환 목적)
        let lastError: unknown;
        let draftText = '';

        for (let attempt = 0; attempt < 4; attempt++) {
            try {
                const { model } = getAIProvider(attempt);
                const result = await generateText({
                    model,
                    system: systemPrompt,
                    prompt: userPrompt,
                    maxRetries: 0,
                    maxOutputTokens: 2048,
                });
                draftText = result.text;
                break;
            } catch (error) {
                lastError = error;
                if (!isRetryableAIError(error)) break;
            }
        }

        if (!draftText) {
            throw lastError || new Error('AI 초안 생성에 실패했습니다.');
        }

        // 5. 초안을 DB에 저장 (ai_draft_answer 컬럼)
        const { error: updateError } = await supabaseAdmin
            .from('consultation_questions')
            .update({ ai_draft_answer: draftText })
            .eq('id', question_id);

        if (updateError) {
            console.error('[generate-consultation-draft] DB update error:', updateError);
            // 저장 실패해도 초안 텍스트는 반환 (관리자가 직접 복사 가능)
        }

        return new Response(
            JSON.stringify({
                success: true,
                draft: draftText,
                question_id,
            }),
            {
                status: 200,
                headers: { ...reqCorsHeaders, 'Content-Type': 'application/json' },
            }
        );
    } catch (error: any) {
        console.error('[generate-consultation-draft] Error:', error);
        return new Response(
            JSON.stringify({ error: error.message || 'AI 초안 생성 중 오류가 발생했습니다.' }),
            { status: 500, headers: reqCorsHeaders }
        );
    }
}

