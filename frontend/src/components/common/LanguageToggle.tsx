import { useTranslation } from 'react-i18next'
import { LANGUAGE_STORAGE_KEY, isRtl, type Language } from '../../lib/language'

export default function LanguageToggle() {
  const { t, i18n } = useTranslation()
  const nextLanguage: Language = i18n.language === 'he' ? 'en' : 'he'

  const handleToggle = () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage)
    i18n.changeLanguage(nextLanguage)
    document.documentElement.lang = nextLanguage
    document.documentElement.dir = isRtl(nextLanguage) ? 'rtl' : 'ltr'
  }

  return (
    <button
      onClick={handleToggle}
      className="rounded border border-border-default px-2 py-0.5 text-[11px] uppercase tracking-wider text-text-secondary hover:border-accent-primary hover:text-accent-primary transition-all"
    >
      {t('language.toggle')}
    </button>
  )
}
