import { redirect } from 'next/navigation'
import { getAdminUser } from '@/lib/auth'

export default async function Page() {
  const admin = await getAdminUser()
  if (!admin) {
    redirect('/admin/login')
  }
  redirect('/admin/users')
}
