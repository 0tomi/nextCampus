import { randomUUID } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { createClient } from '@supabase/supabase-js'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../../prisma/generated/client/client'
import { validateLocalEnvironment } from '../../scripts/cache-regression-guards.mjs'

export async function seedCacheRegression() {
  validateLocalEnvironment(process.env, process.env.CACHE_REGRESSION_PROJECT ?? '')
  if (process.env.CACHE_REGRESSION_ISOLATED !== '1') throw new Error('Isolated runner required')
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) })
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false, autoRefreshToken: false } })
  try {
    // Never erase existing academic data, even on a loopback database.
    if (await prisma.career.count() || await prisma.userAccount.count()) throw new Error('Fixture database must be empty (apart from migration catalogs)')
    const email = 'cache-fixture@example.test'
    const password = `Cache-${randomUUID()}-Aa1!`
    const created = await supabase.auth.admin.createUser({ email, password, email_confirm: true })
    if (created.error || !created.data.user) throw new Error('Local fixture Auth user could not be created')
    const user = await prisma.userAccount.create({ data: { id: 'cache-user', authUserId: created.data.user.id, email, nombreUsuario: 'Fixture Author', role: 'ADMIN' } })
    await prisma.career.create({ data: { id: 'cache-career', slug: 'cache-fixture', nombre: 'Fixture Campus' } })
    const years = ['primero', 'segundo']
    for (const [index, slug] of years.entries()) await prisma.academicYear.create({ data: { id: `cache-${slug}`, careerId: 'cache-career', slug, nombre: `Fixture ${slug}`, orden: index + 1 } })
    const subjects = ['noisy', 'quiet', 'other']
    const category = await prisma.categoria.findFirstOrThrow({ orderBy: { id: 'asc' } })
    await prisma.tipoEvento.upsert({ where: { slug: 'cache-exam' }, create: { id: 'cache-type', slug: 'cache-exam', nombre: 'Fixture Exam' }, update: {} })
    for (const [index, slug] of subjects.entries()) {
      const subjectId = `cache-${slug}`
      await prisma.subject.create({ data: { id: subjectId, yearId: `cache-${index === 2 ? 'segundo' : 'primero'}`, slug, nombre: `Fixture ${slug}` } })
      await prisma.agenda.create({ data: { id: `agenda-${slug}`, subjectId } })
      await prisma.commission.create({ data: { id: `commission-${slug}`, subjectId, slug: 'a', nombre: 'Commission A', agenda: { create: { id: `commission-agenda-${slug}`, subjectId } } } })
      for (let n = 0; n < (index === 0 ? 20 : 2); n++) {
        await prisma.apunte.create({ data: {
          id: `${slug}-${String(n).padStart(2, '0')}`, subjectId, slug: `note-${n}`, titulo: `Fixture ${slug} note ${n}`,
          createdByUserId: user.id, createdAt: new Date('2026-10-01T00:00:00Z'), updatedAt: new Date(`2026-10-${String(10 + n % 4).padStart(2, '0')}T00:00:00Z`),
          categorias: { create: { categoriaId: category.id } },
        } })
      }
      for (const [n, fecha] of ['2026-01-01', '2099-01-01'].entries()) await prisma.evento.create({ data: {
        id: `event-${slug}-${n}`, agendaId: n === 0 ? `agenda-${slug}` : `commission-agenda-${slug}`, tipoEventoId: 'cache-type', titulo: n === 0 ? 'Historical fixture event' : `Future fixture ${slug}`, fecha: new Date(fecha), createdByUserId: user.id,
        ...(slug === 'noisy' && n === 1 ? { apuntes: { create: { apunteId: 'noisy-00' } } } : {}),
      } })
    }
    const bucket = `cache-fixture-${randomUUID()}`
    const madeBucket = await supabase.storage.createBucket(bucket, { public: false })
    if (madeBucket.error) throw new Error('Could not create private local Storage fixture')
    const htmlKey = 'apuntes/primero/noisy/noisy-00/fixture.html'
    const html = '<!doctype html><html><body>Private fixture HTML</body></html>'
    const bankId = randomUUID()
    const objects = [
      [htmlKey, html, 'text/html'],
      [`quizzes/primero/noisy/${bankId}.json`, JSON.stringify({ title: 'Fixture Bank', units: [{ name: 'Unit', questions: [{ type: 'single', question: 'Fixture?', options: ['A', 'B'], answer: 0, explanation: 'PRIVATE_ANSWER_SENTINEL' }] }] }), 'application/json'],
      [`quizzes/primero/noisy/${bankId}.meta.json`, JSON.stringify({ id: bankId, nombre: 'Fixture Bank', totalPreguntas: 1, subidoEl: new Date().toISOString(), subidoPor: 'Fixture Author', subidoPorId: user.id }), 'application/json'],
    ]
    for (const [key, content, contentType] of objects) {
      const uploaded = await supabase.storage.from(bucket).upload(key, content, { contentType })
      if (uploaded.error) throw new Error('Could not upload local fixture object')
    }
    await prisma.apunteRecurso.create({ data: { apunteId: 'noisy-00', tipo: 'HTML', orden: 0, storageKey: htmlKey, mimeType: 'text/html', sizeBytes: Buffer.byteLength(html) } })
    const state = { email, password, bucket, categoryId: category.id, bankId, htmlKey }
    await writeFile(process.env.CACHE_FIXTURE_PATH!, JSON.stringify(state), { mode: 0o600 })
    console.log('Disposable academic, Auth and private Storage fixtures created (24 notes, 6 events)')
  } finally { await prisma.$disconnect() }
}
export async function cleanupCacheRegression() {
  validateLocalEnvironment(process.env, process.env.CACHE_REGRESSION_PROJECT ?? '')
  if (process.env.CACHE_REGRESSION_ISOLATED !== '1') throw new Error('Isolated runner required')
  const state = JSON.parse(await readFile(process.env.CACHE_FIXTURE_PATH!, 'utf8')) as {
    email: string; password: string; bucket: string; htmlKey: string; bankId: string
  }
  if (!state.bucket.startsWith('cache-fixture-') || state.email !== 'cache-fixture@example.test') throw new Error('Unknown fixture identity')
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) })
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false, autoRefreshToken: false } })
  const loginClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } })
  try {
    const user = await prisma.userAccount.findUniqueOrThrow({ where: { id: 'cache-user' } })
    const career = await prisma.career.findUniqueOrThrow({ where: { id: 'cache-career' } })
    if (user.email !== state.email || career.slug !== 'cache-fixture') throw new Error('Fixture ownership mismatch')
    // Signing in on the service client would replace its privileged Storage JWT.
    const session = await loginClient.auth.signInWithPassword({ email: state.email, password: state.password })
    if (session.error || !session.data.session) throw new Error('Cannot revoke fixture session')
    const revoked = await supabase.auth.admin.signOut(session.data.session.access_token, 'global')
    if (revoked.error) throw new Error('Cannot revoke fixture session')
    const removed = await supabase.storage.from(state.bucket).remove([
      state.htmlKey, `quizzes/primero/noisy/${state.bankId}.json`, `quizzes/primero/noisy/${state.bankId}.meta.json`,
    ])
    if (removed.error) throw new Error('Cannot remove owned fixture objects')
    const bucket = await supabase.storage.deleteBucket(state.bucket)
    if (bucket.error) throw new Error('Cannot remove owned fixture bucket')
    await prisma.$transaction([
      prisma.auditLog.deleteMany({ where: { userId: user.id } }),
      prisma.career.delete({ where: { id: career.id } }),
      prisma.userAccount.delete({ where: { id: user.id } }),
    ])
    const deleted = await supabase.auth.admin.deleteUser(user.authUserId)
    if (deleted.error) throw new Error('Cannot remove owned fixture Auth user')
    console.log('Owned fixture academic rows, session, Auth user and Storage objects cleaned')
  } finally { await prisma.$disconnect() }
}

export async function resetCacheMutationFixture(kind: 'event' | 'note') {
  validateLocalEnvironment(process.env, process.env.CACHE_REGRESSION_PROJECT ?? '')
  if (process.env.CACHE_REGRESSION_ISOLATED !== '1') throw new Error('Isolated runner required')
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) })
  try {
    // A resumed run may already contain the previous test's target title.
    // Reset only the owned DB row; the real action must invalidate warm readers.
    if (kind === 'event') {
      await prisma.evento.update({ where: { id: 'event-noisy-1' }, data: { titulo: 'Future fixture noisy' } })
    } else {
      await prisma.apunte.update({ where: { id: 'noisy-00' }, data: { titulo: 'Fixture noisy note 0' } })
    }
  } finally { await prisma.$disconnect() }
}
if (process.argv[1]?.endsWith('cache-regression.ts')) {
  const operation = process.argv.includes('--cleanup') ? cleanupCacheRegression
    : process.argv.includes('--reset-event') ? () => resetCacheMutationFixture('event')
      : process.argv.includes('--reset-note') ? () => resetCacheMutationFixture('note')
        : seedCacheRegression
  operation().catch(() => { console.error('Local fixture operation failed; inspect private runner logs'); process.exitCode = 1 })
}
