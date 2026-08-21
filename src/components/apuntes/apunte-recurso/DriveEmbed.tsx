import { useState } from 'react'
import Image from 'next/image'
import {
  driveEmbedUrl,
  driveThumbnailUrl,
  extraerDriveFileId,
  inferDrivePreviewMode,
  type DriveKind,
} from '@/lib/recursos'
import { ExternalLink, FileText, ImageIcon, PlayCircle } from 'lucide-react'
import { driveFrameClasses, variantCardClasses } from './variantStyles'
import type { RecursoViewVariant } from './types'

function driveEmbedClassName(kind: DriveKind, variant: RecursoViewVariant): string {
  const { rounded, border } = driveFrameClasses(variant)
  const base = `w-full ${rounded} ${border}`

  if (variant === 'content-card') {
    return `${base} h-full min-h-0`
  }

  switch (kind) {
    case 'document':
      return `${base} ${variant === 'wide' ? 'h-[70vh] min-h-[500px] sm:min-h-[750px]' : 'h-[28vh] min-h-[200px] sm:min-h-[300px]'}`
    case 'spreadsheet':
      return `${base} aspect-video ${variant === 'wide' ? 'h-[55vh] min-h-[400px] sm:min-h-[600px]' : 'h-[22vh] min-h-[180px] sm:min-h-[260px]'}`
    case 'presentation':
    case 'file':
      return `${base} ${variant === 'wide' ? 'h-[65vh] min-h-[450px] sm:min-h-[650px]' : 'h-[25vh] min-h-[180px] sm:min-h-[260px]'}`
  }
}

export function DriveEmbed({
  url,
  title,
  variant,
}: {
  url: string
  title: string
  variant: RecursoViewVariant
}) {
  const parsed = extraerDriveFileId(url)

  if (!parsed) {
    // Fallback: URL de Drive no parseable → mensaje sutil (el link ya está en el header).
    return <DriveFallback href={url} title={title} variant={variant} />
  }

  const previewMode = inferDrivePreviewMode(parsed, title)

  // En tarjetas y feeds ('card' | 'content-card'), evitamos montar iframes pesados de Google Docs
  // para preservar los 60 FPS y no saturar el compositor del navegador.
  // El iframe interactivo completo se reserva para la vista de detalle ('wide').
  if (variant !== 'wide' || previewMode === 'thumbnail') {
    if (previewMode === 'fallback') {
      return <DriveFallback href={url} title={title} variant={variant} />
    }

    return (
      <DriveThumbnailPreview
        href={url}
        src={driveThumbnailUrl(parsed, variant === 'wide' ? 1600 : 1000)}
        title={title}
        variant={variant}
      />
    )
  }

  if (previewMode === 'fallback') {
    return <DriveFallback href={url} title={title} variant={variant} />
  }

  return (
    <iframe
      src={driveEmbedUrl(parsed)}
      className={`${driveEmbedClassName(parsed.kind, variant)} bg-black/20`}
      loading="lazy"
      allow="autoplay"
      sandbox="allow-scripts allow-forms allow-popups allow-downloads"
      allowFullScreen
      title={title}
    />
  )
}

function DriveThumbnailPreview({
  href,
  src,
  title,
  variant,
}: {
  href: string
  src: string
  title: string
  variant: RecursoViewVariant
}) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return <DriveFallback href={href} title={title} variant={variant} />
  }

  const { rounded, border } = driveFrameClasses(variant)

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className={`group relative block overflow-hidden ${rounded} border ${border} bg-white/[0.03] cursor-pointer ${variant === 'content-card' ? 'size-full' : 'aspect-video'}`}
    >
      <Image
        src={src}
        alt={`Vista previa de ${title}`}
        fill
        sizes="(min-width: 1024px) 768px, 100vw"
        className="object-contain transition-transform duration-300 group-hover:scale-[1.02]"
        onError={() => setFailed(true)}
        referrerPolicy="no-referrer"
        unoptimized
      />
      <span className="absolute bottom-3 left-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/60 px-3 py-1 text-xs font-semibold text-white/80 backdrop-blur">
        <ImageIcon className="size-3.5" />
        Abrir archivo
      </span>
    </a>
  )
}

function DriveFallback({
  href,
  title,
  variant = 'card',
}: {
  href: string
  title: string
  variant?: RecursoViewVariant
}) {
  const isVideo = /\.(mp4|webm|mov|m4v)$/i.test(title)
  const Icon = isVideo ? PlayCircle : FileText
  const { fillHeight, showTitle } = variantCardClasses(variant)

  return (
    <div className={`flex flex-col items-start gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-5 sm:flex-row sm:items-center sm:justify-between ${fillHeight}`}>
      <div className="flex min-w-0 items-center gap-3.5">
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg border border-white/5 bg-white/[0.04] text-white/70 shadow-sm">
          <Icon className="size-5.5" />
        </span>
        <div className="min-w-0">
          {showTitle && (
            <p className="text-sm font-bold text-white tracking-tight">{title}</p>
          )}
          <p className="text-xs leading-relaxed text-white/45">
            Este archivo no tiene vista previa disponible y se ve mejor directamente en Google Drive.
          </p>
        </div>
      </div>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white"
      >
        Abrir en Drive
        <ExternalLink className="size-3" />
      </a>
    </div>
  )
}
