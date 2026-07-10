'use client'

import { useCallback, useState } from 'react'
import { Trash2 } from 'lucide-react'
import type { RecursoTipo } from '@/lib/recursos'
import type { RecursoDraft, RecursoDraftKind } from '@/lib/domain/apuntes/apunteForm'
import { HTML_PROMPT } from './htmlPrompt'
import { ResourceKindSelector } from './ResourceKindSelector'
import { ResourceInfoPanel } from './ResourceInfoPanel'
import { ResourceInputControl } from './ResourceInputControl'
import { ResourceOrderActions } from './ResourceOrderActions'
import { ResourceNameField } from './ResourceNameField'

// ---------------------------------------------------------------------------
// RecursoRow — individual resource row in the list
// ---------------------------------------------------------------------------

/** Texto de ayuda que anticipa el nombre genérico que verá el usuario si deja el campo vacío. */
function nombreFallbackHint(tipo: RecursoTipo | null): string | null {
  if (tipo === 'HTML') return 'Se mostrará como vista interactiva'
  if (tipo === 'DRIVE') return 'Se mostrará como “Archivo de Drive”'
  if (tipo === 'YOUTUBE') return 'Se mostrará como “Video de YouTube”'
  if (tipo === 'REPOSITORY') return 'Se mostrará como “Repositorio de GitHub”'
  if (tipo === 'OTHER') return 'Se mostrará como enlace externo con vista previa'
  return null
}

interface RecursoRowProps {
  recurso: RecursoDraft
  index: number
  total: number
  onKindChange: (localId: string, kind: RecursoDraftKind) => void
  onUrlChange: (localId: string, value: string) => void
  onUrlBlur: (localId: string, value: string) => void
  onHtmlFileChange: (localId: string, file: File | null) => void
  onStartHtmlReplace: (localId: string) => void
  onCancelHtmlReplace: (localId: string) => void
  onNombreChange: (localId: string, value: string) => void
  onRemove: (localId: string) => void
  onMoveUp: (index: number) => void
  onMoveDown: (index: number) => void
}

export function RecursoRow({
  recurso,
  index,
  total,
  onKindChange,
  onUrlChange,
  onUrlBlur,
  onHtmlFileChange,
  onStartHtmlReplace,
  onCancelHtmlReplace,
  onNombreChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: RecursoRowProps) {
  const hint = nombreFallbackHint(recurso.tipo)
  const showHint = recurso.nombre.trim().length === 0 && hint !== null
  const [promptCopiado, setPromptCopiado] = useState(false)
  const [infoAbierta, setInfoAbierta] = useState(false)

  const toggleInfo = useCallback(() => {
    setInfoAbierta((prev) => !prev)
  }, [])

  const copiarPrompt = useCallback(() => {
    navigator.clipboard
      .writeText(HTML_PROMPT)
      .then(() => {
        setPromptCopiado(true)
        setTimeout(() => setPromptCopiado(false), 2000)
      })
      .catch(() => {
        /* clipboard no disponible — ignoramos silenciosamente */
      })
  }, [])

  return (
    <div className="rounded-lg border border-white/10 bg-surface-1/40 p-2.5">
      <ResourceKindSelector
        kind={recurso.kind}
        infoOpen={infoAbierta}
        onInfoToggle={toggleInfo}
        onKindChange={(kind) => onKindChange(recurso.localId, kind)}
      />
      <ResourceInfoPanel
        kind={recurso.kind}
        open={infoAbierta}
        promptCopied={promptCopiado}
        onCopyPrompt={copiarPrompt}
      />

      <div className="flex items-center gap-2">
        <ResourceInputControl
          recurso={recurso}
          onCancelHtmlReplace={onCancelHtmlReplace}
          onHtmlFileChange={onHtmlFileChange}
          onStartHtmlReplace={onStartHtmlReplace}
          onUrlBlur={onUrlBlur}
          onUrlChange={onUrlChange}
        />
        <ResourceOrderActions index={index} total={total} onMoveUp={onMoveUp} onMoveDown={onMoveDown} />
        <button
          type="button"
          onClick={() => onRemove(recurso.localId)}
          title="Eliminar recurso"
          aria-label="Eliminar recurso"
          className="inline-flex size-8 cursor-pointer items-center justify-center rounded text-rose-400/60 transition-colors hover:bg-rose-500/10 hover:text-rose-300"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>

      {recurso.error ? <p className="mt-1.5 text-[11px] text-rose-400">{recurso.error}</p> : null}

      <ResourceNameField
        hint={hint}
        name={recurso.nombre}
        showHint={showHint}
        onChange={(value) => onNombreChange(recurso.localId, value)}
      />
    </div>
  )
}
