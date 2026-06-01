'use client'

import { useEffect, useState } from 'react'
import type { RelatedApunteLink } from '@/components/events/RelatedApunteLinks'

export function useApunteSearch({
  query,
  subjectId,
}: {
  query: string
  subjectId: string
}) {
  const [results, setResults] = useState<RelatedApunteLink[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    if (!subjectId) {
      const handle = window.setTimeout(() => setResults([]), 0)
      return () => window.clearTimeout(handle)
    }

    const controller = new AbortController()
    const handle = window.setTimeout(async () => {
      setSearching(true)
      try {
        const params = new URLSearchParams({ subjectId })
        if (query.trim()) params.set('q', query.trim())
        const response = await fetch(`/api/admin/apuntes/search?${params.toString()}`, {
          signal: controller.signal,
        })
        if (!response.ok) {
          setResults([])
          return
        }
        const data = (await response.json()) as { items?: RelatedApunteLink[] }
        setResults(data.items ?? [])
      } catch (error) {
        if ((error as Error).name !== 'AbortError') setResults([])
      } finally {
        setSearching(false)
      }
    }, 180)

    return () => {
      controller.abort()
      window.clearTimeout(handle)
    }
  }, [query, subjectId])

  return { results, searching }
}
