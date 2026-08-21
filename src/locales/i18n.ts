import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import en from './en/translation.json'
import ptBR from './pt-BR/translation.json'
import ru from './ru/translation.json'
import hi from './hi/translation.json'
import zhCN from './zh-CN/translation.json'
import ar from './ar/translation.json'
import am from './am/translation.json'
import fa from './fa/translation.json'
import id from './id/translation.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      'pt-BR': { translation: ptBR },
      ru: { translation: ru },
      hi: { translation: hi },
      'zh-CN': { translation: zhCN },
      ar: { translation: ar },
      am: { translation: am },
      fa: { translation: fa },
      id: { translation: id },
    },
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'agri_ai_language',
    },
  })

export default i18n
