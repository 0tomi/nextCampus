'use client'

import { useEffect, useActionState, useRef, useState, useCallback } from 'react'
import { Check, Copy, FileJson, Sparkles, Upload } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/button'
import { FormError } from '@/components/ui/FormError'
import {
  uploadQuizBankAction,
  type QuizBankActionState,
} from '@/app/admin/actions/quiz'
import { parseQuizBank } from '@/lib/domain/quiz-bank'

// ---- Prompt para la IA (autocontenido, sin skill) ---------------------------

const AI_PROMPT = `Sos un profesor universitario que arma bancos de preguntas tipo examen a partir del material de estudio que te paso (apuntes, PDFs, presentaciones, capítulos). El objetivo es que las preguntas distingan a quien estudió de quien no: nada que se adivine de memoria ni por sentido común.

Pautas de entrada:
- Trabajá SOLO sobre el material que te doy. Si no te paso material, pedímelo antes de inventar nada.
- Cantidad por defecto: 10 a 15 preguntas si no te aclaro otra cosa.
- Dificultad por defecto: nivel parcial universitario de grado.

Tipos de pregunta que podés usar (solo estos tres):
- "single": una sola opción correcta entre varias.
- "multiple": varias opciones correctas. NO digas en el enunciado cuántas hay que marcar: revelarlo regala información y vuelve la pregunta más fácil. Variá a lo largo del banco cuántas opciones hay (4 a 6) y cuántas son correctas, sin patrón fijo: como el estudiante no sabe el número, una sola correcta entre varias es válida y difícil. Lo único que conviene evitar es que TODAS sean correctas.
- "truefalse": una afirmación que es inequívocamente verdadera o falsa.

Usá los tres tipos a lo largo del banco y que "single" no domine. Como referencia, para ~12 preguntas: alrededor de la mitad "single" y el resto repartido entre "multiple" y "truefalse".

Para preguntas sobre código o salida de comandos, usá "single" o "multiple" e incluí el fragmento dentro del texto del enunciado (se muestra como texto plano, sin imágenes). Mantené esos fragmentos cortos.

Para evaluar si el estudiante sabe relacionar conceptos (término con su definición, comando con su acción, categoría con su ejemplo), NO uses tablas ni columnas: reformulá como "single" o "multiple". Por ejemplo: "¿Cuál de los siguientes pares concepto–definición es correcto?" con un par correcto y varios cruzados como distractores, o un "multiple" donde se marquen todos los emparejamientos válidos.

Principios que no se negocian:
- Una sola respuesta inequívoca (o exactamente el conjunto que pedís en "multiple"). Si dudás entre dos opciones como correctas, la pregunta está mal redactada.
- Usá los términos exactos del material. Si dice "exclusión mutua", no escribas "acceso excluyente".
- Cero capciosidad: la dificultad está en el conocimiento, nunca en la redacción. Sin dobles negaciones ni datos irrelevantes para confundir.
- No inventes datos. Si el material no da un año, una cifra o un autor, no lo inventes.
- Variedad cognitiva: combiná definir, identificar, comparar, aplicar e interpretar. No solo memorizar.
- Cobertura completa: representá todas las secciones del material, no solo el primer tercio.

Cómo construir las opciones incorrectas (distractores) para que sean plausibles:
- Variación tipográfica de un término real (ej: "monolítico" vs "macrolítico").
- Cruce dentro del mismo tema: invertir una relación o intercambiar autores/capas (ej: "SSL reemplazó a TLS", cuando es al revés).
- Mezcla parcial: en respuestas-lista, copiar casi todos los elementos correctos y cambiar uno.
- Generalización indebida: tomar algo verdadero y agregarle "siempre" o "nunca" que lo vuelve falso.
- Plausible pero técnicamente falso: lo que alguien creería por intuición sin haber estudiado.
- Datos numéricos cercanos pero incorrectos (años, tamaños, cantidades).
- La forma no debe delatar el fondo: la correcta no puede ser sistemáticamente la más larga ni la más detallada. A propósito, a veces hacé que el distractor más largo sea el incorrecto, y variá la posición de la correcta entre preguntas (que no caiga siempre en el mismo lugar). Truco para chequear: tapá la respuesta correcta y leé solo las opciones; si se adivina por la forma, rehacela.
- Evitá: opciones absurdas, opciones que se contradigan exactamente de a pares (delatan que la correcta es una de las dos), y distractores que parafraseen la correcta (crean dos respuestas válidas). Mantené las opciones con estructura y tecnicismo parejos.

Para Verdadero/Falso:
- La afirmación debe ser inequívocamente V o F, no interpretable.
- Cuando es falsa, el error tiene que ser real y enseñable (que el estudiante aprenda algo al ver la corrección).
- No abuses: como mucho un 25–30% del banco en este tipo.

Explicación: cada pregunta lleva explicación obligatoria, de 2 a 5 oraciones, justificando por qué la correcta lo es y por qué los distractores no.

Organizá el banco por unidad o tema del material: cada unidad es una entrada en "units".

El formato del JSON que debés devolver tiene que seguir EXACTAMENTE esta estructura (sin ningún texto adicional antes o después):

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
          "question": "¿Cuáles de los siguientes son características del concepto Y?",
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
- En "multiple": "answer" es un array de índices (0-based) de las opciones correctas, sin repetir. Requiere "options" con mínimo 2 elementos. NO declares en el enunciado cuántas hay que marcar.
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
    if (file) void processFile(file)
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) void processFile(file)
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
            <Sparkles className="size-4 text-violet-300" />
            ¿Todavía no tenés el archivo? Generalo con IA
          </div>
          <ol className="space-y-1.5 text-sm leading-6 text-white/52">
            <li>1. Copiá el prompt con el botón de abajo.</li>
            <li>
              2. Pegalo en tu asistente de IA y adjuntale los materiales de la
              materia (apuntes, PDFs, presentaciones).
            </li>
            <li>
              3. Subí acá el archivo .json que te devuelva.
            </li>
          </ol>
          <button
            type="button"
            onClick={() => {
              void copyPrompt()
            }}
            className="inline-flex items-center gap-2 border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/10 cursor-pointer"
          >
            {copied ? (
              <Check className="size-3.5 text-emerald-400" />
            ) : (
              <Copy className="size-3.5" />
            )}
            {copied ? 'Copiado' : 'Copiar prompt'}
          </button>
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
                <Upload className="size-8 text-white/28" />
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
            <FormError
              message={fileError}
              className="rounded-none border-rose-500/30 px-4 py-3 text-rose-200"
            />

            {/* Preview del archivo */}
            {preview && !fileError && (
              <div className="flex items-start gap-3 border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
                <FileJson className="mt-0.5 size-5 shrink-0 text-emerald-400" />
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
          <FormError
            message={!state.ok ? state.message : ''}
            className="rounded-none border-rose-500/30 px-4 py-3 text-rose-200"
          />

          <div className="flex justify-end gap-3 pt-1">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="rounded-none border-0 px-4 py-2.5 font-semibold text-white/58 hover:bg-transparent"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={pending || !preview}
              className="inline-flex items-center gap-2 rounded-none bg-primary px-5 py-2.5 font-bold text-white transition-colors hover:bg-primary-light disabled:opacity-40"
            >
              {pending ? 'Subiendo…' : 'Subir banco'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
