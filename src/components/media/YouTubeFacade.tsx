'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Play } from 'lucide-react'
import { youtubeEmbedUrl } from '@/lib/recursos'

interface YouTubeFacadeProps {
  videoId: string
  title?: string
  className?: string
}

/**
 * Reemplaza el iframe de YouTube por una miniatura estática hasta el click
 * del usuario: evita cargar los scripts de YouTube en cada carga de página.
 */
export function YouTubeFacade({ videoId, title, className }: YouTubeFacadeProps) {
  const [loaded, setLoaded] = useState(false)

  if (loaded) {
    return (
      <iframe
        src={`${youtubeEmbedUrl(videoId)}?autoplay=1`}
        className={className}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        sandbox="allow-scripts allow-presentation allow-popups allow-same-origin"
        allowFullScreen
        title={title}
      />
    )
  }

  return (
    <button
      type="button"
      onClick={() => setLoaded(true)}
      aria-label={`Reproducir video: ${title ?? 'YouTube'}`}
      className={`group relative block w-full cursor-pointer overflow-hidden bg-black/20 ${className ?? ''}`}
    >
      <Image
        src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
        alt={title ?? 'Video'}
        fill
        sizes="(max-width: 768px) 100vw, 50vw"
        className="object-cover"
      />
      <span className="absolute inset-0 flex items-center justify-center bg-black/25 transition-colors duration-200 group-hover:bg-black/40">
        <span className="flex size-14 items-center justify-center rounded-full bg-red-600/90 text-white shadow-lg transition-transform duration-200 group-hover:scale-110">
          <Play className="size-6 translate-x-0.5" fill="currentColor" />
        </span>
      </span>
    </button>
  )
}
