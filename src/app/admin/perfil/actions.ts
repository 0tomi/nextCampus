'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireAnyAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AUDIT_ACTIONS, recordAudit } from '@/lib/audit'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export interface ProfileActionState {
  ok: boolean
  message: string
}

export const initialProfileActionState: ProfileActionState = {
  ok: false,
  message: '',
}

class ProfileActionError extends Error {}

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

function errorMessage(error: unknown): string {
  if (error instanceof ProfileActionError) return error.message
  if (error instanceof z.ZodError) return error.issues[0]?.message ?? 'Revisá los datos e intentá de nuevo.'

  return ''
}

function emailActionError(error: unknown): ProfileActionState {
  const message = errorMessage(error)

  return {
    ok: false,
    message: message || 'No pudimos actualizar el correo. Intentá de nuevo.',
  }
}

function passwordActionError(error: unknown): ProfileActionState {
  const message = errorMessage(error)

  return {
    ok: false,
    message: message || 'No pudimos actualizar la contraseña. Intentá de nuevo.',
  }
}

function revalidateAdminProfileViews() {
  revalidatePath('/admin/perfil')
  revalidatePath('/admin/historial')
  revalidatePath('/admin', 'layout')
}

async function ensureEmailAvailable(email: string, currentUserId: string) {
  const existing = await prisma.userAccount.findUnique({
    where: { email },
    select: { id: true },
  })

  if (existing && existing.id !== currentUserId) {
    throw new ProfileActionError('Ya existe una cuenta con ese correo.')
  }
}

function mapPasswordUpdateError(error: unknown): never {
  if (error instanceof z.ZodError || error instanceof ProfileActionError) {
    throw error
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase()

    if (message.includes('same password')) {
      throw new ProfileActionError('Elegí una contraseña distinta a la actual.')
    }

    if (
      message.includes('current password') ||
      message.includes('invalid login credentials') ||
      (message.includes('password') && message.includes('invalid'))
    ) {
      throw new ProfileActionError('La contraseña actual no coincide.')
    }
  }

  throw error
}

export async function updateAdminEmailAction(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const admin = await requireAnyAdmin()

  try {
    const data = updateAdminEmailSchema.parse({
      nextEmail: formData.get('nextEmail'),
    })

    if (data.nextEmail === admin.email) {
      throw new ProfileActionError('Ingresá un correo distinto al actual.')
    }

    await ensureEmailAvailable(data.nextEmail, admin.id)

    const supabase = createSupabaseAdminClient()
    const { error: authError } = await supabase.auth.admin.updateUserById(admin.authUserId, {
      email: data.nextEmail,
      email_confirm: true,
    })

    if (authError) {
      throw authError
    }

    try {
      await prisma.userAccount.update({
        where: { id: admin.id },
        data: { email: data.nextEmail },
      })
    } catch (error) {
      try {
        await supabase.auth.admin.updateUserById(admin.authUserId, {
          email: admin.email,
          email_confirm: true,
        })
      } catch {
        // Rollback best-effort.
      }

      throw error
    }

    await recordAudit({
      userId: admin.id,
      action: AUDIT_ACTIONS.USER_UPDATED,
      entityType: 'user',
      entityId: admin.id,
      detail: {
        previousEmail: admin.email,
        email: data.nextEmail,
        emailChanged: true,
        passwordChanged: false,
      },
    })

    revalidateAdminProfileViews()

    return { ok: true, message: 'Correo actualizado correctamente.' }
  } catch (error) {
    return emailActionError(error)
  }
}

export async function updateAdminPasswordAction(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const admin = await requireAnyAdmin()

  try {
    const data = updateAdminPasswordSchema.parse({
      currentPassword: formData.get('currentPassword'),
      nextPassword: formData.get('nextPassword'),
      confirmPassword: formData.get('confirmPassword'),
    })

    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.updateUser({
      password: data.nextPassword,
      current_password: data.currentPassword,
    })

    if (error) {
      mapPasswordUpdateError(error)
    }

    await recordAudit({
      userId: admin.id,
      action: AUDIT_ACTIONS.USER_UPDATED,
      entityType: 'user',
      entityId: admin.id,
      detail: {
        passwordChanged: true,
      },
    })

    revalidateAdminProfileViews()

    return { ok: true, message: 'Contraseña actualizada correctamente.' }
  } catch (error) {
    return passwordActionError(error)
  }
}
