import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  requireAuthMock,
  createSupabaseServerClientMock,
  signOutMock,
  revalidatePathMock,
  revalidateTagMock,
  updateTagMock,
} = vi.hoisted(() => ({
  requireAuthMock: vi.fn(),
  createSupabaseServerClientMock: vi.fn(),
  signOutMock: vi.fn(),
  revalidatePathMock: vi.fn(),
  revalidateTagMock: vi.fn(),
  updateTagMock: vi.fn(),
}))

vi.mock('./shared', () => ({ requireAuth: requireAuthMock }))
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: createSupabaseServerClientMock,
}))
vi.mock('next/cache', () => ({
  revalidatePath: revalidatePathMock,
  revalidateTag: revalidateTagMock,
  updateTag: updateTagMock,
}))

import { signOutAction } from './session'

function expectSharedCacheUntouched() {
  expect(revalidatePathMock).not.toHaveBeenCalled()
  expect(revalidateTagMock).not.toHaveBeenCalled()
  expect(updateTagMock).not.toHaveBeenCalled()
}

describe('signOutAction', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    requireAuthMock.mockResolvedValue({ id: 'user-1' })
    createSupabaseServerClientMock.mockResolvedValue({
      auth: { signOut: signOutMock },
    })
    signOutMock.mockResolvedValue({ error: null })
  })

  it('signs out the authenticated user without invalidating shared content', async () => {
    await expect(signOutAction()).resolves.toBeUndefined()

    expect(requireAuthMock).toHaveBeenCalledOnce()
    expect(createSupabaseServerClientMock).toHaveBeenCalledOnce()
    expect(signOutMock).toHaveBeenCalledExactlyOnceWith()
    expect(requireAuthMock.mock.invocationCallOrder[0]).toBeLessThan(
      createSupabaseServerClientMock.mock.invocationCallOrder[0],
    )
    expectSharedCacheUntouched()
  })

  it('does not sign out or invalidate caches when authentication fails', async () => {
    const authError = new Error('AUTH_REDIRECT')
    requireAuthMock.mockRejectedValue(authError)

    await expect(signOutAction()).rejects.toBe(authError)

    expect(createSupabaseServerClientMock).not.toHaveBeenCalled()
    expect(signOutMock).not.toHaveBeenCalled()
    expectSharedCacheUntouched()
  })

  it('preserves thrown sign-out failures without invalidating shared content', async () => {
    const signOutError = new Error('Sign-out failed')
    signOutMock.mockRejectedValue(signOutError)

    await expect(signOutAction()).rejects.toBe(signOutError)

    expect(signOutMock).toHaveBeenCalledOnce()
    expectSharedCacheUntouched()
  })
})
