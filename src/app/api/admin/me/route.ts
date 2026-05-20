import { NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/auth'

// Never cache — this route reads auth cookies and must always be dynamic.
export const dynamic = 'force-dynamic'

export async function GET() {
  const admin = await getAdminUser()

  if (!admin) {
    return NextResponse.json({ isAdmin: false })
  }

  return NextResponse.json({
    isAdmin: true,
    admin: {
      id: admin.id,
      email: admin.email,
      role: admin.role,
      yearIds: admin.yearIds,
      yearSlugs: admin.yearSlugs,
      canManageAllYears: admin.canManageAllYears,
      canCreateUsers: admin.canCreateUsers,
    },
  })
}
