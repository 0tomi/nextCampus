'use client'

import { type ReactNode } from 'react'
import { useAdminAccess } from './adminAccess'

interface AdminControlsProps {
  /** Content to render only when the active session belongs to an admin. */
  children: ReactNode
  yearId?: string
  yearSlug?: string
  requireGlobal?: boolean
  requireUserManagement?: boolean
  noWrapper?: boolean
}

/**
 * UI gate: muestra `children` sólo si la sesión es de un admin con los
 * permisos requeridos. La sesión llega resuelta desde el server (provider
 * en el root layout), así que no hay flash ni fetch en cliente.
 *
 * Todas las mutaciones reales están protegidas server-side por requireAdmin()
 * en las server actions; esto es estrictamente cosmético.
 */
export function AdminControls({
  children,
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

  if (!hasAccess) return null

  if (noWrapper) {
    return <>{children}</>
  }

  return <div className="hidden lg:contents">{children}</div>
}
