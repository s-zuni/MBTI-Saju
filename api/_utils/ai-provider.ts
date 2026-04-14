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
    GEMINI_PRIMARY: 'gemini-3.1-flash-lite-preview',
    GEMINI_FALLBACK: 'gemini-2.5-flash-lite',
    GPT_PRIMARY: 'gpt-5-nano-2025-08-07',
    GPT_FALLBACK: 'gpt-5-nano-2025-08-07', // Using nano for both for now per user version request
};

/**
 * Gets the best available AI provider and model based on failure history.
 * @param attempt - The attempt number (0-indexed)
 * @returns { model: any, providerName: string }
 */
export function getAIProvider(attempt: number = 0) {
    // 1. Fetch Keys (Server-side ONLY)
    // We prioritize standard names to avoid accidental frontend exposure
    const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    const OPENAI_KEY = process.env.OPENAI_API_KEY;

    const google = createGoogleGenerativeAI({ apiKey: GEMINI_KEY || '' });
    const openai = createOpenAI({ apiKey: OPENAI_KEY || '' });

    // Fallback Sequence
    switch (attempt) {
        case 0:
            return { model: google(MODELS.GEMINI_PRIMARY), name: 'Gemini Primary' };
        case 1:
            return { model: google(MODELS.GEMINI_FALLBACK), name: 'Gemini Fallback' };
        case 2:
            if (OPENAI_KEY) {
                return { model: openai(MODELS.GPT_PRIMARY), name: 'GPT Primary' };
            }
            // If no OpenAI key, try Gemini fallback again or original
            return { model: google(MODELS.GEMINI_FALLBACK), name: 'Gemini Fallback (No GPT Key)' };
        case 3:
        default:
            if (OPENAI_KEY) {
                return { model: openai(MODELS.GPT_FALLBACK), name: 'GPT Fallback' };
            }
            return { model: google(MODELS.GEMINI_FALLBACK), name: 'Gemini Final Fallback' };
    }
}

/**
 * Helper to determine if an error should trigger a provider fallback.
 * (e.g., 503 Service Unavailable, 429 Too Many Requests)
 */
export function isRetryableAIError(error: any): boolean {
    const msg = error?.message || String(error);
    return (
        msg.includes('503') || 
        msg.includes('Service Unavailable') || 
        msg.includes('429') || 
        msg.includes('Too Many Requests') ||
        msg.includes('overloaded') ||
        msg.includes('high demand')
    );
}
