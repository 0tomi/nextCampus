import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react'
import { Download, FileText, Maximize2, Minimize2, PlayCircle } from 'lucide-react'
import type { RecursoViewVariant } from './types'

export function HtmlResource({
  recursoId,
  title,
  variant,
  apunteHref,
  loadMode,
}: {
  recursoId: string
  title: string
  variant: RecursoViewVariant
  apunteHref?: string
  loadMode: 'auto' | 'on-click'
}) {
  if (variant === 'wide') {
    return <HtmlPreviewIframe recursoId={recursoId} titulo={title} />
  }

  return <HtmlPreviewCard href={apunteHref} title={title} recursoId={recursoId} loadMode={loadMode} variant={variant} />
}

function HtmlPreviewCard({
  title,
  recursoId,
  loadMode,
  variant,
}: {
  href?: string
  title: string
  recursoId: string
  loadMode: 'auto' | 'on-click'
  variant: RecursoViewVariant
}) {
  const [shouldLoad, setShouldLoad] = useState(loadMode === 'auto')

  if (!shouldLoad) {
    return <HtmlPreviewPlaceholder title={title} onLoad={() => setShouldLoad(true)} variant={variant} />
  }

  return <HtmlPreviewIframe recursoId={recursoId} titulo={title} compact tile={variant === 'content-card'} />
}

function HtmlPreviewPlaceholder({
  title,
  onLoad,
  variant,
}: {
  title: string
  onLoad: () => void
  variant: RecursoViewVariant
}) {
  return (
    <div className={[
      'relative flex w-full flex-col items-center justify-center overflow-hidden rounded-xl border border-cyan-300/10 bg-[radial-gradient(circle_at_top,rgba(103,232,249,0.12),transparent_42%),linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.015))] p-5 text-center',
      variant === 'content-card' ? 'h-full min-h-0' : 'h-[280px] min-h-[280px] sm:h-[320px]',
    ].join(' ')}>
      <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/25 to-transparent" />
      <FileText className="size-8 text-cyan-100/70" aria-hidden="true" />
      <p className="mt-4 text-[11px] font-black uppercase tracking-[0.22em] text-cyan-100/55">
        Apunte interactivo
      </p>
      <h4 className="mt-2 max-w-sm break-words text-base font-black leading-tight text-white">
        {title}
      </h4>
      <p className="mt-3 max-w-xs text-sm leading-6 text-white/52">
        Tocá para abrir la vista previa.
      </p>
      <button
        type="button"
        onClick={onLoad}
        className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-4 py-2.5 text-sm font-bold text-cyan-50 transition-colors hover:bg-cyan-300/15 hover:text-white"
      >
        <PlayCircle className="size-4" aria-hidden="true" />
        Ver apunte interactivo
      </button>
    </div>
  )
}

