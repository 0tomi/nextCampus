import { z } from 'zod'

export interface ProfileActionState {
  ok: boolean
  message: string
}

export const initialProfileActionState: ProfileActionState = {
  ok: false,
  message: '',
}

export const updateAdminEmailSchema = z.object({
  nextEmail: z.string().trim().email('Ingresá un correo válido.').transform((value) => value.toLowerCase()),
})

export const updateAdminPasswordSchema = z
  .object({
    currentPassword: z.string().trim().min(1, 'Ingresá tu contraseña actual.'),
    nextPassword: z.string().min(8, 'La nueva contraseña debe tener al menos 8 caracteres.'),
    confirmPassword: z.string().min(1, 'Confirmá la nueva contraseña.'),
  })
  .superRefine((data, ctx) => {
    if (data.nextPassword !== data.confirmPassword) {
      ctx.addIssue({
        code: 'custom',
        path: ['confirmPassword'],
        message: 'La confirmación no coincide con la nueva contraseña.',
      })
    }
  })
