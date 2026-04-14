/**
 * Centralized Gemini model configuration.
 * Used to unify model versions across all API endpoints and handle fallbacks.
 */

// User requested primary model (Note: currently experiencing high demand)
export const PRIMARY_MODEL = 'gemini-3.1-flash-lite-preview';

// Stable production-grade fallback model to handle 503/overload errors
export const FALLBACK_MODEL = 'gemini-1.5-flash';

// High-performance pro model if needed for complex tasks
export const PRO_MODEL = 'gemini-1.5-pro';
