import { extraerYoutubeId, youtubeEmbedUrl, type RecursoTipo } from '@/lib/recursos'

interface ApunteRecursoViewProps {
  recurso: {
    id: string
    tipo: RecursoTipo
    url: string
    orden: number
  }
}

export function ApunteRecursoView({ recurso }: ApunteRecursoViewProps) {
  if (recurso.tipo === 'YOUTUBE') {
    const id = extraerYoutubeId(recurso.url)
    // Fallback silencioso si la URL es inválida (no debería ocurrir tras la sanitización)
    if (!id) return null
    return (
      <iframe
        src={youtubeEmbedUrl(id)}
        className="aspect-video w-full rounded-md border border-white/10"
        loading="lazy"
        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title="Video del apunte"
      />
    )
  }

  // DRIVE
  return (
    <a
      href={recurso.url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="inline-flex items-center gap-2 rounded border border-white/10 bg-surface-1 px-4 py-2 text-sm font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/resources/google_drive_logo_icon_159334.png"
        alt="Google Drive"
        className="h-5 w-5"
      />
      Abrir en Drive
    </a>
  )
}
