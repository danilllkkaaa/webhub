import { Languages } from 'lucide-react'
import { useLanguage } from './LanguageProvider'
import { Language } from './translations'

const LANGUAGES: { code: Language; title: string }[] = [
  { code: 'ru', title: 'Русский' },
  { code: 'en', title: 'English' },
  { code: 'kk', title: 'Қазақша' },
]

export function LanguageSwitcher({ variant = 'inline' }: { variant?: 'inline' | 'fixed' }) {
  const { language, setLanguage } = useLanguage()
  const wrapperClass = variant === 'fixed'
    ? 'fixed right-4 top-4 z-[80] flex items-center gap-1 rounded-full border border-gray-200 bg-white/95 p-1 shadow-lg backdrop-blur'
    : 'inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white p-1 shadow-sm'

  return (
    <div className={wrapperClass}>
      <Languages size={16} className="ml-2 text-gray-500" />
      {LANGUAGES.map(({ code, title }) => (
        <button
          key={code}
          type="button"
          onClick={() => setLanguage(code)}
          className={`h-7 rounded-full px-3 text-xs font-bold uppercase transition ${
            language === code ? 'bg-brand text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
          }`}
          aria-pressed={language === code}
          title={title}
        >
          {code}
        </button>
      ))}
    </div>
  )
}
