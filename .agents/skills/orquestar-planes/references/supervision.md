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

## Re-delegación tras rechazo

1. **Registrar el rechazo en Engram** con motivo concreto antes de re-delegar. Esto deja huella si el contexto se compacta entre intentos.

2. **Decidir el responsable**: ¿el sub-agente ejecutó mal o yo delegué mal? Cambia el approach del nuevo prompt y evita culpar al sub-agente cuando el problema es mío.

3. **Re-delegar pasando**:
   - Motivo del rechazo.
   - Qué corregir específicamente.
   - Qué del intento previo sí está bien (si aplica) — para que no rehaga lo correcto.

4. El resto de la delegación se mantiene igual.

**Límite**: tres rechazos sin éxito → marcar fase como `bloqueada` y escalar al humano con resumen de los intentos. No insistir indefinidamente.

---

## Estados zombie

Una fase queda zombie cuando está marcada `en_curso` en Engram pero no tiene observación de cierre correspondiente. Pasa por crashes, compactaciones, sesiones interrumpidas.

Detección al recuperar sesión: por cada fase en `en_curso`, buscar su observación de cierre. Si no existe, es zombie.

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

Solo cuando la auditoría confirma cobertura + consistencia, el orquestador escribe el cierre y llama `mem_session_summary` + `mem_session_end`.

---

## Dry-run (opcional)

Para planes complejos o sensibles, generar el preview completo de delegaciones planeadas (sub-agente, criticidad, archivos, criterio de cierre por cada fase) y presentarlo al humano antes de delegar la primera. Si el humano ajusta algo, actualizar las observaciones de fase en Engram antes de empezar.

No es obligatorio. Útil cuando el costo de equivocarse es alto.
