'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { UserRole, UserStatus } from '../../../../prisma/generated/client/enums'
import { prisma } from '@/lib/prisma'
import { requireGeneralAdmin } from '@/lib/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export interface AdminUserActionState {
  ok: boolean
  message: string
}


const selectedYearsSchema = z.array(z.string().min(1)).min(1, 'Elegí al menos un año.')

const createAdminCampusSchema = z.object({
  email: z.email('Ingresá un email válido.').transform((value) => value.trim().toLowerCase()),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
  yearIds: selectedYearsSchema,
})

const editAdminCampusSchema = z.object({
  id: z.string().min(1),
  email: z.email('Ingresá un email válido.').transform((value) => value.trim().toLowerCase()),
  password: z.string().trim().optional(),
  status: z.enum([UserStatus.ACTIVE, UserStatus.DISABLED], 'Elegí un estado válido.'),
  yearIds: selectedYearsSchema,
}).superRefine((data, ctx) => {
  if (data.password && data.password.length < 8) {
    ctx.addIssue({
      code: 'custom',
      path: ['password'],
      message: 'La nueva contraseña debe tener al menos 8 caracteres.',
    })
  }
})

function formYearIds(formData: FormData): string[] {
  return formData
    .getAll('yearIds')
    .map((value) => String(value))
    .filter(Boolean)
}

async function validateYearIds(yearIds: string[]): Promise<string[]> {
  const uniqueIds = Array.from(new Set(yearIds))
  const count = await prisma.academicYear.count({ where: { id: { in: uniqueIds } } })
  if (count !== uniqueIds.length) {
    throw new Error('Alguno de los años elegidos ya no está disponible.')
  }
  return uniqueIds
}

function friendlyError(error: unknown): AdminUserActionState {
  if (error instanceof z.ZodError) {
    return { ok: false, message: error.issues[0]?.message ?? 'Revisá los datos ingresados.' }
  }
  if (error instanceof Error && error.message) {
    return { ok: false, message: error.message }
  }
  return { ok: false, message: 'No pudimos guardar los cambios. Intentá de nuevo.' }
}

async function ensureEmailAvailable(email: string, currentUserId?: string): Promise<void> {
  const existing = await prisma.userAccount.findUnique({
    where: { email },
    select: { id: true },
  })

  if (existing && existing.id !== currentUserId) {
    throw new Error('Ya existe una cuenta con ese email.')
  }
}

export async function createAdminCampusAction(
  _prev: AdminUserActionState,
  formData: FormData,
): Promise<AdminUserActionState> {
  try {
    await requireGeneralAdmin()
    const data = createAdminCampusSchema.parse({
      email: formData.get('email'),
      password: formData.get('password'),
      yearIds: formYearIds(formData),
    })
    const yearIds = await validateYearIds(data.yearIds)
    await ensureEmailAvailable(data.email)

    const supabase = createSupabaseAdminClient()
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    })

    if (createError || !created.user?.id) {
      throw new Error(createError?.message ?? 'No pudimos crear la cuenta.')
    }

    try {
      await prisma.$transaction(async (tx) => {
        const user = await tx.userAccount.create({
          data: {
            authUserId: created.user.id,
            email: data.email,
            role: UserRole.ADMIN_CAMPUS,
            status: UserStatus.ACTIVE,
          },
          select: { id: true },
        })

        await tx.userYearPermission.createMany({
          data: yearIds.map((yearId) => ({ userId: user.id, yearId })),
          skipDuplicates: true,
        })
      })
    } catch (error) {
      try {
        await supabase.auth.admin.deleteUser(created.user.id)
      } catch {
        // Limpieza best-effort: si falla, la cuenta queda para revisión manual.
      }
      throw error
    }

    revalidatePath('/admin/users')
    return { ok: true, message: 'Administrador creado correctamente.' }
  } catch (error) {
    return friendlyError(error)
  }
}

export async function updateAdminCampusAction(
  _prev: AdminUserActionState,
  formData: FormData,
): Promise<AdminUserActionState> {
  try {
    await requireGeneralAdmin()
    const data = editAdminCampusSchema.parse({
      id: formData.get('id'),
      email: formData.get('email'),
      password: String(formData.get('password') ?? '').trim() || undefined,
      status: formData.get('status'),
      yearIds: formYearIds(formData),
    })
    const yearIds = await validateYearIds(data.yearIds)

    const current = await prisma.userAccount.findUnique({
      where: { id: data.id },
      select: { id: true, authUserId: true, email: true, role: true },
    })

    if (!current) throw new Error('No encontramos esa cuenta.')
    if (current.role !== UserRole.ADMIN_CAMPUS) {
      throw new Error('Esta cuenta no se puede editar desde esta pantalla.')
    }

    await ensureEmailAvailable(data.email, current.id)

    const emailChanged = data.email !== current.email
    const authUpdates: { email?: string; password?: string; email_confirm?: boolean } = {}
    if (emailChanged) {
      authUpdates.email = data.email
      authUpdates.email_confirm = true
    }
    if (data.password) authUpdates.password = data.password

    const supabase = createSupabaseAdminClient()
    if (Object.keys(authUpdates).length > 0) {
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        current.authUserId,
        authUpdates,
      )
      if (updateError) throw new Error(updateError.message)
    }

    try {
      await prisma.$transaction(async (tx) => {
        await tx.userAccount.update({
          where: { id: current.id },
          data: {
            email: data.email,
            status: data.status,
          },
        })
        await tx.userYearPermission.deleteMany({ where: { userId: current.id } })
        await tx.userYearPermission.createMany({
          data: yearIds.map((yearId) => ({ userId: current.id, yearId })),
          skipDuplicates: true,
        })
      })
    } catch (error) {
      if (emailChanged) {
        try {
          await supabase.auth.admin.updateUserById(current.authUserId, {
            email: current.email,
            email_confirm: true,
          })
        } catch {
          // Rollback best-effort.
        }
      }
      throw error
    }

    revalidatePath('/admin/users')
    revalidatePath(`/admin/users/edit/${current.id}`)
    return { ok: true, message: 'Cambios guardados correctamente.' }
  } catch (error) {
    return friendlyError(error)
  }
}
