import { describe, expect, it } from 'vitest'
import { validateLocalEnvironment, validateDockerBindings } from './cache-regression-guards.mjs'
const project = 'nextcampus-isr-test'
const local = {
  DATABASE_URL: 'postgresql://postgres:local@127.0.0.1:56432/postgres',
  DIRECT_URL: 'postgresql://postgres:local@127.0.0.1:56432/postgres',
  NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:56431',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'local-publishable', SUPABASE_SECRET_KEY: 'local-secret',
  SUPABASE_STORAGE_BUCKET: 'cache-fixture', ADMIN_EMAILS: 'fixture@example.test',
}
describe('isolated cache runner guards', () => {
  it('projects only required local variables, excluding inherited credentials', () => {
    expect(validateLocalEnvironment({ ...local, UPSTASH_REDIS_REST_TOKEN: 'excluded' }, project)).toEqual(local)
  })
  it.each([
    ['DATABASE_URL', 'postgresql://postgres:secret@production.example:56432/postgres'],
    ['DIRECT_URL', 'postgresql://postgres:local@127.0.0.1:5432/postgres'],
    ['DIRECT_URL', 'postgresql://postgres:local@127.0.0.1:56432/postgres?host=production.example'],
    ['NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co'],
    ['NEXT_PUBLIC_SUPABASE_URL', 'http://127.0.0.1:56431@production.example'],
  ])('rejects unsafe %s before any external command', (key, value) => {
    expect(() => validateLocalEnvironment({ ...local, [key]: value }, project)).toThrow()
  })
  it('rejects an unidentified project or incomplete local environment', () => {
    expect(() => validateLocalEnvironment(local, 'production')).toThrow()
    expect(() => validateLocalEnvironment({ ...local, SUPABASE_SECRET_KEY: '' }, project)).toThrow()
  })
  it('requires exact running containers and loopback-only published ports', () => {
    const db = { Name: `/supabase_db_${project}`, State: { Running: true }, NetworkSettings: { Ports: { '5432/tcp': [{ HostIp: '127.0.0.1', HostPort: '56432' }] } } }
    const gateway = { Name: `/supabase_kong_${project}`, State: { Running: true }, NetworkSettings: { Ports: { '8000/tcp': [{ HostIp: '127.0.0.1', HostPort: '56431' }] } } }
    expect(() => validateDockerBindings(db, gateway, project)).not.toThrow()
    const exposed = structuredClone(db)
    exposed.NetworkSettings.Ports['5432/tcp'][0].HostIp = '0.0.0.0'
    expect(() => validateDockerBindings(exposed, gateway, project)).toThrow()
  })
})
