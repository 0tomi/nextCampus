'use client'

import { useState } from 'react'
import Image from 'next/image'
import {
  driveEmbedUrl,
  driveThumbnailUrl,
  extraerDriveFileId,
  extraerYoutubeId,
  inferDrivePreviewMode,
  nombreFallbackRecurso,
  youtubeEmbedUrl,
  type DriveKind,
  type RecursoTipo,
} from '@/lib/recursos'
import { FileText, ImageIcon, PlayCircle } from 'lucide-react'

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
  variant?: 'card' | 'wide'
}

export function ApunteRecursoView({ recurso, variant = 'card' }: ApunteRecursoViewProps) {
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

      <ApunteRecursoMedia recurso={recurso} titulo={titulo} variant={variant} />
    </div>
  )
}

function ApunteRecursoMedia({
  recurso,
  titulo,
  variant,
}: {
  recurso: ApunteRecursoViewProps['recurso']
  titulo: string
  variant: NonNullable<ApunteRecursoViewProps['variant']>
}) {
  if (recurso.tipo === 'YOUTUBE') {
    const id = extraerYoutubeId(recurso.url)
    if (!id) return null
    return (
      <iframe
        src={youtubeEmbedUrl(id)}
        className="aspect-video w-full rounded-md border border-white/10 bg-black/20"
        loading="lazy"
        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        sandbox="allow-scripts allow-presentation allow-popups"
        allowFullScreen
        title={titulo}
      />
    )
  }

  // DRIVE
  const parsed = extraerDriveFileId(recurso.url)
  if (parsed) {
    const previewMode = inferDrivePreviewMode(parsed, titulo)

    if (previewMode === 'thumbnail') {
      return (
        <DriveThumbnailPreview
          href={recurso.url}
          src={driveThumbnailUrl(parsed, variant === 'wide' ? 1600 : 1000)}
          title={titulo}
        />
      )
    }

    if (previewMode === 'fallback') {
      return <DriveFallback href={recurso.url} title={titulo} />
    }

    return (
      <iframe
        src={driveEmbedUrl(parsed)}
        className={`${driveEmbedClassName(parsed.kind)} bg-black/20`}
        loading="lazy"
        allow="autoplay"
        sandbox="allow-scripts allow-forms allow-popups allow-downloads"
        allowFullScreen
        title={titulo}
      />
    )
  }

  // Fallback: URL de Drive no parseable → mensaje sutil (el link ya está en el header).
  return (
    <DriveFallback href={recurso.url} title={titulo} />
  )
}

function DriveThumbnailPreview({
  href,
  src,
  title,
}: {
  href: string
  src: string
  title: string
}) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return <DriveFallback href={href} title={title} />
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="group relative block aspect-video overflow-hidden rounded-md border border-white/10 bg-white/[0.03] cursor-pointer"
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

function DriveFallback({ href, title }: { href: string; title: string }) {
  const isVideo = /\.(mp4|webm|mov|m4v)$/i.test(title)
  const Icon = isVideo ? PlayCircle : FileText

  return (
    <div className="flex flex-col items-start gap-3 rounded-md border border-dashed border-white/10 bg-white/[0.025] p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] text-white/60">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="mt-1 text-xs leading-5 text-white/45">
            Este archivo se ve mejor directamente en Drive.
          </p>
        </div>
      </div>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="inline-flex shrink-0 cursor-pointer items-center rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white"
      >
        Abrir archivo
      </a>
    </div>
  )
}
