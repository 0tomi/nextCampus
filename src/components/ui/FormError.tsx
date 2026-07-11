import { cn } from '@/lib/utils'

interface FormErrorProps {
  message?: string | null
  className?: string
}

/**
 * Banner de error de formulario. className exacto del que aparecía
 * copy-pasteado en los modales admin. No es un componente de shadcn (el
 * registry no trae un equivalente directo) — es propio del repo.
 */
export function FormError({ message, className }: FormErrorProps) {
  if (!message) return null

  return (
    <p
      className={cn(
        'rounded border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-300',
        className,
      )}
    >
      {message}
    </p>
  )
}
