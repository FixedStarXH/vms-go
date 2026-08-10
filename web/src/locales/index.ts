import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import zhCNCommon from './zh-CN/common.json'
import zhCNMenu from './zh-CN/menu.json'
import zhCNLogin from './zh-CN/login.json'
import zhCNSettings from './zh-CN/settings.json'
import zhCNUser from './zh-CN/user.json'

import enUSCommon from './en-US/common.json'
import enUSMenu from './en-US/menu.json'
import enUSLogin from './en-US/login.json'
import enUSSettings from './en-US/settings.json'
import enUSUser from './en-US/user.json'

import jaJPCommon from './ja-JP/common.json'
import jaJPMenu from './ja-JP/menu.json'
import jaJPLogin from './ja-JP/login.json'
import jaJPSettings from './ja-JP/settings.json'
import jaJPUser from './ja-JP/user.json'

export const resources = {
  'zh-CN': {
    common: zhCNCommon,
    menu: zhCNMenu,
    login: zhCNLogin,
    settings: zhCNSettings,
    user: zhCNUser,
  },
  'en-US': {
    common: enUSCommon,
    menu: enUSMenu,
    login: enUSLogin,
    settings: enUSSettings,
    user: enUSUser,
  },
  'ja-JP': {
    common: jaJPCommon,
    menu: jaJPMenu,
    login: jaJPLogin,
    settings: jaJPSettings,
    user: jaJPUser,
  },
}

export const LANGUAGE_OPTIONS = [
  { value: 'zh-CN', label: '简体中文' },
  { value: 'en-US', label: 'English' },
  { value: 'ja-JP', label: '日本語' },
] as const

export type LocaleType = 'zh-CN' | 'en-US' | 'ja-JP'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'zh-CN',
    defaultNS: 'common',
    ns: ['common', 'menu', 'login', 'settings', 'user'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage'],
      lookupLocalStorage: 'app-locale',
      caches: ['localStorage'],
    },
  })

export default i18n
