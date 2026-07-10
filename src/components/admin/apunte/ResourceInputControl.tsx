'use client'

import Image from 'next/image'
import { AlertCircle, CirclePlay, FileCode2, Globe } from 'lucide-react'
import type { RecursoDraft } from '@/lib/domain/apuntes/apunteForm'

function Github({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  )
}

export function ResourceInputControl({
  recurso,
  onCancelHtmlReplace,
  onHtmlFileChange,
  onStartHtmlReplace,
  onUrlBlur,
  onUrlChange,
}: {
  recurso: RecursoDraft
  onCancelHtmlReplace: (localId: string) => void
  onHtmlFileChange: (localId: string, file: File | null) => void
  onStartHtmlReplace: (localId: string) => void
  onUrlBlur: (localId: string, value: string) => void
  onUrlChange: (localId: string, value: string) => void
}) {
  if (recurso.kind === 'LINK') {
    return <LinkResourceInput recurso={recurso} onUrlBlur={onUrlBlur} onUrlChange={onUrlChange} />
  }

  return (
    <HtmlResourceInput
      recurso={recurso}
      onCancelHtmlReplace={onCancelHtmlReplace}
      onHtmlFileChange={onHtmlFileChange}
      onStartHtmlReplace={onStartHtmlReplace}
    />
  )
}

function LinkResourceInput({
  recurso,
  onUrlBlur,
  onUrlChange,
}: {
  recurso: RecursoDraft
  onUrlBlur: (localId: string, value: string) => void
  onUrlChange: (localId: string, value: string) => void
}) {
  const placeholder = 'https://drive.google.com/..., https://youtube.com/..., https://github.com/... o cualquier link'

  return (
    <div className="relative flex-1">
      <input
        type="url"
        aria-label="Link del recurso"
        value={recurso.url}
        onChange={(event) => onUrlChange(recurso.localId, event.target.value)}
        onBlur={(event) => onUrlBlur(recurso.localId, event.target.value)}
        placeholder={placeholder}
        className={`w-full rounded border bg-surface-0 px-3 py-2 pr-9 text-sm text-white placeholder:text-white/30 focus:outline-none ${
          recurso.error ? 'border-rose-400/50 focus:border-rose-400/70' : 'border-white/10 focus:border-white/20'
        }`}
      />
      <div className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2">
        {recurso.tipo === 'YOUTUBE' ? <CirclePlay className="size-4 text-red-400" /> : null}
        {recurso.tipo === 'DRIVE' ? (
          <Image
            src="/resources/google_drive_logo_icon_159334.png"
            alt="Drive"
            width={16}
            height={16}
            className="size-4"
          />
        ) : null}
        {recurso.tipo === 'REPOSITORY' ? <Github className="size-4 text-slate-300" /> : null}
        {recurso.tipo === 'OTHER' ? <Globe className="size-4 text-cyan-400" /> : null}
        {recurso.error ? <AlertCircle className="size-4 text-rose-400" /> : null}
      </div>
    </div>
  )
}

function HtmlResourceInput({
  recurso,
  onCancelHtmlReplace,
  onHtmlFileChange,
  onStartHtmlReplace,
}: {
  recurso: RecursoDraft
  onCancelHtmlReplace: (localId: string) => void
  onHtmlFileChange: (localId: string, file: File | null) => void
  onStartHtmlReplace: (localId: string) => void
}) {
  if (recurso.storageKey && !recurso.replacingStorage) {
    return (
      <div className="flex-1">
        <div className="flex min-h-10 flex-wrap items-center justify-between gap-2 rounded border border-white/10 bg-surface-0 px-3 py-2 text-sm text-white/70">
          <span className="inline-flex min-w-0 items-center gap-2">
            <FileCode2 className="size-4 shrink-0 text-cyan-300" />
            <span>Apunte interactivo cargado</span>
          </span>
          <button
            type="button"
            onClick={() => onStartHtmlReplace(recurso.localId)}
            className="cursor-pointer rounded border border-cyan-300/25 bg-cyan-300/10 px-2.5 py-1 text-xs font-semibold text-cyan-100 transition-colors hover:bg-cyan-300/15"
          >
            Reemplazar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1">
      <div className="space-y-2">
        <input
          type="file"
          aria-label="Archivo del apunte interactivo"
          name={`htmlFile:${recurso.localId}`}
          accept=".html,.htm,.jsx,.tsx,text/html,text/javascript,application/javascript"
          onChange={(event) => onHtmlFileChange(recurso.localId, event.target.files?.[0] ?? null)}
          className={`w-full cursor-pointer rounded border bg-surface-0 px-3 py-2 text-sm text-white file:mr-3 file:cursor-pointer file:rounded file:border-0 file:bg-white/10 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-white hover:file:bg-white/15 ${
            recurso.error ? 'border-rose-400/50' : 'border-white/10'
          }`}
        />
        {recurso.storageKey && recurso.replacingStorage ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded border border-cyan-300/15 bg-cyan-300/10 px-3 py-2 text-[11px] text-cyan-100/80">
            <span>El archivo actual se mantiene hasta que guardes el reemplazo.</span>
            <button
              type="button"
              onClick={() => onCancelHtmlReplace(recurso.localId)}
              className="cursor-pointer rounded border border-white/10 bg-white/[0.04] px-2.5 py-1 font-semibold text-white/75 transition-colors hover:bg-white/10 hover:text-white"
            >
              Cancelar reemplazo
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
