# Supervisión y Validación

El orquestador vigila activamente que cada fase quede bien hecha y que el plan completo sea coherente. La validación se ejecuta a dos niveles: por fase (con frecuencia ajustada a criticidad) y al final del plan (auditoría completa). Nada llega al historial de Git sin pasar por acá: el commit es la consecuencia de aprobar, nunca un trámite previo.

---

## Criticidad de una fase

**Crítica** cuando alguna de estas aplica:

- Toca contratos compartidos entre capas (schema de API, eventos).
- Modifica esquema de base de datos con datos productivos.
- Implementa lógica sensible: pagos, autenticación, autorización, datos legales.
- Bloquea muchas fases siguientes.
- Introduce un patrón nuevo que se va a replicar.

**Estándar** cuando es localizada, sigue patrones existentes, o tiene impacto acotado.

Ante la duda, marcar como crítica. Validar de más es barato; no validar una crítica puede propagarse.

---

## Modo de validación

| Criticidad | Cuándo valido |
|---|---|
| Crítica | Inmediatamente, antes de delegar la siguiente fase |
| Estándar | Puedo agrupar hasta 2 entregables y validar juntos |

El batch de 2 estándar solo es posible si las fases se delegaron en paralelo con **alcances de archivos disjuntos** (condición para paralelizar — ver `registro_git.md`). Los cierres se commitean igual de a uno.

Excepciones que rompen el batch (volver a validación inmediata):

- El sub-agente reporta bloqueo, desviación o discrepancia.
- La fase siguiente es crítica.
- Sospecha de regresión.
- Una fase tarda mucho — validar lo que haya y no esperar al par.

Cuando valido en batch dos fases que comparten dominio, también reviso que no se hayan pisado entre sí.

---

## Qué verifico en cada validación

La validación cruza tres fuentes: el criterio de cierre del plan, el reporte del sub-agente, y **el diff real del worktree**. El reporte se contrasta, no se cree a ciegas.

- ¿El entregable cumple el criterio de cierre que declaré?
- ¿`git status` coincide con "Archivos tocados" del reporte? Un archivo modificado que el reporte no menciona es una desviación oculta — investigar antes de decidir.
- ¿Todo lo tocado cae dentro del alcance declarado? Lo que quedó fuera del alcance, ¿fue declarado y justificado?
- ¿Es coherente con el código existente y con las restricciones globales?
- ¿Los contratos compartidos siguen alineados con otras capas?
- ¿Aplicó las skills indicadas en la delegación, o la justificación para no seguirlas es sólida? Justificación floja = desviación.
- ¿El sub-agente tuvo que inferir algo crítico? Si sí, el contexto que pasé fue insuficiente — corregirlo en próximas delegaciones.

Decisión:

- **Aprobada** → commit de cierre (`Estado: completada`), avanzar.
- **Aprobada con deuda estructural justificada** → commit de cierre (`Estado: parcial`) con la deuda y su razón en el mensaje. Excepción, no rutina — ver política de deuda.
- **Rechazada** → re-delegar con feedback (ver abajo). Sin commit.
- **Bloqueada** → escalar al humano. Sin commit.

---

## Política de desviaciones

La instrucción base de toda delegación es **apego estricto al plan**. Una desviación no es gratis por venir reportada: se evalúa.

- **Reportada con justificación sólida** (destrababa la fase, el plan no cubría el caso, no había alternativa dentro del alcance) → se acepta y queda registrada en `Apego al plan` del commit, con la justificación. Si toca a fases siguientes, propagar la nota.
- **Reportada con justificación floja o sin justificación** ("me pareció mejor", "aproveché a refactorizar") → rechazo. La re-delegación pide deshacer la desviación o justificarla en serio.
- **Oculta** (aparece en el diff, no en el reporte) → rechazo directo, y el resto del reporte pierde credibilidad: validar esa fase con lupa o con verificador independiente.

La jerarquía se mantiene: oculta es peor que reportada. Pero reportada ya no equivale a aceptada.

---

## Política de deuda: se resuelve en la fase

