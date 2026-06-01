'use client'

import { createContext, use, type ReactNode } from 'react'
import type { AdminSessionState } from './adminAccess'

// Provider que recibe la sesión ya resuelta en el server (root layout).
// Evita que cada AdminControls dispare un fetch /api/admin/me en useEffect
// y elimina el flash visual de "controles que aparecen tarde".
const AdminSessionContext = createContext<AdminSessionState | null>(null)

interface AdminSessionProviderProps {
  session: AdminSessionState
  children: ReactNode
}

export function AdminSessionProvider({ session, children }: AdminSessionProviderProps) {
  return (
    <AdminSessionContext.Provider value={session}>
      {children}
    </AdminSessionContext.Provider>
  )
}

export function useAdminSessionContext(): AdminSessionState | null {
  return use(AdminSessionContext)
}
