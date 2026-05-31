'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireAnyAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AUDIT_ACTIONS, recordAudit } from '@/lib/audit'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  updateAdminProfileSchema,
  updateAdminPasswordSchema,
  type ProfileActionState,
} from './schemas'

class ProfileActionError extends Error {}

function errorMessage(error: unknown): string {
  if (error instanceof ProfileActionError) return error.message
  if (error instanceof z.ZodError) return error.issues[0]?.message ?? 'Revisá los datos e intentá de nuevo.'

  return ''
}

function profileActionError(error: unknown): ProfileActionState {
  const message = errorMessage(error)

  return {
    ok: false,
    message: message || 'No pudimos actualizar el perfil. Intentá de nuevo.',
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

export async function updateAdminProfileAction(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const admin = await requireAnyAdmin()

  try {
    const data = updateAdminProfileSchema.parse({
      nombreUsuario: formData.get('nombreUsuario'),
      nextEmail: formData.get('nextEmail'),
    })

    const db = prisma

    // Get current DB user to read current nombreUsuario and email
    const currentAccount = await db.userAccount.findUnique({
      where: { id: admin.id },
      select: { nombreUsuario: true, email: true },
    })

    if (!currentAccount) {
      throw new ProfileActionError('Usuario no encontrado.')
    }

    const emailChanged = data.nextEmail !== currentAccount.email
    const nameChanged = data.nombreUsuario !== currentAccount.nombreUsuario

    if (!emailChanged && !nameChanged) {
      return { ok: true, message: 'No hubo cambios para actualizar.' }
    }

    if (emailChanged) {
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
        await db.userAccount.update({
          where: { id: admin.id },
          data: {
            email: data.nextEmail,
            nombreUsuario: data.nombreUsuario,
          },
        })
      } catch (error) {
        // Rollback email in Supabase Auth on error
        try {
          await supabase.auth.admin.updateUserById(admin.authUserId, {
            email: currentAccount.email,
            email_confirm: true,
          })
        } catch {
          // Rollback best-effort.
        }
        throw error
      }
    } else {
      // Solo cambió el nombre
      await db.userAccount.update({
        where: { id: admin.id },
        data: {
          nombreUsuario: data.nombreUsuario,
        },
      })
    }

    await recordAudit({
      userId: admin.id,
      action: AUDIT_ACTIONS.USER_UPDATED,
      entityType: 'user',
      entityId: admin.id,
      detail: {
        previousEmail: currentAccount.email,
        email: data.nextEmail,
        emailChanged,
        nombreUsuario: data.nombreUsuario,
        nameChanged,
        passwordChanged: false,
      },
    })

    revalidateAdminProfileViews()

    return { ok: true, message: 'Perfil actualizado correctamente.' }
  } catch (error) {
    return profileActionError(error)
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
