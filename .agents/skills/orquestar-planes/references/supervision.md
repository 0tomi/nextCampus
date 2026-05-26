# Supervisión y Validación

El orquestador vigila activamente que cada fase quede bien hecha y que el plan completo sea coherente. La validación se ejecuta a dos niveles: por fase (con frecuencia ajustada a criticidad) y al final del plan (auditoría completa).

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

Excepciones que rompen el batch (volver a validación inmediata):

- El sub-agente reporta bloqueo o discrepancia.
- La fase siguiente es crítica.
- Sospecha de regresión.
- Una fase tarda mucho — validar lo que haya y no esperar al par.

Cuando valido en batch dos fases que comparten dominio, también reviso que no se hayan pisado entre sí.

---

## Qué verifico en cada validación

- ¿El entregable cumple el criterio de cierre que declaré?
- ¿Es coherente con el código existente y con lo que dicen las restricciones globales?
- ¿Los contratos compartidos siguen alineados con otras capas?
- ¿El sub-agente tuvo que inferir algo crítico? Si sí, eso es señal de que el contexto que pasé fue insuficiente — corregirlo en próximas delegaciones.

Decisión:

- **Aprobada** → registrar cierre, avanzar.
- **Aprobada con observaciones** → registrar cierre + deuda técnica, avanzar.
- **Rechazada** → re-delegar con feedback (ver abajo).
- **Bloqueada** → registrar bloqueo, escalar.

---

## Verificación independiente (opcional)

Para fases críticas o de mucho alcance, podés delegar la validación a un segundo sub-agente — el **verificador**. No es el default: consume tokens y en la mayoría de las fases tu revisión más el reporte del implementador alcanzan. Tratá esta herramienta como excepción, no como rutina.

**Cuándo conviene**

- Fase crítica que toca contratos, lógica sensible (pagos, auth, datos legales) o un patrón que se va a replicar.
- Fase grande con muchos archivos donde dudás de cubrir todo a ojo.
- El implementador admite desviaciones que querés contrastar antes de aceptarlas.
- Sospecha de regresión sutil que un vistazo rápido no detecta.

**Cuándo no**

- Fases estándar, localizadas, que seguís bien con una lectura.
- Fases que ya validaste vos sin dudas.
- Como code review genérico — el verificador chequea apego al plan, no opina sobre estilo o gustos.

**Qué le pasás al verificador**

- Ruta del archivo del plan + las mismas claves que recibió el implementador (`F2`, `R1`, `R3`…).
- El reporte completo que devolvió el implementador.
- Lista de archivos tocados (de "Archivos tocados" del reporte).
- Pregunta concreta y acotada: *"¿el entregable cumple el criterio de cierre declarado en `F2`, respeta los archivos en alcance, y honra las restricciones globales `R1, R3`? Si encontrás desvíos, listá archivo + qué desvía."*

**Qué te devuelve**

Confirmación corta o lista de desvíos concretos (archivo + qué desvía + por qué importa). **No re-implementa, no reescribe, no propone refactors** — solo verifica. Si arranca a sugerir cambios fuera de lo pedido, lo descartás.

**Qué hacés con el resultado**

- *Confirma sin desvíos* → cerrás la fase normal.
- *Encuentra desvíos menores* → los registrás como deuda en el cierre y avanzás.
- *Encuentra desvíos sustanciales* → re-delegás al implementador con feedback puntual, o los resolvés vos si son chicos.
- *Contradice al implementador* → revisás vos directo antes de decidir; el verificador puede equivocarse.

**Tope práctico**

A lo sumo una verificación independiente por plan mediano, dos o tres por plan grande. Si sentís que necesitás más, probablemente el plan está mal dimensionado o las fases están mal acotadas — replantear vale más que sumar verificadores.

---

## Re-delegación tras rechazo

1. **Registrar el rechazo en el archivo del plan** con motivo concreto antes de re-delegar. Esto deja huella si el contexto se compacta entre intentos: estado de la fase pasa a `rechazada` y se agrega un evento al `historial` con el motivo.

2. **Decidir el responsable**: ¿el sub-agente ejecutó mal o yo delegué mal? Cambia el approach del nuevo prompt y evita culpar al sub-agente cuando el problema es mío.

3. **Re-delegar pasando**:
   - Motivo del rechazo.
   - Qué corregir específicamente.
   - Qué del intento previo sí está bien (si aplica) — para que no rehaga lo correcto.

