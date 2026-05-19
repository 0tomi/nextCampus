'use client'

import { useEffect, useActionState, useRef, useState, useCallback } from 'react'
import { Check, Copy, Download, FileJson, Sparkles, Upload } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import {
  uploadQuizBankAction,
  type QuizBankActionState,
} from '@/app/admin/actions'
import { parseQuizBank } from '@/lib/domain/quiz-bank'

// ---- Prompt para la IA (con la skill instalada) ----------------------------

const AI_PROMPT = `Tenés la skill "banco-preguntas-examen" instalada. Usala para analizar el material de la materia y generar el banco de preguntas en el formato que se describe a continuación.

Si la skill no está disponible, generá el banco directamente siguiendo estas instrucciones:
Analizá los PDFs o apuntes de la materia y devolvé UN ÚNICO JSON válido, sin ningún texto adicional antes o después, con exactamente esta estructura:

{
  "title": "Nombre descriptivo del banco (usá el nombre de la materia o cátedra)",
  "units": [
    {
      "name": "Unidad 1: Nombre de la unidad",
      "questions": [
        {
          "type": "single",
          "question": "¿Cuál de las siguientes afirmaciones describe correctamente el concepto X?",
          "options": ["Opción A", "Opción B", "Opción C", "Opción D"],
          "answer": 1,
          "explanation": "La opción B es correcta porque... Las otras opciones son incorrectas porque..."
        },
        {
          "type": "multiple",
          "question": "¿Cuáles de los siguientes son características del concepto Y? (puede haber más de una correcta)",
          "options": ["Característica A", "Característica B", "Característica C", "Característica D"],
          "answer": [0, 2],
          "explanation": "A y C son correctas porque... B y D son incorrectas porque..."
        },
        {
          "type": "truefalse",
          "question": "El concepto Z implica necesariamente que la condición W se cumple siempre.",
          "answer": false,
          "explanation": "Es falso porque... El caso correcto es..."
        }
      ]
    }
  ]
}

Reglas del formato:
- "type" es exactamente uno de: "single", "multiple", "truefalse".
- En "single": "answer" es el índice (0-based) de la única opción correcta. Requiere "options" con mínimo 2 elementos.
- En "multiple": "answer" es un array de índices (0-based) de las opciones correctas, sin repetir. Requiere "options" con mínimo 2 elementos.
- En "truefalse": "answer" es true o false (booleano, sin comillas). NO lleva campo "options".
- "explanation" es OBLIGATORIA en todos los tipos — explicá por qué la respuesta es correcta y por qué las otras opciones no lo son.
- Cubrí todas las unidades del material. Apuntá a preguntas conceptuales, no triviales.
- Devolvé SOLO el JSON válido, sin texto adicional.`

// ---- Tipos de preview -------------------------------------------------------

interface FilePreview {
  fileName: string
  title: string
  totalPreguntas: number
  rawText: string
}

// ---- Componente principal ---------------------------------------------------

interface QuizBankModalProps {
  open: boolean
  onClose: () => void
  subjectSlug: string
  onUploaded?: () => void
}

const emptyState: QuizBankActionState = { ok: false, message: '' }

export function QuizBankModal({
  open,
  onClose,
  subjectSlug,
  onUploaded,
}: QuizBankModalProps) {
  const [state, formAction, pending] = useActionState(
    uploadQuizBankAction,
    emptyState,
  )
  const [copied, setCopied] = useState(false)
  const [preview, setPreview] = useState<FilePreview | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)

  // Cerrar y notificar en éxito
  useEffect(() => {
    if (state.ok) {
      onUploaded?.()
      onClose()
    }
  }, [state.ok, onClose, onUploaded])

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(AI_PROMPT)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard no disponible */
    }
  }

  const processFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.json')) {
      setFileError('El archivo debe tener extensión .json.')
      setPreview(null)
      return
    }

    const rawText = await file.text()
    const result = parseQuizBank(rawText)

    if (!result.ok) {
      setFileError(result.error)
      setPreview(null)
      return
    }

    setFileError(null)
    setPreview({
      fileName: file.name,
      title: result.bank.title,
      totalPreguntas: result.totalPreguntas,
      rawText,
    })
  }, [])

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragging(true)
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    // Solo resetear si realmente salimos del drop zone
    if (!dropRef.current?.contains(e.relatedTarget as Node)) {
      setDragging(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Subir banco de preguntas"
      titleId="quiz-bank-modal-title"
      className="max-w-2xl"
    >
      <div className="space-y-6">
        {/* Sección A: Generar con IA */}
        <div className="space-y-3 border border-white/5 bg-surface-0 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Sparkles className="h-4 w-4 text-violet-300" />
            ¿Todavía no tenés el archivo? Generalo con IA
          </div>
          <p className="text-sm leading-6 text-white/52">
            Instalá la skill de generación de preguntas en tu asistente de IA,
            subile los materiales de la materia y usá el prompt de abajo para
            obtener el archivo listo para subir.
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
            className="h-24 w-full resize-none border border-white/5 bg-[#0a0a0a] px-3 py-2 text-xs leading-5 text-white/52 focus:outline-none"
          />
        </div>

        {/* Sección B: Dropzone + form */}
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="subjectSlug" value={subjectSlug} />
          {/* Input oculto que porta el JSON al server */}
          <input type="hidden" name="json" value={preview?.rawText ?? ''} />

          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/38">
              Archivo de preguntas
            </p>

            {/* Drop zone */}
            <div
              ref={dropRef}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={[
                'relative flex min-h-[120px] cursor-pointer flex-col items-center justify-center gap-3 border-2 border-dashed p-6 text-center transition-colors',
                dragging
                  ? 'border-violet-400/60 bg-violet-500/5'
                  : 'border-white/10 bg-surface-0 hover:border-white/20',
              ].join(' ')}
            >
              <label className="flex cursor-pointer flex-col items-center gap-3">
                <Upload className="h-8 w-8 text-white/28" />
                <span className="text-sm text-white/52">
                  Arrastrá tu archivo .json acá, o{' '}
                  <span className="font-semibold text-white/80 underline underline-offset-2">
                    buscalo en tu dispositivo
                  </span>
                </span>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileInput}
                  className="sr-only"
                />
              </label>
            </div>

            {/* Error de archivo */}
            {fileError && (
              <p className="border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {fileError}
              </p>
            )}

            {/* Preview del archivo */}
            {preview && !fileError && (
              <div className="flex items-start gap-3 border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
                <FileJson className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    {preview.title}
                  </p>
                  <p className="text-xs text-white/48">
                    {preview.totalPreguntas}{' '}
                    {preview.totalPreguntas === 1 ? 'pregunta' : 'preguntas'}{' '}
                    detectadas · {preview.fileName}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Mensaje de respuesta del server */}
          {state.message && !state.ok && (
            <p className="border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {state.message}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-semibold text-white/58 transition-colors hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending || !preview}
              className="inline-flex items-center gap-2 bg-primary px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-uader-red-light disabled:cursor-not-allowed disabled:opacity-40"
            >
              {pending ? 'Subiendo…' : 'Subir banco'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
