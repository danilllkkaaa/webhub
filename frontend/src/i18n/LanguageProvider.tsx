import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { DEFAULT_LANGUAGE, Language, translateText } from './translations'

const STORAGE_KEY = 'studenthub.language'

type LanguageContextValue = {
  language: Language
  setLanguage: (language: Language) => void
  toggleLanguage: () => void
  t: (value: string) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

function readInitialLanguage(): Language {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored === 'en' || stored === 'ru' || stored === 'kk') return stored

  const browserLanguages = navigator.languages?.length ? navigator.languages : [navigator.language]
  const browserLanguage = browserLanguages.find(Boolean)?.toLowerCase() ?? ''
  if (browserLanguage.startsWith('kk')) return 'kk'
  return browserLanguage.startsWith('ru') ? 'ru' : 'en'
}

const textOriginals = new WeakMap<Text, string>()
const translatedAttributes = ['placeholder', 'title', 'aria-label', 'alt'] as const

function translateNode(root: ParentNode, language: Language) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement
      if (!parent) return NodeFilter.FILTER_REJECT
      if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(parent.tagName)) return NodeFilter.FILTER_REJECT
      if (parent.closest('[data-i18n-ignore="true"]')) return NodeFilter.FILTER_REJECT
      return /[А-Яа-яЁё]/.test(node.textContent ?? '') || textOriginals.has(node as Text)
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT
    },
  })

  const textNodes: Text[] = []
  while (walker.nextNode()) textNodes.push(walker.currentNode as Text)

  textNodes.forEach((node) => {
    const original = textOriginals.get(node) ?? node.textContent ?? ''
    if (!textOriginals.has(node)) textOriginals.set(node, original)
    const next = language === 'ru' ? original : translateText(original, language)
    if (node.textContent !== next) node.textContent = next
  })

  const elements = root instanceof Element ? [root, ...Array.from(root.querySelectorAll('*'))] : Array.from(root.querySelectorAll('*'))
  elements.forEach((element) => {
    if (element.closest('[data-i18n-ignore="true"]')) return
    translatedAttributes.forEach((attribute) => {
      const value = element.getAttribute(attribute)
      const originalKey = `data-i18n-original-${attribute}`
      const original = element.getAttribute(originalKey) ?? value
      if (!original) return
      if (!element.hasAttribute(originalKey) && /[А-Яа-яЁё]/.test(original)) {
        element.setAttribute(originalKey, original)
      }
      if (element.hasAttribute(originalKey)) {
        const next = language === 'ru' ? original : translateText(original, language)
        if (element.getAttribute(attribute) !== next) element.setAttribute(attribute, next)
      }
    })
  })
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(readInitialLanguage)

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next)
    window.localStorage.setItem(STORAGE_KEY, next)
  }, [])

  const toggleLanguage = useCallback(() => {
    const order: Language[] = ['ru', 'en', 'kk']
    setLanguage(order[(order.indexOf(language) + 1) % order.length])
  }, [language, setLanguage])

  const t = useCallback((value: string) => translateText(value, language), [language])

  useEffect(() => {
    document.documentElement.lang = language
    translateNode(document.body, language)

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) {
              translateNode(node.nodeType === Node.TEXT_NODE ? node.parentNode ?? document.body : node as Element, language)
            }
          })
        }
        if (mutation.type === 'attributes' && mutation.target instanceof Element) {
          translateNode(mutation.target, language)
        }
        if (mutation.type === 'characterData' && mutation.target.parentNode) {
          translateNode(mutation.target.parentNode, language)
        }
      }
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...translatedAttributes],
    })

    return () => observer.disconnect()
  }, [language])

  useEffect(() => {
    const originalAlert = window.alert
    const originalConfirm = window.confirm

    window.alert = (message?: unknown) => originalAlert(translateText(String(message ?? ''), language))
    window.confirm = (message?: string) => originalConfirm(translateText(String(message ?? ''), language))

    return () => {
      window.alert = originalAlert
      window.confirm = originalConfirm
    }
  }, [language])

  const value = useMemo(() => ({ language, setLanguage, toggleLanguage, t }), [language, setLanguage, toggleLanguage, t])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const value = useContext(LanguageContext)
  if (!value) throw new Error('useLanguage must be used inside LanguageProvider')
  return value
}
