// ---------------------------------------------------------------------------
// Prompt copiable para generar apuntes interactivos con IA.
// Editá libremente este texto: es lo que se copia al tocar "Tocá acá".
// ---------------------------------------------------------------------------

export const HTML_PROMPT = `# OBJETIVO

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
