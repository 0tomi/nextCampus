import { describe, expect, it } from 'vitest'

import {
  isAuthSessionMissingError,
  isInvalidLoginCredentialsError,
  isInvalidRefreshTokenError,
} from './auth-errors'

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

  it('reconoce credenciales inválidas sin confundirlo con otros errores', () => {
    expect(isInvalidLoginCredentialsError(new Error('Invalid login credentials'))).toBe(true)
    expect(isInvalidLoginCredentialsError(new Error('Database temporarily unavailable'))).toBe(
      false,
    )
  })
})
