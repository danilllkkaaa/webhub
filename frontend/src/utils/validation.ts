export const fieldClass = (error: string = '') =>
  `w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 transition ${
    error ? 'border-red-300 focus:ring-red-200' : 'border-gray-200 focus:ring-brand/20 focus:border-brand'
  }`

export const validateFullName = (v: string) => v.trim().length < 2 ? 'Введите имя' : ''
export const validateEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? '' : 'Некорректный email'
export const validatePhone = (v: string) => v.trim().length < 7 ? 'Введите телефон' : ''
export const validatePassword = (v: string) => v.length < 6 ? 'Минимум 6 символов' : ''
export const validatePasswordConfirm = (pw: string, confirm: string) =>
  pw !== confirm ? 'Пароли не совпадают' : ''
export const validateRequiredText = (v: string, label = 'Поле') =>
  v.trim().length < 2 ? `${label} обязательно` : ''
