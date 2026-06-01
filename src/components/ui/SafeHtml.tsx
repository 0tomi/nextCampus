import { sanitizeRichHtml } from '@/lib/sanitize'

interface SafeHtmlProps {
  html: string
  className?: string
}

export function SafeHtml({ html, className }: SafeHtmlProps) {
  return (
    <div
      className={className}
      // oxlint-disable-next-line react-doctor/no-danger -- HTML del editor se sanitiza en servidor y se vuelve a sanitizar antes de renderizar.
      dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(html) }}
    />
  )
}
