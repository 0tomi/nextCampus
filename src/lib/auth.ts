import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from './supabase/server'
import { isAuthSessionMissingError, isInvalidRefreshTokenError } from './supabase/auth-errors'
import { env } from '@/lib/env'
import { prisma } from '@/lib/prisma'

export const USER_ROLES = {
  ADMIN_GENERAL: 'ADMIN_GENERAL',
  ADMIN_CAMPUS: 'ADMIN_CAMPUS',
} as const

export const USER_STATUSES = {
  ACTIVE: 'ACTIVE',
  DISABLED: 'DISABLED',
} as const

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES]
export type UserStatus = (typeof USER_STATUSES)[keyof typeof USER_STATUSES]

export interface AdminCapabilities {
  canManageAllYears: boolean
  canCreateUsers: boolean
}

export interface AdminUser extends AdminCapabilities {
  id: string
  authUserId: string
  email: string
  role: UserRole
  status: UserStatus
  yearIds: string[]
  yearSlugs: string[]
}

type SupabaseAuthUser = {
  id: string
  email?: string | null
}

type DbUserAccount = {
  id: string
  authUserId: string
  email: string
  role: UserRole
  status: UserStatus
  yearPermissions?: Array<{
    year: {
      id: string
      slug: string
    }
  }>
}

type UserAccountDelegate = {
  findUnique(args: {
    where: { authUserId: string }
    include?: { yearPermissions?: { include?: { year?: true } } }
  }): Promise<DbUserAccount | null>
  upsert(args: {
    where: { authUserId: string }
    create: {
      authUserId: string
      email: string
      role: UserRole
      status: UserStatus
    }
    update: {
      email: string
      role?: UserRole
      status?: UserStatus
    }
  }): Promise<DbUserAccount>
}

type PrismaWithUserAccounts = typeof prisma & {
  userAccount: UserAccountDelegate
}

function adminAllowlist(): string[] {
  return env.ADMIN_EMAILS
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
}

export function isBootstrapGeneralAdminEmail(email: string): boolean {
  return adminAllowlist().includes(email.trim().toLowerCase())
}

export function buildAdminCapabilities(role: UserRole): AdminCapabilities {
  return {
    canManageAllYears: role === USER_ROLES.ADMIN_GENERAL,
    canCreateUsers: role === USER_ROLES.ADMIN_GENERAL,
  }
}

export function buildAdminUser(account: DbUserAccount): AdminUser | null {
  if (account.status !== USER_STATUSES.ACTIVE) return null

  const yearIds = account.yearPermissions?.map((permission) => permission.year.id) ?? []
  const yearSlugs = account.yearPermissions?.map((permission) => permission.year.slug) ?? []
  const capabilities = buildAdminCapabilities(account.role)

  return {
    id: account.id,
    authUserId: account.authUserId,
    email: account.email.toLowerCase(),
    role: account.role,
    status: account.status,
    yearIds,
    yearSlugs,
    ...capabilities,
  }
}

// Dedup por request: si la misma request llama getAdminUser() varias veces
// (layout, página, server actions), solo pegamos a Supabase una vez.
const getAuthenticatedUser = cache(
  async (): Promise<SupabaseAuthUser | null> => {
    const supabase = await createSupabaseServerClient()
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()

      if (error) {
        if (isAuthSessionMissingError(error) || isInvalidRefreshTokenError(error)) {
          return null
        }

        throw error
      }

      if (!user?.email) return null
      return { id: user.id, email: user.email }
    } catch (error) {
      if (isAuthSessionMissingError(error) || isInvalidRefreshTokenError(error)) {
        return null
      }

      throw error
    }
  },
)

