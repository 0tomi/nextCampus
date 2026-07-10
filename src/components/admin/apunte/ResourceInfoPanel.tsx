'use client'

import type { RecursoDraftKind } from '@/lib/domain/apuntes/apunteForm'

export function ResourceInfoPanel({
  kind,
  open,
  promptCopied,
  onCopyPrompt,
}: {
  kind: RecursoDraftKind
  open: boolean
  promptCopied: boolean
  onCopyPrompt: () => void
}) {
  return (
    <div
      className={[
        'grid transition-all duration-300 ease-out',
        open ? 'mb-2 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
      ].join(' ')}
    >
      <div className="overflow-hidden">
        <div className="rounded-lg border border-white/10 bg-surface-0 p-3 text-[12px] leading-relaxed text-white/70">
          {kind === 'LINK' ? (
            <p>
              Al ser un proyecto gratuito, contamos con almacenamiento limitado. Por eso preferimos que compartas un
              enlace hacia el recurso (como Google Drive, YouTube, GitHub o cualquier link de utilidad). Mostraremos una previsualización una vez subido el apunte.
            </p>
          ) : (
            <p>
              Los apuntes interactivos permiten subir explicaciones mucho más efectivas y súper útiles para estudiar.
              Este recurso está pensado para que subas un archivo hecho con IA explicando algo sobre el apunte, o el
              apunte en sí mismo.{' '}
              <button
                type="button"
                onClick={onCopyPrompt}
                className="cursor-pointer font-semibold text-cyan-300 underline decoration-dotted underline-offset-2 hover:text-cyan-200"
              >
                {promptCopied ? '¡Prompt copiado!' : 'Tocá acá'}
              </button>{' '}
              para copiar un prompt que podés usar para que tu IA favorita te arme un apunte interactivo.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
