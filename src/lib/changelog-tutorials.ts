import 'server-only'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { z } from 'zod'

export const changelogTutorialStepSchema = z.object({
  image: z.string().trim().startsWith('/'),
  description: z.string().trim().min(1),
})

export const changelogTutorialSchema = z.object({
  steps: z.array(changelogTutorialStepSchema).min(1),
})

export type ChangelogTutorial = z.infer<typeof changelogTutorialSchema>

const safeChangelogIdSchema = z.string().trim().regex(/^[a-zA-Z0-9._-]+$/)

export async function getChangelogTutorial(changelogId: string): Promise<ChangelogTutorial | null> {
  const parsedId = safeChangelogIdSchema.safeParse(changelogId)
  if (!parsedId.success) return null

  const filePath = path.join(process.cwd(), 'src/content/changelog-tutorials', `${parsedId.data}.json`)

  try {
    const raw = await readFile(filePath, 'utf8')
    const parsed = changelogTutorialSchema.safeParse(JSON.parse(raw) as unknown)
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}
