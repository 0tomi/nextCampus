'use client'

import { ApuntesFeed, type ApunteFeedItem, type CategoriaItem } from '@/components/apuntes/ApuntesFeed'

export function ApuntesTab({
  apuntes,
  categorias,
  yearId,
  yearSlug,
  subjectId,
  subjectSlug,
  initialHasMore,
  initialNextCursor,
  focusApunteSlug,
}: {
  apuntes: ApunteFeedItem[]
  categorias: CategoriaItem[]
  yearId: string
  yearSlug: string
  subjectId: string
  subjectSlug: string
  initialHasMore: boolean
  initialNextCursor: string | null
  focusApunteSlug?: string
}) {
  return (
    <ApuntesFeed
      variant="mobile"
      subjectId={subjectId}
      subjectSlug={subjectSlug}
      yearId={yearId}
      yearSlug={yearSlug}
      categorias={categorias}
      initialItems={apuntes}
      initialHasMore={initialHasMore}
      initialNextCursor={initialNextCursor}
      focusApunteSlug={focusApunteSlug}
    />
  )
}
