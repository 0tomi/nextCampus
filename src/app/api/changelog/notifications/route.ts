import { NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/auth'
import { getVisibleChangelogEntries } from '@/lib/changelog'

export async function GET() {
  const admin = await getAdminUser()
  const entries = await getVisibleChangelogEntries(admin)
  return NextResponse.json({ entries })
}
