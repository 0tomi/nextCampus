'use client'

import { useAdminSessionContext } from './AdminSessionProvider'

export interface AdminSessionUser {
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

export interface AdminSessionState {
  isAdmin: boolean
  admin: AdminSessionUser | null
}

export interface AdminAccessRequirements {
  yearId?: string
  yearSlug?: string
  requireGlobal?: boolean
  requireUserManagement?: boolean
  requireAcademicStructure?: boolean
  /**
   * Cuando se define, el acceso además exige propiedad del contenido: los
   * managers (admin/supervisor con canManageAnyContribution) pasan siempre;
   * el resto (ayudantes) solo si son los autores. `undefined` = no se evalúa
   * propiedad (botones estructurales, comportamiento previo). `null` explícito
   * (contenido sin autor) = solo managers.
   */
  ownerUserId?: string | null
}

export function hasAdminAccess(
  session: AdminSessionState | null,
  requirements: AdminAccessRequirements = {},
): boolean {
  if (!session?.isAdmin || !session.admin) return false

  const {
    yearId,
    yearSlug,
    requireGlobal = false,
    requireUserManagement = false,
    requireAcademicStructure = false,
    ownerUserId,
  } = requirements

  // 1) Acceso base (sin tener en cuenta propiedad del contenido).
  let baseAccess: boolean
  if (requireUserManagement) {
    baseAccess = session.admin.canCreateUsers
  } else if (requireGlobal) {
    baseAccess = session.admin.canManageAllYears
  } else if (requireAcademicStructure) {
    baseAccess = session.admin.canManageAcademicStructure
  } else if (yearId) {
    baseAccess =
      session.admin.canManageAllYears || session.admin.yearIds.includes(yearId)
  } else if (yearSlug) {
    baseAccess =
      session.admin.canManageAllYears ||
      session.admin.yearSlugs.includes(yearSlug)
  } else {
    baseAccess = true
  }

  if (!baseAccess) return false

  // 2) Propiedad (solo si el llamador la pide explícitamente).
  if (ownerUserId !== undefined) {
    return (
      session.admin.canManageAnyContribution ||
      (Boolean(ownerUserId) && session.admin.id === ownerUserId)
    )
  }

  return true
}

// Hook que lee la sesión del provider (resuelta server-side en el layout).
// Sin fetch, sin flash, sin estado de carga: durante el render inicial el
// valor ya está disponible.
export function useAdminSession(): AdminSessionState | null {
  return useAdminSessionContext()
}

export function useAdminAccess(
  requirements: AdminAccessRequirements = {},
): boolean {
  const session = useAdminSession()
  return hasAdminAccess(session, requirements)
}
