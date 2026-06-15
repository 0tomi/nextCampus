export type ChangelogAudienceView = 'PUBLIC' | 'AYUDANTE' | 'SUPERVISOR' | 'ADMIN'

export interface ChangelogEntryView {
  id: string
  changelogId: string
  title: string
  summary: string
  description: string
  audience: ChangelogAudienceView
  visibleAt: string
  createdAt: string
  updatedAt: string
  readAt: string | null
  unread: boolean
}
