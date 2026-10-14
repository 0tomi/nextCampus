import { cp, mkdir, mkdtemp, readFile, writeFile, chmod, symlink, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { createHash } from 'node:crypto'
import { join, resolve, basename } from 'node:path'
import { spawn, execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { validateLocalEnvironment, validateDockerBindings } from './cache-regression-guards.mjs'

const repo = resolve(fileURLToPath(new URL('..', import.meta.url)))
const [envFile, project, resumeFlag, resumePath] = process.argv.slice(2)
if (!envFile || !project) throw new Error('Usage: pnpm test:cache /private/local-env.json nextcampus-isr-<id>')
if ((await stat(envFile)).mode & 0o077) throw new Error('Local env file must have mode 0600')
const local = validateLocalEnvironment(JSON.parse(await readFile(envFile, 'utf8')), project)
const [db, gateway] = JSON.parse(execFileSync('docker', ['inspect', `supabase_db_${project}`, `supabase_kong_${project}`], { encoding: 'utf8' }))
validateDockerBindings(db, gateway, project)
const authSettings = await fetch(`${local.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
  headers: { apikey: local.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY },
})
if (!authSettings.ok || !(await authSettings.json()).external?.email) {
  throw new Error('Enable email/password login on the disposable local Auth provider before running fixtures')
}
if (resumeFlag && (resumeFlag !== '--resume' || !resumePath)) throw new Error('Use --resume <private-workspace> only for the same fixture')
const workspace = resumePath ? resolve(resumePath) : await mkdtemp(join(tmpdir(), 'nextcampus-cache-proof-'))
if (resumePath && (!workspace.startsWith(join(tmpdir(), 'nextcampus-cache-proof-')) || (await stat(workspace)).mode & 0o077)) throw new Error('Unsafe resume workspace')
await chmod(workspace, 0o700)
const identity = createHash('sha256').update(JSON.stringify({ local, project })).digest('hex')
const marker = join(workspace, 'fixture-identity.private.txt')
if (resumePath) {
  if (await readFile(marker, 'utf8') !== identity) throw new Error('Resume fixture identity mismatch')
} else await writeFile(marker, identity, { mode: 0o600 })
const childEnv = { PATH: process.env.PATH, HOME: join(workspace, 'home'), LANG: 'C.UTF-8', ...local,
  CACHE_REGRESSION_ISOLATED: '1', CACHE_REGRESSION_PROJECT: project,
  CACHE_FIXTURE_PATH: join(workspace, 'fixture.private.json'), CACHE_COUNTER_FILE: join(workspace, 'counter.private.jsonl'),
  NEXT_TELEMETRY_DISABLED: '1', CI: '1', PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH ?? join(process.env.HOME ?? '', '.cache/ms-playwright'),
}
await mkdir(childEnv.HOME, { recursive: true })
const logPath = join(workspace, 'execution.private.log')
async function run(args) {
  const child = spawn('pnpm', ['--config.verify-deps-before-run=false', ...args], { cwd: workspace, env: childEnv, stdio: ['ignore', 'pipe', 'pipe'] })
  const output = []
  for (const stream of [child.stdout, child.stderr]) stream.on('data', (chunk) => output.push(chunk))
  const code = await new Promise((resolve, reject) => { child.on('error', reject); child.on('close', resolve) })
  await writeFile(logPath, Buffer.concat(output), { flag: 'a', mode: 0o600 })
  if (code !== 0) throw new Error(`Isolated ${args.join(' ')} failed; private logs: ${logPath}`)
}
try {
  // Explicit allowlist; dotenv files, Git metadata, editor state and existing .next are never copied.
  for (const path of ['src', 'public', 'prisma', 'tests', 'scripts', 'package.json', 'pnpm-lock.yaml', 'tsconfig.json', 'next.config.ts', 'postcss.config.mjs', 'eslint.config.mjs', 'prisma.config.ts', 'vitest.config.ts', 'playwright.cache.config.ts']) {
    await cp(join(repo, path), join(workspace, path), { recursive: true, filter: (path) => !basename(path).startsWith('.env') && basename(path) !== 'node_modules' })
  }
  if (!resumePath) await symlink(join(repo, 'node_modules'), join(workspace, 'node_modules'), 'dir')
  await run(['exec', 'prisma', 'migrate', 'deploy'])
  if (!resumePath) await run(['exec', 'tsx', 'tests/fixtures/cache-regression.ts'])
  const fixture = JSON.parse(await readFile(childEnv.CACHE_FIXTURE_PATH, 'utf8'))
  childEnv.SUPABASE_STORAGE_BUCKET = fixture.bucket
  childEnv.ADMIN_EMAILS = fixture.email
  // Private-only cache-miss instrumentation. No hooks or test routes are added to repository src.
  const queriesPath = join(workspace, 'src/lib/queries.ts')
  let source = await readFile(queriesPath, 'utf8')
  source = "import { appendFileSync } from 'node:fs'\nfunction recordCacheRead(name: string, args: string[]) { appendFileSync(process.env.CACHE_COUNTER_FILE!, JSON.stringify({ name, args }) + '\\n') }\n" + source
  const counted = ['getYearBySlug', 'getSubjectPageBySlug', 'getApuntePageBySlug', 'getSubjectQuizMeta', 'getHomeCalendarEvents', 'getLatestApuntes', 'getLatestApuntesByYear']
  for (const name of counted) {
    const pattern = new RegExp(`(export async function ${name}\\([^]*?cacheLife\\([^]*?\\)\\n)`)
    const args = name === 'getApuntePageBySlug' ? '[subjectSlug, apunteSlug]' : ['getYearBySlug', 'getSubjectPageBySlug', 'getSubjectQuizMeta'].includes(name) ? '[slug]' : name === 'getLatestApuntesByYear' ? '[yearSlug]' : '[]'
    if (!pattern.test(source)) throw new Error(`Instrumentation could not bind ${name}`)
    source = source.replace(pattern, `$1  recordCacheRead('${name}', ${args})\n`)
  }
  await writeFile(queriesPath, source)
  const probeDir = join(workspace, 'src/app/cache-regression-probe')
  await mkdir(probeDir, { recursive: true })
  await cp(join(repo, 'tests/fixtures/cache-probe.tsx.template'), join(probeDir, 'page.tsx'))
  await run(['exec', 'next', 'build', '--webpack'])
  console.log('Isolated production build passed; running cache/privacy regression')
  await run(['exec', 'playwright', 'test', '--config', 'playwright.cache.config.ts'])
  // Logs remain private until cleanup. Print only the bounded test result summary.
  const logs = await readFile(logPath, 'utf8')
  console.log(logs.split('\n').filter((line) => /\d+ passed|\d+ failed/.test(line)).join('\n'))
  console.log('Production cache/privacy proof passed; cleaning owned fixture resources')
  await run(['exec', 'tsx', 'tests/fixtures/cache-regression.ts', '--cleanup'])
  await rm(workspace, { recursive: true, force: true })
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Isolated cache proof failed')
  console.error(`Private workspace retained for diagnosis: ${workspace}`)
  process.exitCode = 1
}
