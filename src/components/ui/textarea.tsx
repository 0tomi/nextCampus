import * as React from 'react'

import { cn } from '@/lib/utils'

// Mismo className que Input + `resize-none`, tal como aparecía copy-pasteado
// en los <textarea> de los modales admin.
const TEXTAREA_CLASSNAME =
  'w-full resize-none rounded border border-white/10 bg-surface-0 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/20 focus:outline-none'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(TEXTAREA_CLASSNAME, className)}
      {...props}
    />
  )
}

export { Textarea }
