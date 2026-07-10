import { YouTubeFacade } from '@/components/media/YouTubeFacade'
import type { RecursoViewVariant } from './types'

export function YouTubeEmbed({
  videoId,
  title,
  variant,
}: {
  videoId: string
  title: string
  variant: RecursoViewVariant
}) {
  return (
    <YouTubeFacade
      videoId={videoId}
      title={title}
      className={variant === 'content-card'
        ? 'size-full rounded-md border border-white/10 bg-black/20'
        : 'aspect-video w-full rounded-md border border-white/10 bg-black/20'}
    />
  )
}
