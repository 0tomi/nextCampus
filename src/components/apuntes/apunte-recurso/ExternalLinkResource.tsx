import { Suspense, use } from 'react'
import Image from 'next/image'
import { ExternalLink, Globe } from 'lucide-react'
import { variantCardClasses } from './variantStyles'
import type { RecursoViewVariant } from './types'

type LinkPreviewData = { title: string; description: string; image?: string; logo?: string }

// Caché de promesas a nivel de módulo: estabiliza la promesa entre renders (lo
// que `use()` necesita) y deduplica el pedido de metadatos por URL.
const linkPreviewCache = new Map<string, Promise<LinkPreviewData | null>>()

function loadLinkPreview(href: string): Promise<LinkPreviewData | null> {
  const cached = linkPreviewCache.get(href)
  if (cached) return cached

  const promise = fetch(`/api/link-preview?url=${encodeURIComponent(href)}`)
    .then((res) => {
      if (!res.ok) throw new Error()
      return res.json() as Promise<LinkPreviewData>
    })
    .catch(() => null)

  linkPreviewCache.set(href, promise)
  return promise
}

function LinkPreviewSkeleton({ variant }: { variant: RecursoViewVariant }) {
  const { fillHeight } = variantCardClasses(variant)

  return (
    <div className={`flex animate-pulse flex-col items-start gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-5 sm:flex-row sm:items-center sm:justify-between ${fillHeight}`}>
      <div className="flex w-full items-center gap-3.5">
        <div className="size-11 shrink-0 rounded-lg bg-white/[0.06]" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-1/3 rounded bg-white/[0.06]" />
          <div className="h-3 w-2/3 rounded bg-white/[0.06]" />
        </div>
      </div>
    </div>
  )
}

export function ExternalLinkResource({
  href,
  title,
  variant = 'card',
}: {
  href: string
  title: string
  variant?: RecursoViewVariant
}) {
  return (
    <Suspense fallback={<LinkPreviewSkeleton variant={variant} />}>
      <ExternalLinkResourceContent href={href} title={title} variant={variant} />
    </Suspense>
  )
}

function ExternalLinkResourceContent({
  href,
  title,
  variant,
}: {
  href: string
  title: string
  variant: RecursoViewVariant
}) {
  const data = use(loadLinkPreview(href))

  const previewTitle = data?.title || title || new URL(href).hostname
  const previewDesc = data?.description || 'Enlace a recurso externo.'
  const logoSrc = data?.logo
  const imageSrc = data?.image

  if (variant === 'content-card') {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="group flex h-full cursor-pointer flex-col justify-between overflow-hidden rounded-xl border border-white/5 bg-white/[0.02] p-5 transition-all duration-300 hover:border-white/10 hover:bg-white/[0.04]"
      >
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] text-white/40">
            {logoSrc ? (
              <Image
                src={logoSrc}
                alt="Site logo"
                width={16}
                height={16}
                className="size-4 rounded-sm object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none'
                }}
                unoptimized
              />
            ) : (
              <Globe className="size-3.5 text-white/30" />
            )}
            <span className="truncate">{new URL(href).hostname}</span>
          </div>
          <h4 className="line-clamp-2 text-sm font-bold leading-snug text-white transition-colors group-hover:text-cyan-200">
            {previewTitle}
          </h4>
          <p className="line-clamp-4 text-xs leading-relaxed text-white/55">
            {previewDesc}
          </p>
        </div>
        <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-cyan-300 group-hover:text-cyan-200">
          <span>Visitar sitio</span>
          <ExternalLink className="size-3 transition-transform duration-300 group-hover:translate-x-0.5" />
        </div>
      </a>
    )
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="group block overflow-hidden rounded-xl border border-white/5 bg-white/[0.02] transition-all duration-300 hover:border-white/10 hover:bg-white/[0.04] hover:-translate-y-0.5 cursor-pointer"
    >
      <div className="flex flex-col sm:flex-row">
        {imageSrc && (
          <div className="relative h-40 w-full shrink-0 overflow-hidden bg-black/10 sm:h-auto sm:w-48">
            <Image
              src={imageSrc}
              alt={previewTitle}
              fill
              sizes="(min-width: 640px) 192px, 100vw"
              className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              unoptimized
            />
          </div>
        )}
        <div className="flex flex-1 flex-col justify-between p-5">
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] text-white/40">
              {logoSrc ? (
                <Image
                  src={logoSrc}
                  alt="Site logo"
                  width={16}
                  height={16}
                  unoptimized
                  className="size-4 rounded-sm object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              ) : (
                <Globe className="size-3.5 text-white/30" />
              )}
              <span className="truncate max-w-[200px]">{new URL(href).hostname}</span>
            </div>
            <div>
              <h4 className="line-clamp-2 text-sm font-bold leading-snug text-white group-hover:text-cyan-200 transition-colors">
                {previewTitle}
              </h4>
              <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-white/55">
                {previewDesc}
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-cyan-300 group-hover:text-cyan-200">
            <span>Visitar sitio</span>
            <ExternalLink className="size-3 transition-transform duration-300 group-hover:translate-x-0.5" />
          </div>
        </div>
      </div>
    </a>
  )
}
