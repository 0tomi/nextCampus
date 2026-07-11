import * as React from 'react'

import { cn } from '@/lib/utils'

// className exacto del "text input" copy-pasteado en los modales admin
// (10 instancias antes de esta migración). Cualquier desviación puntual
// (foco distinto, cursor-pointer en date/time, bg-surface-1, etc.) se
// resuelve pasando `className` en el call site — twMerge la aplica encima.
const INPUT_CLASSNAME =
  'w-full rounded border border-white/10 bg-surface-0 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/20 focus:outline-none'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(INPUT_CLASSNAME, className)}
      {...props}
    />
  )
}

export { Input }
