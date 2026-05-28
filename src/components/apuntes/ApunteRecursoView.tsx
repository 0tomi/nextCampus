import {
  driveEmbedUrl,
  extraerDriveFileId,
  extraerYoutubeId,
  nombreFallbackRecurso,
  youtubeEmbedUrl,
  type DriveKind,
  type RecursoTipo,
} from '@/lib/recursos'

function driveEmbedClassName(kind: DriveKind): string {
  const base = 'w-full rounded-md border border-white/10'
  switch (kind) {
    case 'document':
      return `${base} min-h-[600px]`
    case 'spreadsheet':
      return `${base} aspect-video min-h-[420px]`
    case 'presentation':
    case 'file':
      return `${base} aspect-video`
  }
}

interface ApunteRecursoViewProps {
  recurso: {
    id: string
    tipo: RecursoTipo
    url: string
    orden: number
    nombre?: string | null
  }
}

export function ApunteRecursoView({ recurso }: ApunteRecursoViewProps) {
  const titulo = recurso.nombre?.trim()
    ? recurso.nombre
    : nombreFallbackRecurso(recurso.tipo)

  const linkLabel =
    recurso.tipo === 'YOUTUBE' ? 'Abrir en YouTube' : 'Abrir en Drive'

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-white/10 bg-surface-1 p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-white">{titulo}</p>
        <a
          href={recurso.url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="shrink-0 text-xs font-medium text-white/60 transition-colors hover:text-white/90 cursor-pointer"
        >
          {linkLabel}
        </a>
      </div>

      <ApunteRecursoMedia recurso={recurso} titulo={titulo} />
    </div>
  )
}

function ApunteRecursoMedia({
  recurso,
  titulo,
}: {
  recurso: ApunteRecursoViewProps['recurso']
  titulo: string
}) {
  if (recurso.tipo === 'YOUTUBE') {
    const id = extraerYoutubeId(recurso.url)
    if (!id) return null
    return (
      <iframe
        src={youtubeEmbedUrl(id)}
        className="aspect-video w-full rounded-md border border-white/10"
        loading="lazy"
        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title={titulo}
      />
    )
  }

  // DRIVE
  const parsed = extraerDriveFileId(recurso.url)
  if (parsed) {
    return (
      <iframe
        src={driveEmbedUrl(parsed)}
        className={driveEmbedClassName(parsed.kind)}
        loading="lazy"
        allow="autoplay"
        allowFullScreen
        title={titulo}
      />
    )
  }

  // Fallback: URL de Drive no parseable → mensaje sutil (el link ya está en el header).
  return (
    <p className="text-xs text-white/40">
      No se puede previsualizar este recurso.
    </p>
  )
}