async function upsertBootstrapGeneralAdmin(user: SupabaseAuthUser, email: string): Promise<AdminUser> {
  const db = prisma as PrismaWithUserAccounts
  const account = await db.userAccount.upsert({
    where: { authUserId: user.id },
    create: {
      authUserId: user.id,
      email,
      role: USER_ROLES.ADMIN_GENERAL,
      status: USER_STATUSES.ACTIVE,
    },
    update: {
      email,
      role: USER_ROLES.ADMIN_GENERAL,
      status: USER_STATUSES.ACTIVE,
    },
  })

  return {
    id: account.id,
    authUserId: account.authUserId,
    email,
    role: USER_ROLES.ADMIN_GENERAL,
    status: USER_STATUSES.ACTIVE,
    yearIds: [],
    yearSlugs: [],
    canManageAllYears: true,
    canCreateUsers: true,
  }
}

// Devuelve el admin autenticado o null. Usa getUser() (verifica el JWT contra
// Supabase), NUNCA getSession() (que confía en la cookie sin validar).
// Cacheado por request con React.cache para evitar repegar Supabase + Prisma
// cuando varios componentes del mismo render lo necesitan.
export const getAdminUser = cache(async (): Promise<AdminUser | null> => {
  const user = await getAuthenticatedUser()
  if (!user?.email) return null

  const email = user.email.toLowerCase()

  if (isBootstrapGeneralAdminEmail(email)) {
    return upsertBootstrapGeneralAdmin(user, email)
  }

  const db = prisma as PrismaWithUserAccounts
  const account = await db.userAccount.findUnique({
    where: { authUserId: user.id },
    include: {
      yearPermissions: {
        include: {
          year: true,
        },
      },
    },
  })

  if (!account || account.role !== USER_ROLES.ADMIN_CAMPUS) return null
  return buildAdminUser(account)
})

// Redirige a /admin/login si no hay admin. Para usar al inicio de toda server
// action de escritura. Usa redirect() para un 302 limpio en lugar de un 500.
export async function requireAnyAdmin(): Promise<AdminUser> {
  const admin = await getAdminUser()
  if (!admin) {
    redirect('/admin/login')
  }
  return admin
}

// Alias compatible con las llamadas existentes. F2 reemplazará los checks amplios
// por helpers más específicos según la mutación.
export const requireAdmin = requireAnyAdmin

export async function requireGeneralAdmin(): Promise<AdminUser> {
  const admin = await requireAnyAdmin()
  if (admin.role !== USER_ROLES.ADMIN_GENERAL) {
    redirect('/admin/login')
  }
  return admin
}

// Shape pensada para hidratar el client provider del admin: lo que el
// cliente necesita para evaluar hasAdminAccess() sin volver a pegarle al
// server. Idéntico al payload de /api/admin/me, pero resuelto en el render.
export interface AdminClientUser {
  id: string
  email: string
  role: string
  yearIds: string[]
  yearSlugs: string[]
  canManageAllYears: boolean
  canCreateUsers: boolean
}

export interface AdminClientSession {
  isAdmin: boolean
  admin: AdminClientUser | null
}

export async function getAdminClientSession(): Promise<AdminClientSession> {
  const admin = await getAdminUser()
  if (!admin) return { isAdmin: false, admin: null }
  return {
    isAdmin: true,
    admin: {
      id: admin.id,
      email: admin.email,
      role: admin.role,
      yearIds: admin.yearIds,
      yearSlugs: admin.yearSlugs,
      canManageAllYears: admin.canManageAllYears,
      canCreateUsers: admin.canCreateUsers,
    },
  }
}

export function adminCanManageYear(admin: AdminUser, yearId: string): boolean {
  return admin.canManageAllYears || admin.yearIds.includes(yearId)
}

export const canAdminManageYear = adminCanManageYear

export async function requireYearAdminForYearId(yearId: string): Promise<AdminUser> {
  const admin = await requireAnyAdmin()
  if (!adminCanManageYear(admin, yearId)) {
    redirect('/admin/login')
  }
  return admin
}

export interface YearAdminScope {
  admin: AdminUser
  yearId: string
  yearSlug: string
}

export interface SubjectAdminScope extends YearAdminScope {
  subjectId: string
  subjectSlug: string
}

export interface AgendaAdminScope extends SubjectAdminScope {
  agendaId: string
}

