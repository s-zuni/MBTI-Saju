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
    GEMINI_PRIMARY: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
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

    // Fallback Sequence (Prioritize Gemini 2.5 Pro / GPT-4o for rich generation)
    switch (attempt) {
        case 0:
            if (GEMINI_KEY) {
                return { model: google(MODELS.GEMINI_PRIMARY), name: 'Gemini 2.5 Pro Primary' };
            }
            if (OPENAI_KEY) {
                return { model: openai(MODELS.GPT_PRIMARY), name: 'GPT-4o Primary' };
            }
            return { model: google(MODELS.GEMINI_PRIMARY), name: 'Gemini Primary' };
        case 1:
            if (OPENAI_KEY) {
                return { model: openai(MODELS.GPT_PRIMARY), name: 'GPT-4o Primary' };
            }
            return { model: google(MODELS.GEMINI_FALLBACK), name: 'Gemini Fallback' };
        case 2:
            return { model: google(MODELS.GEMINI_FALLBACK), name: 'Gemini 1.5 Pro Fallback' };
        case 3:
        default:
            if (OPENAI_KEY) {
                return { model: openai(MODELS.GPT_FALLBACK), name: 'GPT-4o-mini Fallback' };
            }
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

export * from './prompts';

