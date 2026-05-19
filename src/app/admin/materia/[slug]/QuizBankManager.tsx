'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Check,
  Copy,
  Download,
  FileJson,
  Plus,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import { DarkCard } from '@/components/ui/DarkCard'
import {
  uploadQuizBankAction,
  deleteQuizBankAction,
  type QuizBankActionState,
} from '@/app/admin/actions'

interface BancoMeta {
  id: string
  nombre: string
  totalPreguntas: number
  subidoEl: string
}

interface Props {
  subjectSlug: string
  bancos: BancoMeta[]
}

const AI_PROMPT = `Sos un asistente que genera bancos de preguntas de examen a partir del material de una materia.

Te voy a pasar los PDFs / apuntes de la materia. Con ese contenido generá un único JSON, SIN texto adicional, EXACTAMENTE con este formato:

{
  "title": "Nombre de la materia",
  "units": [
    {
      "name": "Unidad 1: Nombre de la unidad",
      "questions": [
        { "type": "single", "question": "Pregunta...", "options": ["A","B","C","D"], "answer": 1, "explanation": "Por qué la correcta es B y por qué las otras no." },
        { "type": "multiple", "question": "Pregunta...", "options": ["A","B","C","D"], "answer": [0,2], "explanation": "Por qué esas son correctas." },
        { "type": "truefalse", "question": "Afirmación...", "answer": false, "explanation": "Por qué es falsa." }
      ]
    }
  ]
}

Reglas:
- "type" es uno de: "single" (una sola correcta), "multiple" (varias correctas), "truefalse".
- En "single", "answer" es el índice (0-based) de la opción correcta.
- En "multiple", "answer" es un array de índices correctos, sin repetir.
- En "truefalse", "answer" es true o false (booleano, sin comillas) y NO lleva "options".
- Siempre incluí "explanation" clara y educativa.
- Mínimo 2 opciones en single/multiple.
- Cubrí todas las unidades del material. Apuntá a preguntas conceptuales, no triviales.
- Devolvé SOLO el JSON válido, nada más.`

export function QuizBankManager({ subjectSlug, bancos }: Props) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  return (
    <DarkCard className="space-y-5 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/38">
            Contenido de práctica
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-white">
            Bancos de preguntas
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/52">
            Subí los bancos en JSON. Los estudiantes podrán practicar con uno o
            combinando varios.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex shrink-0 items-center gap-2 bg-primary px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-uader-red-light"
        >
          <Plus className="h-4 w-4" />
          Cargar banco
        </button>
      </div>

      {bancos.length === 0 ? (
        <p className="border border-white/5 bg-surface-0 px-4 py-6 text-center text-sm text-white/48">
          Todavía no hay bancos cargados para esta materia.
        </p>
      ) : (
        <ul className="space-y-2">
          {bancos.map((b) => (
            <li
              key={b.id}
              className="flex flex-col gap-3 border border-white/5 bg-surface-0 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="flex items-center gap-3">
                <FileJson className="h-4 w-4 text-violet-300" />
                <span>
                  <span className="block text-sm font-semibold text-white">
                    {b.nombre}
                  </span>
                  <span className="text-xs text-white/44">
                    {b.totalPreguntas} preguntas
                  </span>
                </span>
              </span>
              <form action={deleteQuizBankAction}>
                <input type="hidden" name="subjectSlug" value={subjectSlug} />
                <input type="hidden" name="bankId" value={b.id} />
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 border border-white/5 bg-white/5 px-3 py-2 text-sm font-semibold text-rose-200 transition-colors hover:bg-white/10"
                >
                  <Trash2 className="h-4 w-4" />
                  Borrar
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <UploadModal
          subjectSlug={subjectSlug}
          onClose={() => setOpen(false)}
          onUploaded={() => {
            setOpen(false)
            router.refresh()
          }}
        />
      )}
    </DarkCard>
  )
}

function UploadModal({
  subjectSlug,
  onClose,
  onUploaded,
}: {
  subjectSlug: string
  onClose: () => void
  onUploaded: () => void
}) {
  const [state, formAction, pending] = useActionState<
    QuizBankActionState,
    FormData
  >(uploadQuizBankAction, { ok: false, message: '' })
  const [copied, setCopied] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (state.ok) onUploaded()
  }, [state.ok, onUploaded])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(AI_PROMPT)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard no disponible: el textarea queda seleccionable */
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm sm:p-8"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Cargar banco de preguntas"
    >
      <div
        ref={dialogRef}
        className="w-full max-w-2xl border border-white/10 bg-surface-1"
      >
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
          <h3 className="text-lg font-black tracking-tight text-white">
            Cargar banco de preguntas
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="text-white/48 transition-colors hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 px-6 py-6">
          <div className="space-y-3 border border-white/5 bg-surface-0 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Sparkles className="h-4 w-4 text-violet-300" />
              ¿No tenés el JSON? Generalo con IA
            </div>
            <p className="text-sm leading-6 text-white/52">
              Subí los PDFs de la materia a tu asistente de IA y pegá este
              prompt. También podés bajar la skill para hacerlo automático.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={copyPrompt}
                className="inline-flex items-center gap-2 border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/10"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copied ? 'Copiado' : 'Copiar prompt'}
              </button>
              <a
                href="/resources/banco-preguntas-examen.skill"
                download
                className="inline-flex items-center gap-2 border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/10"
              >
                <Download className="h-3.5 w-3.5" />
                Descargar skill
              </a>
            </div>
            <textarea
              readOnly
              value={AI_PROMPT}
              onClick={(e) => e.currentTarget.select()}
              className="h-28 w-full resize-none border border-white/5 bg-[#0a0a0a] px-3 py-2 text-xs leading-5 text-white/58 focus:outline-none"
            />
          </div>

          <form action={formAction} className="space-y-4">
            <input type="hidden" name="subjectSlug" value={subjectSlug} />
            <div>
              <label
                htmlFor="nombre"
                className="block text-[11px] font-semibold uppercase tracking-[0.2em] text-white/38"
              >
                Nombre del banco
              </label>
              <input
                id="nombre"
                name="nombre"
                required
                maxLength={120}
                placeholder="Ej: Cátedra Pérez — 2024"
                className="mt-2 block w-full border border-white/5 bg-[#0a0a0a] px-3 py-2.5 text-sm text-white placeholder:text-white/28 focus:border-white/10 focus:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="json"
                className="block text-[11px] font-semibold uppercase tracking-[0.2em] text-white/38"
              >
                JSON del banco
              </label>
              <textarea
                id="json"
                name="json"
                required
                placeholder='{ "title": "...", "units": [ ... ] }'
                className="mt-2 block h-48 w-full resize-y border border-white/5 bg-[#0a0a0a] px-3 py-2.5 font-mono text-xs leading-5 text-white placeholder:text-white/28 focus:border-white/10 focus:outline-none"
              />
            </div>

            {state.message && (
              <p
                className={
                  state.ok
                    ? 'border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200'
                    : 'border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200'
                }
              >
                {state.message}
              </p>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-sm font-semibold text-white/58 transition-colors hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={pending}
                className="inline-flex items-center gap-2 bg-primary px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-uader-red-light disabled:cursor-not-allowed disabled:opacity-40"
              >
                {pending ? 'Validando…' : 'Subir banco'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
