'use client'

import { useCallback, useState } from 'react'
import Image from 'next/image'
import { AlertCircle, ChevronDown, ChevronUp, CirclePlay, FileCode2, Globe, Info, Trash2 } from 'lucide-react'
import type { RecursoTipo } from '@/lib/recursos'

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
import type { RecursoDraft, RecursoDraftKind } from '@/lib/domain/apuntes/apunteForm'

// ---------------------------------------------------------------------------
// Prompt copiable para generar apuntes interactivos con IA.
// Editá libremente este texto: es lo que se copia al tocar "Tocá acá".
// ---------------------------------------------------------------------------

const HTML_PROMPT = `# OBJETIVO

Vas a construir un **apunte interactivo** en formato TSX que reemplaza por completo al material de estudio que te envía el usuario. El estudiante que lo use JAMÁS va a ver el material original: si algo no está explicado dentro de tu apunte, para él no existe. No estás mejorando un texto: estás construyendo desde cero un recurso autocontenido y definitivo.

La meta pedagógica no es que el apunte *presente* la información, sino que el estudiante termine **pudiendo explicar y aplicar cada concepto por su cuenta**. Un apunte que solo se lee produce un estudiante que reconoce el tema; uno que hace predecir, manipular y resolver produce un estudiante que lo sabe. Diseñá para lo segundo.

# EL MATERIAL QUE RECIBÍS

El material adjunto NO es algo que tengas que comentar, resumir ni anotar: es únicamente el **TEMARIO** — la lista de temas y conceptos que tu apunte tiene que cubrir. Tratalo como materia prima. Identificá la idea general y cada concepto, sin dejar ninguno afuera.

Si el mensaje del usuario incluye indicaciones de estilo, enfoque o estructura para este apunte, esas indicaciones mandan sobre los defaults de este documento (nunca sobre el contrato técnico).

# CÓMO ESTRUCTURAR EL CONTENIDO

- **Secuencia guiada, no muro de texto.** El apunte avanza como una clase: cada idea se revela y se construye progresivamente, un paso por vez.
- **Cada sección abre con la pregunta que va a responder** o el problema que motiva el concepto ("¿Cómo sabemos si la red memorizó en vez de aprender?"). El estudiante tiene que saber para qué está leyendo antes de leer.
- **Cada sección cierra con una síntesis breve y un puente** a la siguiente: qué quedó establecido y qué pregunta nueva abre.
- **Orden de dependencias:** ningún concepto se usa antes de definirse. Todo término técnico se define la primera vez que aparece.
- **Profundidad sobre exhaustividad:** desarrollá a fondo lo central antes que mencionar mucho superficialmente.

# DIRECTIVAS PEDAGÓGICAS

- **Explicá desde cero.** Cada concepto, ejemplo y fórmula desde sus fundamentos, como si el estudiante no supiera nada del tema. No tiene otro material al lado.
- **Ejemplo trabajado con narración.** Cada ejemplo viene completo: qué representa, por qué es así, el razonamiento narrado paso a paso, y qué tiene que observar el estudiante. Mostrar un ejemplo y seguir de largo no enseña.
- **Después del ejemplo trabajado, un caso para que lo resuelva él.** Donde haya un procedimiento (un algoritmo, un método, un cálculo), cerrá con un ejercicio paralelo — mismo método, datos distintos — con verificación interactiva. Aplicar el método es donde el aprendizaje se cementa.
- **Predicción antes de revelado.** En las construcciones paso a paso, antes de mostrar el paso siguiente invitá al estudiante a predecirlo ("¿qué celda conviene elegir ahora? Pensalo antes de seguir") y recién entonces revelá con la explicación de por qué.
- **Recuerdo activo en las autoevaluaciones.** Preguntas que obligan a recuperar y aplicar, no a reconocer. El feedback es inmediato y explica tanto por qué la correcta es correcta como por qué cada distractor es tentador pero incorrecto.
- **Señalá las trampas.** Donde los estudiantes típicamente se confunden, decilo explícitamente ("este paso confunde a la mayoría: el error común es...") y mostrá el error y su corrección.

# INTERACTIVIDAD Y MANDATO VISUAL

No es decoración: es la forma de enseñar.

- **Lo abstracto se vuelve visual, siempre.** Todo concepto abstracto, ecuación, algoritmo, estructura o proceso DEBE tener una representación visual interactiva o animada que lo modele.
- **Fidelidad sobre adorno.** La visualización representa el mecanismo real: cómo cambia una variable, cómo itera el algoritmo, cómo se deforma la curva, cómo fluyen los datos. Una animación que no carga el concepto es decoración, y la decoración enseña a pasar de largo.
- **Una relación por visual.** Mostrá un paso, una relación, una comparación por vez — no el mecanismo completo terminado de una. La animación de todo el mecanismo es la respuesta disfrazada: saltea el pensamiento del estudiante igual que dárselo escrito.
- **Cada interactivo lleva una pregunta, no un epígrafe.** El slider, la simulación o el paso a paso vienen acompañados de una consigna que pide predecir o explicar ("antes de mover el slider: ¿qué le pasa a la curva si b crece? Ahora probalo"). La mano del estudiante en el parámetro vale más que la tuya.
- **Interacciones esperadas:** sliders que recalculan fórmula y gráfico en vivo; algoritmos ejecutados paso a paso resaltando qué cambió en cada iteración y por qué; diagramas que se arman ante el ojo; simulaciones manipulables; autoevaluaciones con feedback inmediato.

# TONO

- Tratá al estudiante como un adulto capaz trabajando en algo difícil. Cálido y directo, sin infantilizar.
- Sin cheerleading ni entusiasmo vacío: nada de "¡es facilísimo!" ni signos de exclamación gratuitos. Cuando algo es difícil, decilo: "esto le cuesta a la mayoría" enseña más que "¡cualquiera puede!".
- Sencillo sin perder rigor: lenguaje claro, terminología correcta, sin dejar detalles afuera. Es un apunte para estudiar.

# QUÉ EVITAR (anti-patrones)

- **Comentar en vez de enseñar.** Prohibidas las frases que solo tienen sentido con el texto original al lado: "como vimos", "según el apunte", "el texto menciona", "el ejemplo anterior" (refiriendo al material), "recordemos que". Si una frase remite a un material externo, reescribila explicando la idea completa.
- **Ejemplos sueltos** sin desarrollo paso a paso.
- **Visuales que sobreentregan:** la animación del mecanismo entero como primera exposición, o una visual por párrafo que no carga concepto.
- **Quices de reconocimiento:** preguntas cuya respuesta es literalmente una frase que aparece dos pantallas arriba.
- **Meta-contenido:** no incluyas frases, referencias o directivas de este pedido dentro del apunte. El apunte se redacta exclusivamente para el estudiante.

# PRIORIDAD ABSOLUTA

El apunte tiene que FUNCIONAR y renderizar de verdad. Un artefacto que corre y explica bien lo central vale más que uno gigantesco que se trunca o no abre. Si tenés que elegir, recortá amplitud periférica; nunca correctitud, ni profundidad de lo central, ni que renderice.

# CONTRATO TÉCNICO (cumplir SIN EXCEPCIÓN)

- **Formato de entrega:** un ÚNICO archivo TSX con "export default" del componente principal. Sin boilerplate de ReactDOM ni createRoot: lo maneja la plataforma.
- **Diseño responsivo:** debe verse bien en Desktop y en teléfono (9:16).
- **Estilos con Tailwind CSS v4:** clases de utilidad directamente en className (forma preferida). Estilos inline solo para valores dinámicos calculados en JS.
- **Librerías disponibles** — podés importar ÚNICAMENTE estas; cualquier otro import rechaza el apunte:
  - "react" — hooks (useState, useEffect, useRef, useMemo, useCallback, etc.)
  - "recharts" — gráficos de datos: LineChart, BarChart, AreaChart, PieChart, ScatterChart y sus componentes. Todo ResponsiveContainer necesita un padre con altura explícita, o el gráfico mide 0px.
  - "lucide-react" — íconos SVG: "import { Search, BookOpen, ChevronRight } from 'lucide-react'"
  - "framer-motion" — animaciones declarativas: motion.div, AnimatePresence, variants
  - "katex" — fórmulas LaTeX: usar "katex.renderToString('\\frac{a}{b}', { throwOnError: false })" con dangerouslySetInnerHTML (no existe componente <TeX>). El CSS de KaTeX ya está cargado: importá solo la librería.
  - "d3" — visualizaciones que recharts no cubre: grafos, árboles, fuerzas, heatmaps. "import * as d3 from 'd3'"
  - "mathjs" — cálculo: "import { evaluate, derivative, parse } from 'mathjs'". Ideal para sliders que recalculan fórmulas en vivo.
- **Fórmulas matemáticas siempre renderizadas con katex**, nunca texto plano tipo x^2.
- **Prohibido:** "import()" dinámico, "require()", y cargar scripts con document.createElement.

Devolveme un TSX que cumpla con todo esto a rajatabla.`

