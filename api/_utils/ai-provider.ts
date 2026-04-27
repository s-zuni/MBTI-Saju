import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';

/**
 * AI Provider Factory & Fallback Logic
 * 
 * SECURITY: This file runs ONLY on the server/edge runtime.
 * API keys are fetched from environment variables WITHOUT prefixes like VITE_ or REACT_APP_
 * to ensure they are never bundled into the frontend.
 */

// Model Constants
export const MODELS = {
    GEMINI_PRIMARY: 'gemini-1.5-flash',
    GEMINI_FALLBACK: 'gemini-1.5-flash',
    GPT_PRIMARY: 'gpt-4o-mini',
    GPT_FALLBACK: 'gpt-4o-mini',
};

/**
 * Gets the best available AI provider and model based on failure history.
 * @param attempt - The attempt number (0-indexed)
 * @returns { model: any, providerName: string }
 */
export function getAIProvider(attempt: number = 0) {
    // 1. Fetch Keys (Server-side ONLY)
    const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    const OPENAI_KEY = process.env.OPENAI_API_KEY;

    const google = createGoogleGenerativeAI({ apiKey: GEMINI_KEY || '' });
    const openai = createOpenAI({ apiKey: OPENAI_KEY || '' });

    // Fallback Sequence (GPT First - Gemini high demand issues)
    // 0: GPT Primary, 1: GPT Fallback, 2: Gemini Primary, 3: Gemini Fallback
    switch (attempt) {
        case 0:
            if (OPENAI_KEY) {
                return { model: openai(MODELS.GPT_PRIMARY), name: 'GPT Primary' };
            }
            return { model: google(MODELS.GEMINI_PRIMARY), name: 'Gemini Primary (No GPT Key)' };
        case 1:
            if (OPENAI_KEY) {
                return { model: openai(MODELS.GPT_FALLBACK), name: 'GPT Fallback' };
            }
            return { model: google(MODELS.GEMINI_FALLBACK), name: 'Gemini Fallback (No GPT Key)' };
        case 2:
            return { model: google(MODELS.GEMINI_PRIMARY), name: 'Gemini Primary' };
        case 3:
        default:
            return { model: google(MODELS.GEMINI_FALLBACK), name: 'Gemini Final Fallback' };
    }
}

/**
 * Checks if OpenAI is properly configured in the environment.
 */
export function isOpenAIConfigured(): boolean {
    return !!process.env.OPENAI_API_KEY;
}

/**
 * Helper to determine if an error should trigger a provider fallback.
 */
export function isRetryableAIError(error: any): boolean {
    if (!error) return false;

    // 1. Check SDK's own retryable flag
    if (error.isRetryable === true) return true;

    // 2. Extract underlying error if this is an AI_RetryError
    const lastError = error.lastError || (error.errors ? error.errors[error.errors.length - 1] : null);
    const targetError = lastError || error;

    // 3. Check status codes
    const statusCode = targetError.statusCode || targetError.status;
    if (statusCode === 503 || statusCode === 429 || statusCode === 500 || statusCode === 504) {
        return true;
    }

    // 4. Check error message strings
    const msg = (targetError.message || String(targetError)).toLowerCase();
    return (
        msg.includes('503') || 
        msg.includes('unavailable') || 
        msg.includes('429') || 
        msg.includes('requests') ||
        msg.includes('overloaded') ||
        msg.includes('high demand') ||
        msg.includes('rate limit') ||
        msg.includes('deadline exceeded')
    );
}
