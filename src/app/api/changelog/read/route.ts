import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminUser } from '@/lib/auth'
import { markChangelogEntriesRead } from '@/lib/changelog'

const bodySchema = z.object({
  entryIds: z.array(z.string().trim().min(1)).max(50),
})

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'No pudimos actualizar esas novedades.' }, { status: 400 })
  }

  const admin = await getAdminUser()
  if (admin) {
    await markChangelogEntriesRead(admin.id, parsed.data.entryIds)
  }

  return NextResponse.json({ ok: true })
}
