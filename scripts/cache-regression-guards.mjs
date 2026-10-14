/** Fail closed before opening a database or contacting Auth/Storage. */
export const LOCAL_PROJECT_PREFIX = 'nextcampus-isr-'
export const REQUIRED_ENV = [
  'DATABASE_URL', 'DIRECT_URL', 'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SECRET_KEY',
  'SUPABASE_STORAGE_BUCKET', 'ADMIN_EMAILS',
]
export function validateLocalEnvironment(input, project) {
  if (!/^nextcampus-isr-[a-z0-9]+$/.test(project)) throw new Error('Disposable project ID required')
  for (const key of REQUIRED_ENV) {
    if (typeof input[key] !== 'string' || !input[key]) throw new Error(`Missing local ${key}`)
  }
  for (const key of ['DATABASE_URL', 'DIRECT_URL']) {
    const url = new URL(input[key])
    if (!['postgres:', 'postgresql:'].includes(url.protocol) || url.hostname !== '127.0.0.1' || url.port !== '56432' || url.pathname !== '/postgres' || url.search) {
      throw new Error('Database must be the guarded loopback fixture on port 56432')
    }
  }
  const api = new URL(input.NEXT_PUBLIC_SUPABASE_URL)
  if (api.origin !== 'http://127.0.0.1:56431' || api.pathname !== '/' || api.search || api.username || api.password) {
    throw new Error('Auth/Storage must be the guarded loopback fixture on port 56431')
  }
  // Never trust inherited Upstash, Vercel, Supabase, database or dotenv variables.
  return Object.fromEntries(REQUIRED_ENV.map((key) => [key, input[key]]))
}
export function validateDockerBindings(db, gateway, project) {
  for (const [container, internal, external, name] of [
    [db, '5432/tcp', '56432', `supabase_db_${project}`],
    [gateway, '8000/tcp', '56431', `supabase_kong_${project}`],
  ]) {
    const bindings = container.NetworkSettings?.Ports?.[internal]
    if (container.Name !== `/${name}` || !container.State?.Running || bindings?.length !== 1 || bindings[0].HostIp !== '127.0.0.1' || bindings[0].HostPort !== external) {
      throw new Error('Disposable Docker identity/loopback binding verification failed')
    }
  }
}
