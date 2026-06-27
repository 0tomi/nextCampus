import { describe, expect, it } from 'vitest'
import { getVisibleChangelogAudiences, isChangelogUnread } from './changelog-rules'

describe('changelog rules', () => {
  it('applies inclusive role visibility', () => {
    expect(getVisibleChangelogAudiences(null)).toEqual(['PUBLIC'])
    expect(getVisibleChangelogAudiences('AYUDANTE')).toEqual(['PUBLIC', 'AYUDANTE'])
    expect(getVisibleChangelogAudiences('SUPERVISOR')).toEqual(['PUBLIC', 'AYUDANTE', 'SUPERVISOR'])
    expect(getVisibleChangelogAudiences('ADMIN')).toEqual(['PUBLIC', 'AYUDANTE', 'SUPERVISOR', 'ADMIN'])
  })

  it('treats updated entries as unread when visibleAt is newer than readAt', () => {
    const readAt = new Date('2026-06-14T12:00:00.000Z')
    expect(isChangelogUnread(null, new Date('2026-06-14T12:00:00.000Z'))).toBe(true)
    expect(isChangelogUnread(readAt, new Date('2026-06-14T12:00:00.000Z'))).toBe(false)
    expect(isChangelogUnread(readAt, new Date('2026-06-14T12:00:01.000Z'))).toBe(true)
  })
})
