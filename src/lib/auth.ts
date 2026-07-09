import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from './supabase/server'
import { isAuthSessionMissingError, isInvalidRefreshTokenError } from './supabase/auth-errors'
import { env } from '@/lib/env'
import { prisma } from '@/lib/prisma'

export const USER_ROLES = {
  ADMIN: 'ADMIN',
  SUPERVISOR: 'SUPERVISOR',
  AYUDANTE: 'AYUDANTE',
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
  canViewAuditHistory: boolean
  canManageAcademicStructure: boolean
  canManageAnyContribution: boolean
  canCreateContributions: boolean
}

export interface AdminUser extends AdminCapabilities {
  id: string
  authUserId: string
  email: string
  role: UserRole
  status: UserStatus
  nombreUsuario: string
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
  nombreUsuario?: string
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
      nombreUsuario: string
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
  const isAdmin = role === USER_ROLES.ADMIN
  const isSupervisor = role === USER_ROLES.SUPERVISOR
  return {
    canManageAllYears: isAdmin,
    canCreateUsers: isAdmin,
    canViewAuditHistory: isAdmin || isSupervisor,
    canManageAcademicStructure: isAdmin || isSupervisor,
    canManageAnyContribution: isAdmin || isSupervisor,
    canCreateContributions: true,
  }
}

export function getAdminHomeDestination(
  admin: Pick<AdminCapabilities, 'canCreateUsers'>,
): '/admin/users' | '/admin/perfil' {
  return admin.canCreateUsers ? '/admin/users' : '/admin/perfil'
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
    nombreUsuario: account.nombreUsuario ?? account.email,
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
      role: USER_ROLES.ADMIN,
      status: USER_STATUSES.ACTIVE,
      nombreUsuario: email,
    },
    update: {
      email,
      role: USER_ROLES.ADMIN,
      status: USER_STATUSES.ACTIVE,
    },
  })

  return {
    id: account.id,
    authUserId: account.authUserId,
    email,
    role: USER_ROLES.ADMIN,
    status: USER_STATUSES.ACTIVE,
    nombreUsuario: account.nombreUsuario ?? email,
    yearIds: [],
    yearSlugs: [],
    ...buildAdminCapabilities(USER_ROLES.ADMIN),
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

  if (!account) return null

  if (
    account.role !== USER_ROLES.AYUDANTE &&
    account.role !== USER_ROLES.SUPERVISOR &&
    account.role !== USER_ROLES.ADMIN
  ) {
    return null
  }

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

export async function requireGeneralAdmin(): Promise<AdminUser> {
  const admin = await requireAnyAdmin()
  if (admin.role !== USER_ROLES.ADMIN) {
    redirect('/admin/login')
  }
  return admin
}

export async function requireAcademicManager(): Promise<AdminUser> {
  const admin = await requireAnyAdmin()
  if (!admin.canManageAcademicStructure) {
    redirect('/admin/login')
  }
  return admin
}

export async function requireAuditViewer(): Promise<AdminUser> {
  const admin = await requireAnyAdmin()
  if (!admin.canViewAuditHistory) {
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
  canViewAuditHistory: boolean
  canManageAcademicStructure: boolean
  canManageAnyContribution: boolean
  canCreateContributions: boolean
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
      canViewAuditHistory: admin.canViewAuditHistory,
      canManageAcademicStructure: admin.canManageAcademicStructure,
      canManageAnyContribution: admin.canManageAnyContribution,
      canCreateContributions: admin.canCreateContributions,
    },
  }
}

export function adminCanManageYear(admin: AdminUser, yearId: string): boolean {
  return admin.canManageAllYears || admin.yearIds.includes(yearId)
}

export function adminCanManageAcademicStructure(admin: AdminUser): boolean {
  return admin.canManageAcademicStructure
}

export function adminCanManageContribution(
  admin: AdminUser,
  ownerUserId: string | null | undefined,
): boolean {
  if (admin.canManageAnyContribution) return true
  return Boolean(ownerUserId && ownerUserId === admin.id)
}

export function ensureCanManageContribution(
  admin: AdminUser,
  ownerUserId: string | null | undefined,
): void {
  if (!adminCanManageContribution(admin, ownerUserId)) {
    redirect('/admin/login')
  }
}

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
  commissionSlugs: string[]
}

export interface CommissionAdminScope extends SubjectAdminScope {
  commissionId: string
  commissionSlug: string
}

export interface AgendaAdminScope extends SubjectAdminScope {
  agendaId: string
  commissionId: string | null
  commissionSlug: string | null
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
      commissions: { select: { slug: true } },
      year: { select: { id: true, slug: true } },
    },
  })

  return requireYearAdminForScope(
    admin,
    subject
      ? {
          subjectId: subject.id,
          subjectSlug: subject.slug,
          commissionSlugs: subject.commissions.map((commission) => commission.slug),
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
      commissions: { select: { slug: true } },
      year: { select: { id: true, slug: true } },
    },
  })

  return requireYearAdminForScope(
    admin,
    subject
      ? {
          subjectId: subject.id,
          subjectSlug: subject.slug,
          commissionSlugs: subject.commissions.map((commission) => commission.slug),
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
      commissionId: true,
      commission: {
        select: {
          slug: true,
        },
      },
      subject: {
        select: {
          id: true,
          slug: true,
          commissions: { select: { slug: true } },
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
          commissionId: agenda.commissionId,
          commissionSlug: agenda.commission?.slug ?? null,
          subjectId: agenda.subject.id,
          subjectSlug: agenda.subject.slug,
          commissionSlugs: agenda.subject.commissions.map((commission) => commission.slug),
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
          commissionId: true,
          commission: {
            select: {
              slug: true,
            },
          },
          subject: {
            select: {
              id: true,
              slug: true,
              commissions: { select: { slug: true } },
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
          commissionId: evento.agenda.commissionId,
          commissionSlug: evento.agenda.commission?.slug ?? null,
          subjectId: evento.agenda.subject.id,
          subjectSlug: evento.agenda.subject.slug,
          commissionSlugs: evento.agenda.subject.commissions.map(
            (commission) => commission.slug,
          ),
          yearId: evento.agenda.subject.year.id,
          yearSlug: evento.agenda.subject.year.slug,
        }
      : null,
  )
}

export async function requireYearAdminForCommissionId(
  commissionId: string,
): Promise<CommissionAdminScope | null> {
  const admin = await requireAnyAdmin()
  const commission = await prisma.commission.findUnique({
    where: { id: commissionId },
    select: {
      id: true,
      slug: true,
      subject: {
        select: {
          id: true,
          slug: true,
          commissions: { select: { slug: true } },
          year: { select: { id: true, slug: true } },
        },
      },
    },
  })

  return requireYearAdminForScope(
    admin,
    commission
      ? {
          commissionId: commission.id,
          commissionSlug: commission.slug,
          subjectId: commission.subject.id,
          subjectSlug: commission.subject.slug,
          commissionSlugs: commission.subject.commissions.map((item) => item.slug),
          yearId: commission.subject.year.id,
          yearSlug: commission.subject.year.slug,
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
          commissions: { select: { slug: true } },
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
          commissionSlugs: apunte.subject.commissions.map((commission) => commission.slug),
          yearId: apunte.subject.year.id,
          yearSlug: apunte.subject.year.slug,
        }
      : null,
  )
}
