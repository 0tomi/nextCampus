import 'server-only'
import type { Prisma } from '../../prisma/generated/client/client'
import { prisma } from '@/lib/prisma'
import type { AdminUser } from '@/lib/auth'
import { getVisibleChangelogAudiences, isChangelogUnread, type ChangelogAudience } from '@/lib/changelog-rules'

export interface ChangelogEntryDTO {
  id: string
  title: string
  summary: string
  description: string
  audience: ChangelogAudience
  visibleAt: string
  createdAt: string
  updatedAt: string
  readAt: string | null
  unread: boolean
}

const changelogEntrySelect = {
  id: true,
  title: true,
  summary: true,
  description: true,
  audience: true,
  visibleAt: true,
  createdAt: true,
  updatedAt: true,
} as const

type RawChangelogEntry = Prisma.ChangelogEntryGetPayload<{ select: typeof changelogEntrySelect }>

function serializeChangelogEntry(entry: RawChangelogEntry, readAt: Date | null): ChangelogEntryDTO {
  return {
    ...entry,
    audience: entry.audience as ChangelogAudience,
    visibleAt: entry.visibleAt.toISOString(),
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
    readAt: readAt?.toISOString() ?? null,
    unread: isChangelogUnread(readAt, entry.visibleAt),
  }
}

export async function getVisibleChangelogEntries(admin: Pick<AdminUser, 'id' | 'role'> | null): Promise<ChangelogEntryDTO[]> {
  const entries = await prisma.changelogEntry.findMany({
    where: {
      audience: { in: getVisibleChangelogAudiences(admin?.role ?? null) },
    },
    orderBy: [{ visibleAt: 'desc' }, { id: 'desc' }],
    take: 50,
    select: changelogEntrySelect,
  })

  if (!admin) {
    return entries.map((entry) => ({ ...serializeChangelogEntry(entry, entry.visibleAt), unread: false }))
  }

  const reads = await prisma.changelogRead.findMany({
    where: {
      userId: admin.id,
      changelogEntryId: { in: entries.map((entry) => entry.id) },
    },
    select: { changelogEntryId: true, readAt: true },
  })
  const readAtByEntryId = new Map(reads.map((read) => [read.changelogEntryId, read.readAt] as const))

  return entries.map((entry) => serializeChangelogEntry(entry, readAtByEntryId.get(entry.id) ?? null))
}

export async function markChangelogEntriesRead(userId: string, entryIds: string[]): Promise<void> {
  const uniqueEntryIds = [...new Set(entryIds.filter(Boolean))]
  if (uniqueEntryIds.length === 0) return

  const now = new Date()
  await prisma.$transaction(
    uniqueEntryIds.map((entryId) =>
      prisma.changelogRead.upsert({
        where: { userId_changelogEntryId: { userId, changelogEntryId: entryId } },
        create: { userId, changelogEntryId: entryId, readAt: now },
        update: { readAt: now },
      }),
    ),
  )
}
