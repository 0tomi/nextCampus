import type { ApunteSearchItem } from '@/lib/domain/apunte-search'

export type SearchGroup = {
  key: string
  yearName: string
  subjectName: string
  items: ApunteSearchItem[]
}

export function groupApunteSearchItems(items: readonly ApunteSearchItem[]): SearchGroup[] {
  const groups = new Map<string, SearchGroup>()

  for (const item of items) {
    const key = `${item.year.slug}:${item.subject.slug}`
    const current = groups.get(key)
    if (current) {
      current.items.push(item)
      continue
    }

    groups.set(key, {
      key,
      yearName: item.year.name,
      subjectName: item.subject.name,
      items: [item],
    })
  }

  return [...groups.values()]
}
