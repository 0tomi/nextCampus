import { describe, expect, it } from 'vitest'

import { isAuthSessionMissingError, isInvalidRefreshTokenError } from './auth-errors'

describe('supabase auth error helpers', () => {
  it('detecta ausencia de sesión como usuario anónimo', () => {
    expect(isAuthSessionMissingError(new Error('Auth session missing!'))).toBe(true)
    expect(isAuthSessionMissingError('auth session missing')).toBe(true)
  })

  it('mantiene separado el refresh token inválido', () => {
    expect(isInvalidRefreshTokenError(new Error('Invalid Refresh Token: Refresh Token Not Found'))).toBe(
      true,
    )
    expect(isAuthSessionMissingError(new Error('Invalid Refresh Token: Refresh Token Not Found'))).toBe(
      false,
    )
  })
})