// ---------------------------------------------------------------------------
// RecursoRow — individual resource row in the list
// ---------------------------------------------------------------------------

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

function nombreFallbackHint(tipo: RecursoTipo | null): string | null {
  if (tipo === 'HTML') return 'Se mostrará como vista interactiva'
  if (tipo === 'DRIVE') return 'Se mostrará como “Archivo de Drive”'
  if (tipo === 'YOUTUBE') return 'Se mostrará como “Video de YouTube”'
  if (tipo === 'REPOSITORY') return 'Se mostrará como “Repositorio de GitHub”'
  if (tipo === 'OTHER') return 'Se mostrará como enlace externo con vista previa'
  return null
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

function ResourceKindSelector({
  kind,
  infoOpen,
  onInfoToggle,
  onKindChange,
}: {
  kind: RecursoDraftKind
  infoOpen: boolean
  onInfoToggle: () => void
  onKindChange: (kind: RecursoDraftKind) => void
}) {
  return (
    <div className="mb-2 flex items-center gap-1 rounded border border-white/8 bg-surface-0 p-1">
      <button
        type="button"
        onClick={() => onKindChange('LINK')}
        className={[
          'flex-1 cursor-pointer rounded px-2 py-1.5 text-xs font-semibold transition-colors',
          kind === 'LINK' ? 'bg-white/10 text-white' : 'text-white/45 hover:bg-white/5 hover:text-white/70',
        ].join(' ')}
      >
        Link
      </button>
      <button
        type="button"
        onClick={() => onKindChange('HTML')}
        className={[
          'flex-1 cursor-pointer rounded px-2 py-1.5 text-xs font-semibold transition-colors',
          kind === 'HTML' ? 'bg-white/10 text-white' : 'text-white/45 hover:bg-white/5 hover:text-white/70',
        ].join(' ')}
      >
        Apunte Interactivo
      </button>
      <button
        type="button"
        onClick={onInfoToggle}
        aria-label="¿Qué es este tipo de recurso?"
        aria-expanded={infoOpen}
        className={[
          'inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded transition-colors',
          infoOpen ? 'text-cyan-300' : 'text-white/40 hover:text-white/80',
        ].join(' ')}
      >
        <Info className="size-3.5" />
      </button>
    </div>
  )
}

function ResourceInfoPanel({
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

function ResourceInputControl({
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

function ResourceOrderActions({
  index,
  total,
  onMoveUp,
  onMoveDown,
}: {
  index: number
  total: number
  onMoveUp: (index: number) => void
  onMoveDown: (index: number) => void
}) {
  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => onMoveUp(index)}
        disabled={index === 0}
        title="Subir"
        className="inline-flex h-5 w-6 cursor-pointer items-center justify-center rounded-t border border-white/8 bg-surface-0 text-white/40 transition-colors enabled:hover:bg-white/5 enabled:hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
      >
        <ChevronUp className="size-3" />
      </button>
      <button
        type="button"
        onClick={() => onMoveDown(index)}
        disabled={index === total - 1}
        title="Bajar"
        className="inline-flex h-5 w-6 cursor-pointer items-center justify-center rounded-b border-x border-b border-white/8 bg-surface-0 text-white/40 transition-colors enabled:hover:bg-white/5 enabled:hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
      >
        <ChevronDown className="size-3" />
      </button>
    </div>
  )
}

function ResourceNameField({
  hint,
  name,
  showHint,
  onChange,
}: {
  hint: string | null
  name: string
  showHint: boolean
  onChange: (name: string) => void
}) {
  return (
    <div className="mt-2 space-y-1">
      <input
        type="text"
        aria-label="Nombre del recurso"
        value={name}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Nombre del recurso (opcional)"
        maxLength={120}
        className="w-full rounded border border-white/10 bg-surface-0 px-3 py-1.5 text-sm text-white placeholder:text-white/30 focus:border-white/20 focus:outline-none"
      />
      {showHint ? <p className="text-[11px] text-white/40">{hint}</p> : null}
    </div>
  )
}
