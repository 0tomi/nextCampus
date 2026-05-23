function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return ''
}

export function isInvalidRefreshTokenError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase()
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String(error.code).toLowerCase()
      : ''

  return (
    code === 'refresh_token_not_found' ||
    message.includes('invalid refresh token') ||
    message.includes('refresh token not found')
  )
}

export function isAuthSessionMissingError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase()

  return message.includes('auth session missing')
}

export function isSupabaseAuthCookie(name: string): boolean {
  return (
    name.startsWith('sb-') &&
    (name.includes('auth-token') || name.includes('code-verifier'))
  )
}