export interface EventoAdminScope extends AgendaAdminScope {
  eventoId: string
}

export interface ApunteAdminScope extends SubjectAdminScope {
  apunteId: string
}

type YearAdminScopeInput<T extends YearAdminScope> = Omit<T, 'admin'> & {
  admin?: never
}

async function requireYearAdminForScope<T extends YearAdminScope>(
  admin: AdminUser,
  scope: YearAdminScopeInput<T> | null,
): Promise<T | null> {
  if (!scope) return null

  if (!adminCanManageYear(admin, scope.yearId)) {
    redirect('/admin/login')
  }
  return { ...scope, admin } as T
}

export async function requireYearAdminForSubjectId(
  subjectId: string,
): Promise<SubjectAdminScope | null> {
  const admin = await requireAnyAdmin()
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    select: {
      id: true,
      slug: true,
      year: { select: { id: true, slug: true } },
    },
  })

  return requireYearAdminForScope(
    admin,
    subject
      ? {
          subjectId: subject.id,
          subjectSlug: subject.slug,
          yearId: subject.year.id,
          yearSlug: subject.year.slug,
        }
      : null,
  )
}

export async function requireYearAdminForSubjectSlug(
  subjectSlug: string,
): Promise<SubjectAdminScope | null> {
  const admin = await requireAnyAdmin()
  const subject = await prisma.subject.findUnique({
    where: { slug: subjectSlug },
    select: {
      id: true,
      slug: true,
      year: { select: { id: true, slug: true } },
    },
  })

  return requireYearAdminForScope(
    admin,
    subject
      ? {
          subjectId: subject.id,
          subjectSlug: subject.slug,
          yearId: subject.year.id,
          yearSlug: subject.year.slug,
        }
      : null,
  )
}

export async function requireYearAdminForAgendaId(
  agendaId: string,
): Promise<AgendaAdminScope | null> {
  const admin = await requireAnyAdmin()
  const agenda = await prisma.agenda.findUnique({
    where: { id: agendaId },
    select: {
      id: true,
      subject: {
        select: {
          id: true,
          slug: true,
          year: { select: { id: true, slug: true } },
        },
      },
    },
  })

  return requireYearAdminForScope(
    admin,
    agenda
      ? {
          agendaId: agenda.id,
          subjectId: agenda.subject.id,
          subjectSlug: agenda.subject.slug,
          yearId: agenda.subject.year.id,
          yearSlug: agenda.subject.year.slug,
        }
      : null,
  )
}

export async function requireYearAdminForEventoId(
  eventoId: string,
): Promise<EventoAdminScope | null> {
  const admin = await requireAnyAdmin()
  const evento = await prisma.evento.findUnique({
    where: { id: eventoId },
    select: {
      id: true,
      agenda: {
        select: {
          id: true,
          subject: {
            select: {
              id: true,
              slug: true,
              year: { select: { id: true, slug: true } },
            },
          },
        },
      },
    },
  })

  return requireYearAdminForScope(
    admin,
    evento
      ? {
          eventoId: evento.id,
          agendaId: evento.agenda.id,
          subjectId: evento.agenda.subject.id,
          subjectSlug: evento.agenda.subject.slug,
          yearId: evento.agenda.subject.year.id,
          yearSlug: evento.agenda.subject.year.slug,
        }
      : null,
  )
}

export async function requireYearAdminForApunteId(
  apunteId: string,
): Promise<ApunteAdminScope | null> {
  const admin = await requireAnyAdmin()
  const apunte = await prisma.apunte.findUnique({
    where: { id: apunteId },
    select: {
      id: true,
      subject: {
        select: {
          id: true,
          slug: true,
          year: { select: { id: true, slug: true } },
        },
      },
    },
  })

  return requireYearAdminForScope(
    admin,
    apunte
      ? {
          apunteId: apunte.id,
          subjectId: apunte.subject.id,
          subjectSlug: apunte.subject.slug,
          yearId: apunte.subject.year.id,
          yearSlug: apunte.subject.year.slug,
        }
      : null,
  )
}