function HtmlPreviewIframe({
  recursoId,
  titulo,
  compact = false,
  tile = false,
}: {
  recursoId: string
  titulo: string
  compact?: boolean
  tile?: boolean
}) {
  const [isLoading, setIsLoading] = useState(true)
  const [isExpanded, setIsExpanded] = useState(false)
  const [animate, setAnimate] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const handleExpand = () => {
    setIsExpanded(true)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setAnimate(true)
      })
    })
  }

  const handleReduce = useCallback(() => {
    setAnimate(false)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setIsExpanded(false)
    }, 300)
  }, [])

  const reduceFromEscape = useEffectEvent(() => {
    handleReduce()
  })

  const clearReduceTimer = useEffectEvent(() => {
    const timer = timerRef.current
    if (timer) clearTimeout(timer)
  })

  useEffect(() => {
    if (!isExpanded) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') reduceFromEscape()
    }
    window.addEventListener('keydown', handleKeyDown)

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = originalOverflow
    }
  }, [isExpanded])

  useEffect(() => {
    return () => {
      clearReduceTimer()
    }
  }, [])

  const collapsedClassName = tile
    ? 'relative size-full overflow-hidden rounded-xl border border-white/5 bg-surface-1 transition-all duration-300'
    : compact
    ? 'relative h-[280px] min-h-[280px] w-full overflow-hidden rounded-xl border border-white/5 bg-surface-1 transition-all duration-300 sm:h-[320px]'
    : 'relative w-full h-[70vh] min-h-[500px] sm:min-h-[750px] rounded-xl overflow-hidden border border-white/5 bg-surface-1 transition-all duration-300'

  return (
    <>
      {isExpanded && (
        <div
          className={`fixed inset-0 z-40 bg-black/85 backdrop-blur-sm transition-opacity duration-300 ${
            animate ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={handleReduce}
          role="presentation"
        />
      )}

      <div
        className={
          isExpanded
            ? `fixed inset-4 sm:inset-6 z-50 flex flex-col bg-[#101010] border border-white/10 shadow-[0_24px_64px_rgba(0,0,0,0.8)] rounded-2xl p-0 overflow-hidden transition-all duration-300 ${
                animate ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'
              }`
            : collapsedClassName
        }
      >
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-black/35 backdrop-blur-sm transition-opacity duration-300 z-20">
            <div className="size-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
            <p className="mt-3 text-xs font-semibold text-white/55 tracking-wide">
              Cargando apunte…
            </p>
          </div>
        )}

        {isExpanded && (
          <div className="absolute top-3.5 right-3.5 z-30 flex items-center gap-2">
            <a
              href={`/api/apuntes/recursos/${recursoId}/preview?download=1`}
              download
              className="cursor-pointer inline-flex items-center justify-center h-[34px] px-2.5 hover:px-3 gap-0 hover:gap-1.5 rounded-lg border border-white/10 bg-black/60 text-xs font-semibold text-white/90 backdrop-blur-md shadow-lg transition-all duration-300 hover:scale-[1.02] hover:bg-black/80 hover:border-white/20 group select-none opacity-80 hover:opacity-100"
              title="Descargar apunte"
            >
              <Download className="size-4 shrink-0" />
              <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-300 ease-out group-hover:max-w-[80px] group-hover:opacity-100">
                Descargar
              </span>
            </a>
            <button
              type="button"
              onClick={handleReduce}
              className="cursor-pointer inline-flex items-center justify-center h-[34px] px-2.5 hover:px-3 gap-0 hover:gap-1.5 rounded-lg border border-white/10 bg-black/60 text-xs font-semibold text-white/90 backdrop-blur-md shadow-lg transition-all duration-300 hover:scale-[1.02] hover:bg-black/80 hover:border-white/20 group select-none opacity-80 hover:opacity-100"
              title="Reducir apunte"
            >
              <Minimize2 className="size-4 shrink-0" />
              <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-300 ease-out group-hover:max-w-[80px] group-hover:opacity-100">
                Reducir
              </span>
            </button>
          </div>
        )}

        {!isExpanded && !isLoading && (
          <div className="absolute top-3.5 right-3.5 z-10 flex items-center gap-2">
            <a
              href={`/api/apuntes/recursos/${recursoId}/preview?download=1`}
              download
              className="cursor-pointer inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-xs font-semibold text-white/90 backdrop-blur-md shadow-lg transition-all duration-300 hover:scale-[1.02] hover:bg-black/80 hover:border-white/20 hover:text-white"
              title="Descargar apunte"
            >
              <Download className="size-3.5" />
              <span>Descargar</span>
            </a>
            <button
              type="button"
              onClick={handleExpand}
              className="cursor-pointer inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-xs font-semibold text-white/90 backdrop-blur-md shadow-lg transition-all duration-300 hover:scale-[1.02] hover:bg-black/80 hover:border-white/20 hover:text-white"
              title="Expandir apunte"
            >
              <Maximize2 className="size-3.5" />
              <span>Expandir</span>
            </button>
          </div>
        )}

        <div className={isExpanded ? 'flex-1 min-h-0 w-full' : 'size-full'}>
          <iframe
            src={`/api/apuntes/recursos/${recursoId}/preview`}
            className={`block size-full rounded-xl bg-black/20 transition-opacity duration-300 ${
              isExpanded ? 'border-none' : 'border border-white/5'
            } ${isLoading ? 'opacity-0' : 'opacity-100'}`}
            loading="lazy"
            sandbox="allow-scripts"
            title={titulo}
            onLoad={() => setIsLoading(false)}
          />
        </div>
      </div>
    </>
  )
}
