'use client'

import { useEffect, useState } from 'react'

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

const VISITOR_SESSION: AdminSessionState = {
  isAdmin: false,
  admin: null,
}

let cachedAdminSession: AdminSessionState | null = null
let adminSessionPromise: Promise<AdminSessionState> | null = null

function normalizeAdminSession(payload: unknown): AdminSessionState {
  if (!payload || typeof payload !== 'object') return VISITOR_SESSION

  const data = payload as {
    isAdmin?: boolean
    admin?: Partial<AdminSessionUser> | null
  }

  if (!data.isAdmin || !data.admin) return VISITOR_SESSION

  return {
    isAdmin: true,
    admin: {
      id: data.admin.id ?? '',
      email: data.admin.email ?? '',
      role: data.admin.role ?? '',
      yearIds: Array.isArray(data.admin.yearIds) ? data.admin.yearIds : [],
      yearSlugs: Array.isArray(data.admin.yearSlugs) ? data.admin.yearSlugs : [],
      canManageAllYears: Boolean(data.admin.canManageAllYears),
      canCreateUsers: Boolean(data.admin.canCreateUsers),
    },
  }
}

export async function fetchAdminSession(): Promise<AdminSessionState> {
  if (cachedAdminSession) return cachedAdminSession
  if (adminSessionPromise) return adminSessionPromise

  adminSessionPromise = fetch('/api/admin/me', {
    credentials: 'same-origin',
  })
    .then((res) => (res.ok ? res.json() : VISITOR_SESSION))
    .then((payload) => {
      const normalized = normalizeAdminSession(payload)
      cachedAdminSession = normalized
      return normalized
    })
    .catch(() => {
      cachedAdminSession = VISITOR_SESSION
      return VISITOR_SESSION
    })
    .finally(() => {
      adminSessionPromise = null
    })

  return adminSessionPromise
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
  } =
    requirements

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

export function useAdminSession(): AdminSessionState | null {
  const [session, setSession] = useState<AdminSessionState | null>(
    cachedAdminSession,
  )

  useEffect(() => {
    let cancelled = false

    fetchAdminSession().then((nextSession) => {
      if (!cancelled) setSession(nextSession)
    })

    return () => {
      cancelled = true
    }
  }, [])

  return session
}

export function useAdminAccess(
  requirements: AdminAccessRequirements = {},
): boolean | null {
  const session = useAdminSession()
  if (session === null) return null
  return hasAdminAccess(session, requirements)
}
