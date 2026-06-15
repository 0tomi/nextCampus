import { NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/auth'
import { getVisibleChangelogEntriesPage } from '@/lib/changelog'

export async function GET(request: Request) {
  const admin = await getAdminUser()
  const url = new URL(request.url)
  const limit = Number(url.searchParams.get('limit') ?? undefined)
  const cursor = url.searchParams.get('cursor')
  const page = await getVisibleChangelogEntriesPage(admin, { limit, cursor })
  return NextResponse.json(page)
}
