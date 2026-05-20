'use client'

import { useEffect, useState, type ReactNode } from 'react'

interface AdminControlsProps {
  /** Content to render only when the active session belongs to an admin. */
  children: ReactNode
  /**
   * What to render while the check is in flight (defaults to nothing,
   * so there's no layout shift for regular visitors).
   */
  fallback?: ReactNode
}

/**
 * Client-side gate: renders `children` only when /api/admin/me confirms
 * the current session has admin access.
 *
 * This is a UI-only gate. All mutations are protected server-side by
 * requireAdmin() in the corresponding server actions.
 */
export function AdminControls({ children, fallback = null }: AdminControlsProps) {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false

    fetch('/api/admin/me', { credentials: 'same-origin' })
      .then((res) => {
        if (!res.ok) return { isAdmin: false }
        return res.json() as Promise<{ isAdmin: boolean }>
      })
      .then((data) => {
        if (!cancelled) setIsAdmin(data.isAdmin)
      })
      .catch(() => {
        if (!cancelled) setIsAdmin(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  // Still loading — render fallback (nothing by default, no flash)
  if (isAdmin === null) return <>{fallback}</>

  // Not admin — render nothing
  if (!isAdmin) return null

  return <div className="hidden lg:contents">{children}</div>
}
