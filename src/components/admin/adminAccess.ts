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
  } = requirements

  if (requireUserManagement) return session.admin.canCreateUsers
  if (requireGlobal) return session.admin.canManageAllYears

  if (yearId) {
    return (
      session.admin.canManageAllYears || session.admin.yearIds.includes(yearId)
    )
  }

  if (yearSlug) {
    return (
      session.admin.canManageAllYears ||
      session.admin.yearSlugs.includes(yearSlug)
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
