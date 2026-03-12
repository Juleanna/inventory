import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import uk from './locales/uk.json'
import en from './locales/en.json'

const savedLang = localStorage.getItem('i18n-lang') || 'uk'

i18n.use(initReactI18next).init({
  resources: {
    uk: { translation: uk },
    en: { translation: en },
  },
  lng: savedLang,
  fallbackLng: 'uk',
  interpolation: { escapeValue: false },
})

export default i18n