La deuda no se acumula para el final — se corta donde nace.

- **Deuda evitable** (TODOs resolubles ahora, tests que faltan, atajos sin razón): la fase **no se aprueba**. Re-delegar con la lista concreta de ítems a resolver. Esto no es un rechazo por mala ejecución sino un cierre incompleto; el feedback lo dice así.
- **Deuda estructural justificada** (depende de una fase posterior, excede el alcance definido del plan, requiere decisión del humano): se acepta, la fase cierra como `parcial` y la deuda queda en el mensaje del commit con su razón. La auditoría final la retoma.

`parcial` es excepción justificada, no estado rutinario. Si la mitad de las fases cierran parciales, el plan estaba mal dimensionado — replantearlo con el usuario vale más que seguir arrastrando.

---

## Verificación independiente (opcional)

Para fases críticas o de mucho alcance, se puede delegar la validación a un segundo sub-agente — el **verificador**. No es el default: consume tokens y en la mayoría de las fases tu revisión más el reporte del implementador alcanzan. Excepción, no rutina.

**Cuándo conviene**

- Fase crítica que toca contratos, lógica sensible o un patrón que se va a replicar.
- Fase grande con muchos archivos donde dudás de cubrir todo a ojo.
- El implementador admite desviaciones que querés contrastar antes de aceptarlas.
- Se detectó una desviación oculta y el resto del entregable quedó bajo sospecha.

**Cuándo no**

- Fases estándar, localizadas, que seguís bien con una lectura.
- Fases que ya validaste vos sin dudas.
- Como code review genérico — el verificador chequea apego al plan, no opina sobre estilo.

**Qué le pasás**

- El contenido de la fase y las restricciones que aplican (los mismos que recibió el implementador).
- El reporte completo del implementador.
- El diff a revisar (`git diff` del worktree, o la lista de archivos tocados).
- Pregunta concreta y acotada: *"¿el entregable cumple el criterio de cierre declarado, respeta el alcance de archivos, y honra las restricciones? Si encontrás desvíos, listá archivo + qué desvía."*

**Qué te devuelve**

Confirmación corta o lista de desvíos concretos (archivo + qué desvía + por qué importa). **No re-implementa, no reescribe, no propone refactors** — solo verifica. Si arranca a sugerir cambios fuera de lo pedido, lo descartás.

**Qué hacés con el resultado**

- *Confirma sin desvíos* → commit de cierre normal.
- *Desvíos menores con justificación válida* → constan en el commit, avanzás.
- *Desvíos sustanciales* → re-delegás al implementador con feedback puntual, o los resolvés vos si son chicos.
- *Contradice al implementador* → revisás vos directo antes de decidir; el verificador puede equivocarse.

**Tope práctico**

A lo sumo una verificación independiente por plan mediano, dos o tres por plan grande. Si sentís que necesitás más, el plan está mal dimensionado o las fases mal acotadas — replantear vale más que sumar verificadores.

---

## Re-delegación tras rechazo

1. **Anotar el motivo del rechazo** (en el contexto de trabajo del orquestador): va a terminar como línea de `Intentos` en el commit de cierre eventual de la fase, así la traza queda en el historial sin commits intermedios.

2. **Decidir el responsable**: ¿el sub-agente ejecutó mal o yo delegué mal? Cambia el approach del nuevo prompt y evita culpar al sub-agente cuando el problema es mío (contexto insuficiente, alcance ambiguo, skill que no correspondía).

3. **Decidir qué hacer con el worktree**: si el intento previo tiene partes rescatables, se conservan y la re-delegación las nombra como base; si está todo mal, limpiar antes de re-delegar (`git checkout -- <alcance>`) para que el nuevo intento arranque de cero real.

4. **Re-delegar pasando**: motivo del rechazo, qué corregir específicamente, qué del intento previo sí está bien (si aplica). El resto de la delegación — contrato incluido — se mantiene igual.

**Límite**: tres rechazos sin éxito → escalar al humano con resumen de los intentos y motivos. Sin commit: la fase bloqueada no llega al historial. No insistir indefinidamente.

