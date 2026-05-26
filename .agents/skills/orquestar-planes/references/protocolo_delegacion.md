# Protocolo de Delegación

Una delegación efectiva pasa al sub-agente lo necesario para ejecutar bien sin tener que adivinar nada esencial. Sobra el resto.

---

## Lo que sí debe llevar la delegación

1. **Sub-agente objetivo** — backend / frontend / datos / infra / qa.
2. **Qué hacer** — el contenido operativo de la fase, no solo el nombre. Tiene que poder ejecutarse leyendo solo este mensaje (con el archivo del plan como respaldo).
3. **Archivos en alcance** — qué puede tocar y qué está fuera de alcance, con razón breve cuando importe.
4. **Criterio de cierre** — condición verificable que marca la fase como terminada.
5. **Criticidad** — crítica o estándar. Le dice al sub-agente qué nivel de rigor se va a aplicar al revisarlo.
6. **Ruta al archivo de plan + claves a consultar** (si aplica) — la ruta exacta del YAML (ej: `docs/plans/refactor-auth.yaml`) y las claves concretas que el sub-agente tiene que leer: la fase actual (`F2`) y las restricciones globales que aplican (`R1`, `R3`). Claves reales, no placeholders: no mandar `F{N}` literal.
7. **Skills sugeridas** (si aplica) — las que el plan original ya nombre para esta fase, o las que conozcas del entorno y apliquen a la tarea. Con razón concreta. Si nada aplica, omitir la sección. Ver el bloque abajo.
8. **Sub-agentes auxiliares disponibles** (si aplica) — sdd-explore / sdd-archive cuando la fase los puede aprovechar. Ver `auxiliares.md`.
9. **Si es re-delegación tras rechazo**: motivo del rechazo previo, qué corregir, qué del intento anterior sí está bien.

Lo que **no** hace falta agregar: prohibiciones obvias ("no rompas el repo"), restricciones administrativas que limitan al sub-agente sin necesidad ("no consultes otras entradas del archivo"), ni listas de cosas que el sub-agente claramente entiende solo.

---

## Bloque sugerido para acceso al archivo de plan

```
Antes de empezar, leé estas entradas del archivo del plan
<RUTA_REAL_DEL_ARCHIVO>:
  - <CLAVE_DE_ESTA_FASE> (esta fase)
  - <CLAVES_DE_RESTRICCIONES> (restricciones globales que aplican)

Este mensaje es un extracto. El archivo es la fuente completa.
Si lo que leés en el archivo contradice este mensaje, reportá la
discrepancia antes de seguir. Podés consultar otras entradas si te
ayudan; no edites el archivo, eso lo hago yo al cerrar tu fase.

Si por cualquier razón te desviás del alcance, supuestos o criterio
de cierre — porque hizo falta para destrabar algo, porque el plan no
lo cubría, o porque tomaste un atajo — marcalo explícito en el campo
"Apego al plan" de tu reporte. Lo mismo con deuda que dejes (TODOs,
tests pendientes, refactors postergados): listala. La desviación
reportada se incorpora a la validación; la oculta degrada el plan.
```

Ejemplo de bloque preparado correctamente: ruta `docs/plans/refactor-auth.yaml`, claves `F2` y `R1, R3`. No dejar placeholders literales como `<CLAVE_DE_ESTA_FASE>`.

---

## Bloque sugerido para skills

Dos caminos según de dónde vengan:

**Caso A — el plan ya trae skills sugeridas para la fase.** Transcribirlas con su razón a la delegación. El planificador ya hizo el trabajo de evaluar fit; no lo segundo-adivinés salvo que sospeches que la skill ya no existe o no aplica más al contexto real del repo.

**Caso B — el plan no las trae.** Antes de empezar a delegar, dale una mirada a las skills disponibles del entorno (lo que el cliente exponga, o lo que viva en `.claude/skills/`, `.agents/skills/`, etc.). Una lectura rápida de nombres y descripciones alcanza. Después, por cada fase, preguntate si alguna calza con el trabajo a delegar. Si no encontrás nada que aplique de verdad, omití la sección en esa delegación.

Formato cuando incluís el bloque:

```
Skills aplicables a esta fase:
  - {nombre}: {por qué aplica acá}
  - {nombre}: {por qué aplica acá}
```

Omitir el bloque entero si no hay skills que apliquen. No inventar. No sumar skills "por las dudas" — el sub-agente lee la lista como una sugerencia legítima del orquestador, y un nombre sin valor es ruido que inunda su contexto.

Si la fase es de frontend y existe `DESIGN.md` en el repo:

```
Antes de implementar componentes, leé DESIGN.md. Mantené la paleta,
tipografía y patrones definidos ahí. Si necesitás algo que no cubre,
reportalo en lugar de improvisar.
```

---

## Formato de respuesta esperado del sub-agente

```
Cambios realizados: ...
Archivos tocados: ...
Supuestos usados: ...
Apego al plan: completo | con desviaciones — qué se desvió y por qué
Deuda dejada: ninguna | ... (lista breve, marcar si algo es bloqueante)
Bloqueos / inconsistencias: ninguno | ...
Suficiencia de contexto: sí | no — qué faltó
Notas para el siguiente agente: ...
```

Si el sub-agente reporta "contexto insuficiente", el problema fue de delegación, no de ejecución. El orquestador re-delega ampliando el contexto, no penaliza al sub-agente.

**Norma sobre desviaciones**: el sub-agente reporta lo que pasó tal como pasó. Si se salió del alcance, modificó algo no previsto, dejó algo a medias, o tomó un atajo, lo dice. Una desviación reportada cuesta poco — el orquestador la incorpora a la validación o la registra como deuda. Una desviación oculta se descubre tarde y degrada el plan. Este principio se transmite en el cuerpo de la delegación, no se asume.

**Norma sobre deuda**: si la fase dejó deuda técnica (TODOs, atajos, tests faltantes, refactors pospuestos), se lista explícita acá. El orquestador la agrega al bloque `cierre.deuda` del archivo y la considera al cerrar el plan.

---

## Dominios

- **Backend**: lógica de servidor, contratos de API, validaciones, jobs.
- **Frontend**: UI, estado cliente, formularios. Si existe `DESIGN.md`, manda.
- **Datos**: migraciones, esquemas, índices, seeds.
- **Infra**: deploy, pipelines, configuración, observabilidad.
- **QA**: tests unitarios, integración, e2e, cobertura.

Una fase mezcla dominios solo cuando hay buena razón. Por defecto, una fase = un dominio. Si una fase del plan original mezcla, dividila antes de delegar.

---

## Re-delegación

Tras un rechazo:

1. Registrar el rechazo en el archivo del plan con motivo concreto (estado de la fase a `rechazada` y evento en `historial`).
2. Decidir si la falla fue de ejecución o de delegación insuficiente.
3. Re-delegar con: motivo del rechazo, qué corregir, qué del intento previo está bien (si aplica).

Tres rechazos sin éxito → marcar fase como `bloqueada` y escalar al humano con resumen de los intentos.
