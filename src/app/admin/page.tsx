import { redirect } from 'next/navigation'
import { getAdminHomeDestination, requireAnyAdmin } from '@/lib/auth'

export default async function Page() {
  const admin = await requireAnyAdmin()

  redirect(getAdminHomeDestination(admin))
}
