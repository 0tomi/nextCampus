'use client'

import * as React from 'react'
import { Label as LabelPrimitive } from 'radix-ui'

import { cn } from '@/lib/utils'

// className exacto del label copy-pasteado en los modales admin (14
// instancias antes de esta migración). Radix Label.Root renderiza un
// <label> nativo; no se conservan las clases default de shadcn (flex/gap)
// para no alterar el wraps de los spans "(opcional)" dentro del label.
const LABEL_CLASSNAME = 'block text-xs font-semibold uppercase tracking-widest text-white/40'

function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(LABEL_CLASSNAME, className)}
      {...props}
    />
  )
}

export { Label }
