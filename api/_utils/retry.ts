/**
 * Retry utility for Gemini API calls with exponential backoff.
 * Handles transient errors like 503 (Service Unavailable) and 429 (Too Many Requests).
 */

interface RetryOptions {
    maxRetries?: number;
    initialDelayMs?: number;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
    maxRetries: 3,
    initialDelayMs: 1000,
};

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

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Wraps a Gemini model.generateContent() call with retry logic.
 * 
 * @param model - The Gemini GenerativeModel instance
 * @param request - The generateContent request parameters
 * @param options - Retry options (maxRetries, initialDelayMs)
 * @returns The generateContent result
 */
export async function generateContentWithRetry(
    model: any,
    request: any,
    options?: RetryOptions
): Promise<any> {
    const { maxRetries, initialDelayMs } = { ...DEFAULT_OPTIONS, ...options };

    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const result = await model.generateContent(request);
            return result;
        } catch (error: any) {
            lastError = error;

            if (attempt < maxRetries && isRetryableError(error)) {
                const delay = initialDelayMs * Math.pow(2, attempt);
                console.warn(
                    `[Retry] Attempt ${attempt + 1}/${maxRetries} failed with retryable error. ` +
                    `Waiting ${delay}ms before retry...`,
                    error.message || error
                );
                await sleep(delay);
            } else {
                // If max retries reached or error is not retryable, format it nicely
                throw formatApiError(error);
            }
        }
    }

    throw formatApiError(lastError);
}

function formatApiError(error: any): Error {
    const errorString = error?.message || error?.toString() || '';
    const customError = new Error(errorString);
    (customError as any).originalError = error;

    if (errorString.includes('503') || errorString.includes('Service Unavailable') || errorString.includes('high demand')) {
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
