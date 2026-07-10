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
// server. Se resuelve en el render (root layout) y se pasa como prop inicial.
// Derivado de AdminUser para no restatear campos ni desincronizarse de la fuente.
export type AdminClientUser = Pick<
  AdminUser,
  'id' | 'email' | 'role' | 'yearIds' | 'yearSlugs' | keyof AdminCapabilities
>

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

// Los 6 resolvers de scope por entidad comparten exactamente el mismo flujo:
// requireAnyAdmin() -> buscar la entidad -> si no existe devolver null ->
// mapearla a un scope -> requireYearAdminForScope(). Difieren solo en la query
// Prisma y en cómo se arma el scope. Se colapsan en una config por entidad
// (query + mapper) que corre un resolver genérico, preservando firmas y tipos.

// Porción de scope compartida por todas las entidades: toda entidad cuelga de
// un subject y de ahí sale el year que gobierna la autorización.
type SubjectScopeSource = {
  id: string
  slug: string
  commissions: Array<{ slug: string }>
  year: { id: string; slug: string }
}

function mapSubjectScope(
  subject: SubjectScopeSource,
): YearAdminScopeInput<SubjectAdminScope> {
  return {
    subjectId: subject.id,
    subjectSlug: subject.slug,
    commissionSlugs: subject.commissions.map((commission) => commission.slug),
    yearId: subject.year.id,
    yearSlug: subject.year.slug,
  }
}

const subjectScopeSelect = {
  id: true,
  slug: true,
  commissions: { select: { slug: true } },
  year: { select: { id: true, slug: true } },
} as const

interface ScopeResolverConfig<TEntity, TScope extends YearAdminScope> {
  fetch: (identifier: string) => Promise<TEntity | null>
  toScope: (entity: TEntity) => YearAdminScopeInput<TScope>
}

// Fija el tipo de scope de destino y deja inferir el tipo de la entidad desde
// la query Prisma, sin casts: cada config queda validada contra su scope.
function defineScopeResolver<TScope extends YearAdminScope>() {
  return <TEntity>(config: ScopeResolverConfig<TEntity, TScope>) => config
}

async function resolveYearAdminScope<TEntity, TScope extends YearAdminScope>(
  config: ScopeResolverConfig<TEntity, TScope>,
  identifier: string,
): Promise<TScope | null> {
  const admin = await requireAnyAdmin()
  const entity = await config.fetch(identifier)
  return requireYearAdminForScope<TScope>(admin, entity ? config.toScope(entity) : null)
}

const subjectByIdResolver = defineScopeResolver<SubjectAdminScope>()({
  fetch: (subjectId) =>
    prisma.subject.findUnique({ where: { id: subjectId }, select: subjectScopeSelect }),
  toScope: mapSubjectScope,
})

const subjectBySlugResolver = defineScopeResolver<SubjectAdminScope>()({
  fetch: (subjectSlug) =>
    prisma.subject.findUnique({ where: { slug: subjectSlug }, select: subjectScopeSelect }),
  toScope: mapSubjectScope,
})

const agendaByIdResolver = defineScopeResolver<AgendaAdminScope>()({
  fetch: (agendaId) =>
    prisma.agenda.findUnique({
      where: { id: agendaId },
      select: {
        id: true,
        commissionId: true,
        commission: { select: { slug: true } },
        subject: { select: subjectScopeSelect },
      },
    }),
  toScope: (agenda) => ({
    agendaId: agenda.id,
    commissionId: agenda.commissionId,
    commissionSlug: agenda.commission?.slug ?? null,
    ...mapSubjectScope(agenda.subject),
  }),
})

const eventoByIdResolver = defineScopeResolver<EventoAdminScope>()({
  fetch: (eventoId) =>
    prisma.evento.findUnique({
      where: { id: eventoId },
      select: {
        id: true,
        agenda: {
          select: {
            id: true,
            commissionId: true,
            commission: { select: { slug: true } },
            subject: { select: subjectScopeSelect },
          },
        },
      },
    }),
  toScope: (evento) => ({
    eventoId: evento.id,
    agendaId: evento.agenda.id,
    commissionId: evento.agenda.commissionId,
    commissionSlug: evento.agenda.commission?.slug ?? null,
    ...mapSubjectScope(evento.agenda.subject),
  }),
})

const commissionByIdResolver = defineScopeResolver<CommissionAdminScope>()({
  fetch: (commissionId) =>
    prisma.commission.findUnique({
      where: { id: commissionId },
      select: {
        id: true,
        slug: true,
        subject: { select: subjectScopeSelect },
      },
    }),
  toScope: (commission) => ({
    commissionId: commission.id,
    commissionSlug: commission.slug,
    ...mapSubjectScope(commission.subject),
  }),
})

const apunteByIdResolver = defineScopeResolver<ApunteAdminScope>()({
  fetch: (apunteId) =>
    prisma.apunte.findUnique({
      where: { id: apunteId },
      select: {
        id: true,
        subject: { select: subjectScopeSelect },
      },
    }),
  toScope: (apunte) => ({
    apunteId: apunte.id,
    ...mapSubjectScope(apunte.subject),
  }),
})

export function requireYearAdminForSubjectId(
  subjectId: string,
): Promise<SubjectAdminScope | null> {
  return resolveYearAdminScope(subjectByIdResolver, subjectId)
}

export function requireYearAdminForSubjectSlug(
  subjectSlug: string,
): Promise<SubjectAdminScope | null> {
  return resolveYearAdminScope(subjectBySlugResolver, subjectSlug)
}

export function requireYearAdminForAgendaId(
  agendaId: string,
): Promise<AgendaAdminScope | null> {
  return resolveYearAdminScope(agendaByIdResolver, agendaId)
}

export function requireYearAdminForEventoId(
  eventoId: string,
): Promise<EventoAdminScope | null> {
  return resolveYearAdminScope(eventoByIdResolver, eventoId)
}

export function requireYearAdminForCommissionId(
  commissionId: string,
): Promise<CommissionAdminScope | null> {
  return resolveYearAdminScope(commissionByIdResolver, commissionId)
}

export function requireYearAdminForApunteId(
  apunteId: string,
): Promise<ApunteAdminScope | null> {
  return resolveYearAdminScope(apunteByIdResolver, apunteId)
}
