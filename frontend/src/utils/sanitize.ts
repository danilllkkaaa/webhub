const DANGEROUS_TAGS = /<(script|iframe|object|embed|form|base)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1>/gi
const DANGEROUS_ATTRS = /\s(on\w+|srcdoc|formaction)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi
const JS_PROTO = /javascript\s*:/gi

export function sanitizeHtml(html: string): string {
  return html
    .replace(DANGEROUS_TAGS, '')
    .replace(DANGEROUS_ATTRS, '')
    .replace(JS_PROTO, '')
}