---

## Fases zombie

Una fase queda zombie cuando fue delegada, el worktree tiene cambios, pero no existe commit de cierre — típicamente por crash, compactación o sesión interrumpida entre la delegación y la validación.

Detección al recuperar sesión: la próxima fase según el historial figura como no cerrada, pero `git status` muestra un worktree sucio con archivos dentro de su alcance.

Resolución:

- Si el trabajo parcial es evaluable: validarlo como un entregable más (sin reporte, con más cuidado — el diff es la única fuente). Completo → commitear cierre anotando la situación en el mensaje. Incompleto pero rescatable → re-delegar nombrando lo hecho como base.
- Si no se puede evaluar con confianza: limpiar el alcance y re-delegar de cero, mencionando que hubo un intento previo que no completó.

---

## Auditoría final

Cuando todas las fases tienen commit de cierre, **el plan no termina ahí**. Antes de cerrar, auditar el conjunto:

**Cobertura del objetivo**
- ¿Todo lo que el plan se proponía está cubierto por alguna fase cerrada?
- ¿Hay objetivos parciales sin cubrir?

**Consistencia inter-fases**
- ¿Algún archivo fue tocado por fases que no debían interactuar? (`git log --stat` de la rama lo muestra rápido.)
- ¿Algún contrato compartido quedó modificado por una fase y no propagado a las que lo consumen?
- ¿La arquitectura final coincide con las restricciones globales del plan?

**Desvíos**
- Revisar los `Apego al plan` de los commits: ¿las desviaciones aceptadas, en conjunto, siguen siendo coherentes entre sí?

**Deuda residual**
- Recolectar los `Deuda` de los commits `parcial`. Separar bloqueante de postergable.

Resultado según lo que encuentre:

- **Inconsistencias bloqueantes** → el plan no cierra: fase de remediación o escalar al humano.
- **Correcciones concretas a hacer** (deuda a levantar, inconsistencias resolubles) → pasar a resolución de deuda; ese trabajo genera su propio commit de cleanup.
- **Nada que corregir** → **no hay commit de auditoría**: el resultado (cobertura, consistencia, deuda postergada con razón) se reporta al usuario en la conversación y el plan queda cerrado, listo para que el humano decida el merge de la rama.

---

## Resolución de deuda residual

Con la política por fase, lo que llega acá es solo deuda estructural que dependía de fases posteriores o excedía alcances. Decidir ítem por ítem:

- **Levantar ahora** — se resuelve antes de cerrar el plan.
- **Postergar con razón** — queda en el reporte final al usuario con justificación concreta (no "lo vemos después" genérico).
- **Bloqueante** — el plan no cierra hasta resolverla.

Cómo levantar lo que se decide resolver, según volumen y criticidad:

- **Poca y acotada** (un par de ítems, mismo dominio, sin riesgo de tocar lo validado) → delegar una mini-fase de cleanup. La lista de deuda es el contenido operativo; el criterio de cierre es "todos los ítems resueltos o marcados inviables con razón". Se valida y commitea como una fase más (`Fase: cleanup`).
- **Crítica o voluminosa** (contratos sensibles, cruza dominios, riesgo de regresión alto) → la encara el orquestador directo: coordinar sub-agentes para deuda crítica cuesta más que resolverla con contexto completo en la mano. El resultado igual se commitea como cleanup.
- **Tan grande que es su propio plan** → no forzarla dentro del cierre. Cerrar este plan reportando la deuda documentada y proponer al usuario un plan nuevo (con su propia rama) para resolverla.

---

## Dry-run (opcional)

Para planes complejos o sensibles, generar el preview completo de delegaciones planeadas (sub-agente, criticidad, alcance, skills mapeadas, criterio de cierre por fase) y presentarlo al humano antes de crear la rama y delegar la primera. Si el humano ajusta algo, esos ajustes van directo a las delegaciones (el archivo de plan es del usuario; si quiere, los anota él ahí).

No es obligatorio. Útil cuando el costo de equivocarse es alto.
