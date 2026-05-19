import { NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/auth'

// Never cache — this route reads auth cookies and must always be dynamic.
export const dynamic = 'force-dynamic'

export async function GET() {
  const admin = await getAdminUser()
  return NextResponse.json({ isAdmin: admin !== null })
}
