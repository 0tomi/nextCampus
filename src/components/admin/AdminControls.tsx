'use client'

import { type ReactNode } from 'react'
import { useAdminAccess } from './adminAccess'

interface AdminControlsProps {
  /** Content to render only when the active session belongs to an admin. */
  children: ReactNode
  /**
   * What to render while the check is in flight (defaults to nothing,
   * so there's no layout shift for regular visitors).
   */
  fallback?: ReactNode
  yearId?: string
  yearSlug?: string
  requireGlobal?: boolean
  requireUserManagement?: boolean
  noWrapper?: boolean
}

/**
 * Client-side gate: renders `children` only when /api/admin/me confirms
 * the current session has admin access.
 *
 * This is a UI-only gate. All mutations are protected server-side by
 * requireAdmin() in the corresponding server actions.
 */
export function AdminControls({
  children,
  fallback = null,
  yearId,
  yearSlug,
  requireGlobal = false,
  requireUserManagement = false,
  noWrapper = false,
}: AdminControlsProps) {
  const hasAccess = useAdminAccess({
    yearId,
    yearSlug,
    requireGlobal,
    requireUserManagement,
  })

  // Still loading — render fallback (nothing by default, no flash)
  if (hasAccess === null) return <>{fallback}</>

  // Not admin — render nothing
  if (!hasAccess) return null

  if (noWrapper) {
    return <>{children}</>
  }

  return <div className="hidden lg:contents">{children}</div>
}
