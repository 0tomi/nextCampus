import 'server-only'
import type { Prisma } from '../../prisma/generated/client/client'
import { prisma } from '@/lib/prisma'
import type { AdminUser } from '@/lib/auth'
import { getVisibleChangelogAudiences, isChangelogUnread, type ChangelogAudience } from '@/lib/changelog-rules'

export interface ChangelogEntryDTO {
  id: string
  changelogId: string
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

export interface ChangelogPageDTO {
  entries: ChangelogEntryDTO[]
  nextCursor: string | null
}

const changelogEntrySelect = {
  id: true,
  changelogId: true,
  title: true,
  summary: true,
  description: true,
  audience: true,
  visibleAt: true,
  createdAt: true,
  updatedAt: true,
} as const

type RawChangelogEntry = Prisma.ChangelogEntryGetPayload<{ select: typeof changelogEntrySelect }>

const DEFAULT_CHANGELOG_LIMIT = 15
const MAX_CHANGELOG_LIMIT = 50

function clampChangelogLimit(limit: number | undefined): number {
  if (!limit || !Number.isFinite(limit)) return DEFAULT_CHANGELOG_LIMIT
  return Math.min(Math.max(Math.trunc(limit), 1), MAX_CHANGELOG_LIMIT)
}

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

export async function getVisibleChangelogEntriesPage(
  admin: Pick<AdminUser, 'id' | 'role'> | null,
  options: { limit?: number; cursor?: string | null } = {},
): Promise<ChangelogPageDTO> {
  const limit = clampChangelogLimit(options.limit)
  const entries = await prisma.changelogEntry.findMany({
    where: {
      audience: { in: getVisibleChangelogAudiences(admin?.role ?? null) },
    },
    orderBy: [{ visibleAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
    ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    select: changelogEntrySelect,
  })
  const visibleEntries = entries.slice(0, limit)
  const nextCursor = entries.length > limit ? entries[limit]?.id ?? null : null

  if (!admin) {
    return {
      entries: visibleEntries.map((entry) => ({ ...serializeChangelogEntry(entry, entry.visibleAt), unread: false })),
      nextCursor,
    }
  }

  const reads = await prisma.changelogRead.findMany({
    where: {
      userId: admin.id,
      changelogEntryId: { in: visibleEntries.map((entry) => entry.id) },
    },
    select: { changelogEntryId: true, readAt: true },
  })
  const readAtByEntryId = new Map(reads.map((read) => [read.changelogEntryId, read.readAt] as const))

  return {
    entries: visibleEntries.map((entry) => serializeChangelogEntry(entry, readAtByEntryId.get(entry.id) ?? null)),
    nextCursor,
  }
}

export async function getVisibleChangelogEntryByChangelogId(
  admin: Pick<AdminUser, 'id' | 'role'> | null,
  changelogId: string,
): Promise<ChangelogEntryDTO | null> {
  const entry = await prisma.changelogEntry.findFirst({
    where: {
      changelogId,
      audience: { in: getVisibleChangelogAudiences(admin?.role ?? null) },
    },
    select: changelogEntrySelect,
  })
  if (!entry) return null

  if (!admin) {
    return { ...serializeChangelogEntry(entry, entry.visibleAt), unread: false }
  }

  const read = await prisma.changelogRead.findUnique({
    where: { userId_changelogEntryId: { userId: admin.id, changelogEntryId: entry.id } },
    select: { readAt: true },
  })

  return serializeChangelogEntry(entry, read?.readAt ?? null)
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
