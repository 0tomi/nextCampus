import { extraerYoutubeId, type RecursoTipo } from '@/lib/recursos'
import { DriveEmbed } from './DriveEmbed'
import { ExternalLinkResource } from './ExternalLinkResource'
import { GithubResourcePreview } from './GithubResourcePreview'
import { HtmlResource } from './HtmlResource'
import { YouTubeEmbed } from './YouTubeEmbed'
import type { RecursoViewVariant } from './types'

export function ApunteRecursoMedia({
  recurso,
  titulo,
  variant,
  apunteHref,
  htmlLoadMode,
}: {
  recurso: {
    id: string
    tipo: RecursoTipo
    url: string
    orden: number
    nombre?: string | null
    storageKey?: string | null
    mimeType?: string | null
    sizeBytes?: number | null
  }
  titulo: string
  variant: RecursoViewVariant
  apunteHref?: string
  htmlLoadMode: 'auto' | 'on-click'
}) {
  if (recurso.tipo === 'REPOSITORY') {
    return <GithubResourcePreview href={recurso.url} title={titulo} variant={variant} />
  }

  if (recurso.tipo === 'OTHER') {
    return <ExternalLinkResource href={recurso.url} title={titulo} variant={variant} />
  }

  if (recurso.tipo === 'HTML') {
    return <HtmlResource recursoId={recurso.id} title={titulo} variant={variant} apunteHref={apunteHref} loadMode={htmlLoadMode} />
  }

  if (recurso.tipo === 'YOUTUBE') {
    const id = extraerYoutubeId(recurso.url)
    if (!id) return null
    return <YouTubeEmbed videoId={id} title={titulo} variant={variant} />
  }

  // DRIVE
  return <DriveEmbed url={recurso.url} title={titulo} variant={variant} />
}
