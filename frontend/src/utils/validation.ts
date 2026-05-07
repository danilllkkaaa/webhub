export const fieldClass = (error: string = '') =>
  `w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 transition ${
    error ? 'border-red-300 focus:ring-red-200' : 'border-gray-200 focus:ring-brand/20 focus:border-brand'
  }`

export const validateFullName = (v: string) => v.trim().length < 2 ? 'Введите имя' : ''
export const validateEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? '' : 'Некорректный email'
export const validatePhone = (v: string) => v.trim().length < 7 ? 'Введите телефон' : ''
export const validatePassword = (v: string) => {
  if (v.length < 6) return 'Минимум 6 символов'
  if (!/[A-Za-zА-Яа-яЁё]/.test(v)) return 'Пароль должен содержать хотя бы одну букву'
  if (!/\d/.test(v)) return 'Пароль должен содержать хотя бы одну цифру'
  return ''
}

export const parseApiError = (err: unknown, fallback: string): string => {
  const detail = (err as any)?.response?.data?.detail
  if (!detail) return fallback
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    const msg = detail
      .map((e: any) => {
        const raw: string = e.msg ?? String(e)
        return raw.startsWith('Value error, ') ? raw.slice(13) : raw
      })
      .join('; ')
    return msg || fallback
  }
  return fallback
}
export const validatePasswordConfirm = (pw: string, confirm: string) =>
  pw !== confirm ? 'Пароли не совпадают' : ''
export const validateRequiredText = (v: string, label = 'Поле') =>
  v.trim().length < 2 ? `${label} обязательно` : ''
