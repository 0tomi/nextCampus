import { NextResponse } from 'next/server'
import { getChangelogTutorial } from '@/lib/changelog-tutorials'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ changelogId: string }> },
) {
  const { changelogId } = await params
  const tutorial = await getChangelogTutorial(changelogId)
  if (!tutorial) {
    return NextResponse.json({ error: 'No encontramos un tutorial para esta novedad.' }, { status: 404 })
  }

  return NextResponse.json(tutorial)
}
