export const SUPPORTED_LANGUAGES = ['en', 'he'] as const
export type Language = (typeof SUPPORTED_LANGUAGES)[number]

export const LANGUAGE_STORAGE_KEY = 'iris_language'
export const RTL_LANGUAGES: Language[] = ['he']

export function getStoredLanguage(): Language {
  const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY)
  return SUPPORTED_LANGUAGES.includes(stored as Language) ? (stored as Language) : 'en'
}

export function isRtl(language: string): boolean {
  return RTL_LANGUAGES.includes(language as Language)
}

// Attached to every AI-backed request (investigate/hint/complete) so the
// backend agents (Commander/Mentor/Evaluator) reply in the same language
// as the UI -- see ai_services/utils/language.py for the matching keys.
export function getLanguageHeader(): Record<string, string> {
  return { 'X-Language': getStoredLanguage() }
}
