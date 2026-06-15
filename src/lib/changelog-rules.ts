type ChangelogUserRole = 'ADMIN' | 'SUPERVISOR' | 'AYUDANTE'

export const CHANGELOG_AUDIENCES = {
  PUBLIC: 'PUBLIC',
  AYUDANTE: 'AYUDANTE',
  SUPERVISOR: 'SUPERVISOR',
  ADMIN: 'ADMIN',
} as const

export type ChangelogAudience = (typeof CHANGELOG_AUDIENCES)[keyof typeof CHANGELOG_AUDIENCES]

export function getVisibleChangelogAudiences(role: ChangelogUserRole | null | undefined): ChangelogAudience[] {
  if (role === 'ADMIN') {
    return [
      CHANGELOG_AUDIENCES.PUBLIC,
      CHANGELOG_AUDIENCES.AYUDANTE,
      CHANGELOG_AUDIENCES.SUPERVISOR,
      CHANGELOG_AUDIENCES.ADMIN,
    ]
  }
  if (role === 'SUPERVISOR') {
    return [CHANGELOG_AUDIENCES.PUBLIC, CHANGELOG_AUDIENCES.AYUDANTE, CHANGELOG_AUDIENCES.SUPERVISOR]
  }
  if (role === 'AYUDANTE') {
    return [CHANGELOG_AUDIENCES.PUBLIC, CHANGELOG_AUDIENCES.AYUDANTE]
  }
  return [CHANGELOG_AUDIENCES.PUBLIC]
}

export function isChangelogUnread(readAt: Date | null | undefined, visibleAt: Date): boolean {
  return !readAt || readAt.getTime() < visibleAt.getTime()
}
