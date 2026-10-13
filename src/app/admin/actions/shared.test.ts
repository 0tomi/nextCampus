import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ updateTag: vi.fn(), revalidatePath: vi.fn() }))
vi.mock('next/cache', () => mocks)
vi.mock('@/lib/auth', () => ({ requireGeneralAdmin: vi.fn(), requireAcademicManager: vi.fn(), requireAnyAdmin: vi.fn() }))
vi.mock('server-only', () => ({}))
vi.mock('@/lib/prisma', () => ({ prisma: {} }))
vi.mock('@/lib/storage', () => ({ quizBanksCacheTag: (y: string, s: string) => `quiz-banks:${y}:${s}` }))
import { revalidateSubjectEvents, revalidateSubjectApuntes, revalidateYearUpdate, revalidateYearRemoval, revalidateSubjectContent, revalidateAuthorNames } from './shared'
const scope = { subjectSlug: 'calculo', yearSlug: 'primero', commissionSlugs: ['a'] }
const tags = () => mocks.updateTag.mock.calls.map(([tag]) => tag).sort()
describe('granular public invalidation', () => {
  beforeEach(() => vi.clearAllMocks())
  it('events invalidate only event projections, not note details, identities or recent lists', () => {
    revalidateSubjectEvents(scope)
    expect(tags()).toEqual(['subject-content:calculo', 'upcoming-events', 'year:primero'])
  })
  it('note edits invalidate exact old/new details and recent lists without event projections', () => {
    revalidateSubjectApuntes({ ...scope, apunteSlugs: ['old', 'new', 'old'], affectsRelatedEvents: false })
    expect(tags()).toEqual(['apunte:calculo:new', 'apunte:calculo:old', 'latest-apuntes', 'latest-apuntes-year:primero', 'subject-content:calculo'])
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/primero/calculo/apuntes/old')
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/primero/calculo/apuntes/new')
  })
  it('linked title changes also invalidate year/global events', () => {
    revalidateSubjectApuntes({ ...scope, apunteSlugs: ['old'], affectsRelatedEvents: true })
    expect(tags()).toEqual(['apunte:calculo:old', 'latest-apuntes', 'latest-apuntes-year:primero', 'subject-content:calculo', 'upcoming-events', 'year:primero'])
  })
})


describe('structural and author invalidation', () => {
  beforeEach(() => vi.clearAllMocks())
  it('new years invalidate negative-cache identities and exact routes', () => {
    revalidateYearUpdate('primero', 'primero')
    expect(tags()).toEqual(['career', 'latest-apuntes-year:primero', 'year-meta:primero', 'year:primero'])
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/primero')
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/primero/calendario')
  })
  it('renamed years invalidate both identity and recent-list keys', () => {
    revalidateYearUpdate('primero', 'nuevo')
    expect(tags()).toEqual(['career', 'latest-apuntes-year:nuevo', 'latest-apuntes-year:primero', 'year-meta:nuevo', 'year-meta:primero', 'year:nuevo', 'year:primero'])
  })
  it('removed years expire nested note/quiz identity dependencies', () => {
    revalidateYearRemoval('primero', ['calculo', 'calculo'])
    expect(tags()).toEqual(['career', 'latest-apuntes-year:primero', 'quiz-banks:primero:calculo', 'subject:calculo', 'year-meta:primero', 'year:primero'])
  })
  it('new subjects invalidate missing identity projections and their public route', () => {
    revalidateSubjectContent(scope)
    expect(tags()).toEqual(['latest-apuntes-year:primero', 'subject-content:calculo', 'subject:calculo', 'year:primero'])
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/primero/calculo')
  })
  it('author edits deduplicate subjects/years without other public projections', () => {
    revalidateAuthorNames({ subjectSlugs: ['calculo', 'calculo', 'fisica'], eventYearSlugs: ['primero', 'primero'] })
    expect(tags()).toEqual(['subject-authors:calculo', 'subject-authors:fisica', 'year:primero'])
    expect(mocks.revalidatePath).not.toHaveBeenCalled()
  })
})
