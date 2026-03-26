/**
 * Retry utility for Gemini API calls.
 * Optimized for Vercel Hobby tier (10-second function limit).
 * 
 * Strategy: NO retries for most cases to stay within the 10-second limit.
 * All requests now exclusively use gemini-2.5-flash without fallback.
 */

interface RetryOptions {
    maxRetries?: number;
    initialDelayMs?: number;
    timeoutMs?: number;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
    maxRetries: 0,      // No retries - Vercel Hobby tier is 10 seconds max
    initialDelayMs: 500,
    timeoutMs: 9000,    // 9 seconds (leave 1s buffer for Vercel's 10s limit)
};

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Wraps a Gemini model.generateContent() call with timeout protection.
 * 
 * IMPORTANT: On Vercel Hobby tier, functions have a 10-second max execution time.
 * This utility uses a 9-second timeout with NO retries to ensure we respond
 * before Vercel kills the function with a 504 error.
 * 
 * @param model - The Gemini GenerativeModel instance
 * @param request - The generateContent request parameters
 * @param options - Options (timeoutMs, maxRetries)
 * @returns The generateContent result
 */
export async function generateContentWithRetry(
    model: any,
    request: any,
    options?: RetryOptions
): Promise<any> {
    const { maxRetries, initialDelayMs, timeoutMs } = { ...DEFAULT_OPTIONS, ...options };

    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const result = await Promise.race([
                model.generateContent(request),
                new Promise((_, reject) => setTimeout(
                    () => reject(new Error('AI_TIMEOUT')),
                    timeoutMs
                ))
            ]);
            return result;
        } catch (error: any) {
            lastError = error;
            const msg = error?.message || '';

            // Timeout errors should NOT be retried - we're out of time
            if (msg === 'AI_TIMEOUT') {
                throw formatApiError(error);
            }

            // For retryable server errors, only retry if we have attempts left
            if (attempt < maxRetries && isRetryableError(error)) {
                const delay = initialDelayMs * Math.pow(2, attempt);
                console.warn(
                    `[Retry] Attempt ${attempt + 1}/${maxRetries} failed. ` +
                    `Waiting ${delay}ms...`,
                    msg
                );
                await sleep(delay);
            } else {
                throw formatApiError(error);
            }
        }
    }

    throw formatApiError(lastError);
}

function isRetryableError(error: any): boolean {
    const message = error?.message || error?.toString() || '';
    return (
        message.includes('503') ||
        message.includes('Service Unavailable') ||
        message.includes('429') ||
        message.includes('Too Many Requests') ||
        message.includes('RESOURCE_EXHAUSTED') ||
        message.includes('overloaded') ||
        message.includes('high demand')
    );
}

function formatApiError(error: any): Error {
    const errorString = error?.message || error?.toString() || '';
    const customError = new Error(errorString);
    (customError as any).originalError = error;

    if (errorString === 'AI_TIMEOUT' || errorString.includes('Timeout')) {
        (customError as any).status = 504;
        customError.message = 'AI 응답 시간이 너무 깁니다. 잠시 후 다시 시도해 주세요.';
    } else if (errorString.includes('503') || errorString.includes('Service Unavailable') || errorString.includes('high demand')) {
        (customError as any).status = 503;
    } else if (errorString.includes('429') || errorString.includes('Too Many Requests') || errorString.includes('RESOURCE_EXHAUSTED')) {
        (customError as any).status = 429;
    } else if (errorString.includes('400') || errorString.includes('Bad Request')) {
        (customError as any).status = 400;
    } else if (errorString.includes('401') || errorString.includes('Unauthorized') || errorString.includes('API key')) {
        (customError as any).status = 401;
    } else {
        (customError as any).status = 500;
    }

    return customError;
}

/**
 * Converts raw Gemini API errors into user-friendly Korean messages.
 */
export function getKoreanErrorMessage(error: any): string {
    const message = error?.message || error?.toString() || '';

    if (message === 'AI_TIMEOUT' || message.includes('Timeout') || message.includes('시간이 너무')) {
        return 'AI 서버 응답이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.';
    }
    if (message.includes('503') || message.includes('Service Unavailable') || message.includes('high demand')) {
        return 'AI 서버가 현재 사용량이 많아 일시적으로 응답이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.';
    }
    if (message.includes('429') || message.includes('Too Many Requests') || message.includes('RESOURCE_EXHAUSTED')) {
        return 'API 요청 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.';
    }
    if (message.includes('400') || message.includes('Bad Request')) {
        return 'AI 분석 요청 형식에 문제가 있습니다. 입력 정보를 확인해 주세요.';
    }
    if (message.includes('401') || message.includes('Unauthorized') || message.includes('API key')) {
        return 'AI 서비스 인증에 문제가 발생했습니다. 관리자에게 문의해 주세요.';
    }

    return `AI 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.`;
}