4. El resto de la delegación se mantiene igual.

**Límite**: tres rechazos sin éxito → marcar fase como `bloqueada` y escalar al humano con resumen de los intentos. No insistir indefinidamente.

---

## Estados zombie

Una fase queda zombie cuando está marcada `en_curso` en el archivo del plan pero no tiene bloque `cierre` correspondiente. Pasa por crashes, compactaciones, sesiones interrumpidas.

Detección al recuperar sesión: por cada fase en `en_curso`, verificar si existe su bloque `cierre`. Si no existe, es zombie.

Resolución:

- Si hay entregable parcial recuperable: validarlo, decidir si completar o re-delegar.
- Si no hay nada: marcar como `parcial`, re-delegar limpio mencionando que el intento previo no completó.

---

## Auditoría final

Cuando todas las fases reportan estado de cierre, **el plan no termina ahí**. Antes de cerrar, ejecutar una auditoría que verifica el conjunto.

**Cobertura del objetivo**
- ¿Todo lo que el plan se proponía está cubierto por alguna fase completada?
- ¿Hay objetivos parciales sin cubrir?

**Consistencia inter-fases**
- ¿Algún archivo fue tocado por fases que no debían interactuar?
- ¿Algún contrato compartido quedó modificado por una fase y no propagado a las que lo consumen?
- ¿La arquitectura final coincide con las restricciones globales declaradas?

**Desvíos**
- ¿Alguna fase introdujo cambios fuera de su alcance?
- ¿Hay supuestos contradictorios entre fases?

**Deuda acumulada**
- Listar lo que quedó pendiente, separar lo bloqueante de lo postergable.

Si la auditoría detecta **inconsistencias bloqueantes**, no se cierra el plan: se abre fase de remediación o se escala al humano.

Si la auditoría detecta deuda no bloqueante, el plan **tampoco** se cierra dejándola flotando — pasar a la sección siguiente.

---

## Resolución de deuda acumulada

La auditoría lista la deuda; el cierre la resuelve o la acepta con razón. Antes de marcar `completado`, decidís ítem por ítem:

- **Levantar ahora** — entra al cierre del plan.
- **Postergar con razón** — queda registrada en `auditoria.deuda` con justificación concreta de por qué se posterga (no "lo vemos después" genérico).
- **Bloqueante** — el plan no cierra hasta resolverla.

Cómo levantar la deuda que decidís resolver depende de volumen y criticidad:

- **Poca y acotada** (un par de ítems, mismo dominio, sin riesgo de tocar lo ya validado) → delegá una mini-fase de cleanup a un sub-agente. La lista de deuda es el contenido operativo; el criterio de cierre es "todos los ítems resueltos o marcados inviables con razón". Tratala como una fase más: validás el entregable al volver.

- **Crítica o voluminosa** (toca contratos sensibles, cruza dominios, son muchos ítems, o el riesgo de regresión es alto) → la encarás vos como orquestador. La razón es práctica: coordinar sub-agentes para levantar deuda crítica cuesta más que resolverla con contexto completo en la mano, y tu atención vale más que la velocidad cuando lo crítico está en juego.

- **Tan grande que es su propio plan** (varias fases, múltiples dominios, supera el alcance original) → no la fuerces dentro del cierre. Cerrá el plan actual como `parcial` con la deuda documentada en `auditoria.deuda` y arrancá un plan nuevo para resolverla. Forzar un cleanup grande dentro del cierre rompe la trazabilidad y desdibuja el alcance del plan original.

Tras resolver la deuda que decidiste levantar, registrar en `auditoria` qué se resolvió y qué quedó postergado. **Recién ahí** el orquestador rellena el bloque `auditoria`, pasa `estado_global.estado` a `completado` y agrega el evento `plan_cerrado` al `historial`.

Si la deuda se resolvió delegando un cleanup, también registrar la mini-fase en `historial` (evento `cleanup_deuda` con resumen de qué se levantó) para mantener traza.

---

## Dry-run (opcional)

Para planes complejos o sensibles, generar el preview completo de delegaciones planeadas (sub-agente, criticidad, archivos, criterio de cierre por cada fase) y presentarlo al humano antes de delegar la primera. Si el humano ajusta algo, actualizar las entradas de fase en el archivo del plan antes de empezar.

No es obligatorio. Útil cuando el costo de equivocarse es alto.
