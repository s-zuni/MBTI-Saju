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
    GEMINI_PRIMARY: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    GEMINI_FALLBACK: 'gemini-2.5-flash',
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
    const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    const OPENAI_KEY = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY;

    const google = createGoogleGenerativeAI({ apiKey: GEMINI_KEY || '' });
    const openai = createOpenAI({ apiKey: OPENAI_KEY || '' });

    // Fallback Sequence (Prioritize GPT-4o-mini Primary -> Gemini 2.5 Flash Fallback)
    switch (attempt) {
        case 0:
            if (OPENAI_KEY) {
                return { model: openai(MODELS.GPT_PRIMARY), name: 'GPT-4o-mini Primary' };
            }
            if (GEMINI_KEY) {
                return { model: google(MODELS.GEMINI_PRIMARY), name: 'Gemini 2.5 Flash Primary' };
            }
            return { model: openai(MODELS.GPT_PRIMARY), name: 'GPT Primary' };
        case 1:
            if (GEMINI_KEY) {
                return { model: google(MODELS.GEMINI_PRIMARY), name: 'Gemini 2.5 Flash Fallback' };
            }
            return { model: openai(MODELS.GPT_FALLBACK), name: 'GPT Fallback' };
        case 2:
            if (OPENAI_KEY) {
                return { model: openai(MODELS.GPT_FALLBACK), name: 'GPT-4o-mini Secondary' };
            }
            return { model: google(MODELS.GEMINI_FALLBACK), name: 'Gemini Fallback' };
        case 3:
        default:
            if (GEMINI_KEY) {
                return { model: google(MODELS.GEMINI_FALLBACK), name: 'Gemini Final Fallback' };
            }
            return { model: openai(MODELS.GPT_FALLBACK), name: 'GPT Final Fallback' };
    }
}

/**
 * Checks if OpenAI is properly configured in the environment.
 */
export function isOpenAIConfigured(): boolean {
    return !!(process.env.OPENAI_API_KEY || process.env.OPENAI_KEY);
}

/**
 * Helper to determine if an error should trigger a provider fallback.
 * Allows falling back to alternative providers/models whenever an attempt fails.
 */
export function isRetryableAIError(error: any): boolean {
    if (!error) return false;
    // Always allow fallback loop to try the next available provider on any error
    return true;
}

export * from './prompts';

