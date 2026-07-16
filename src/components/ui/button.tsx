import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'

import { cn } from '@/lib/utils'

// Variantes calcadas 1:1 de los className que ya circulaban copy-pasteados en
// los modales admin (submit primario y cancelar). No están compuestas desde
// los tokens semánticos de shadcn: son las clases exactas del repo para
// garantizar cero cambio visual al migrar.
const buttonVariants = cva(
  'cursor-pointer transition-[transform,opacity,colors] duration-150 ease-out active:scale-[0.97] disabled:active:scale-100 motion-reduce:active:scale-100',
  {
    variants: {
      variant: {
        primary:
          'rounded bg-white px-4 py-2 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-50',
        ghost:
          'rounded border border-white/10 px-4 py-2 text-sm text-white/60 hover:bg-white/5 hover:text-white',
      },
    },
  }
)

interface ButtonProps extends React.ComponentProps<'button'> {
  variant: NonNullable<VariantProps<typeof buttonVariants>['variant']>
  asChild?: boolean
}

function Button({ className, variant, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : 'button'

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      className={cn(buttonVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Button, buttonVariants }
