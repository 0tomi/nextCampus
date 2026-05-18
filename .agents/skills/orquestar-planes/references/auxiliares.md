# Sub-Agentes Auxiliares: sdd-explore y sdd-archive

Cuando el orquestador delega a un implementador, puede ofrecerle como herramienta que **él mismo spawnee** sub-agentes auxiliares si los necesita. El orquestador sugiere disponibilidad; el implementador decide si los usa.

---

## sdd-explore — exploración acotada del repo

**Útil cuando** el implementador necesita entender código que no recibió en el contexto: mapear cómo funciona un módulo, encontrar el patrón existente para no inventar uno nuevo, ubicar dónde se valida algo.

**No conviene cuando** la fase es chica, el contexto alcanza, o explorar tomaría más que leer los archivos directos.

**Tip clave**: darle un objetivo verificable, no una tarea abierta.

| Mal | Bien |
|---|---|
| "Explorá el repo" | "Encontrá dónde se valida el formato del CUIT y devolveme rutas con líneas" |
| "Mirá cómo funciona auth" | "Listá los archivos en `src/auth/` con un resumen de 1-2 líneas cada uno" |

Si vuelve con más información de la pedida, el implementador descarta lo que no pidió. Lo que use lo cita en `Supuestos usados` al cerrar la fase.

---

## sdd-archive — documentación persistente de decisiones

**Útil cuando** la fase produjo una decisión arquitectónica no trivial, un patrón nuevo, o un workaround que merece quedar documentado en el repo.

**No conviene cuando** el cambio es obvio o ya está cubierto por convenciones existentes. Las decisiones del estado del plan van a Engram, no acá.

**Tip clave**: llegar con el contenido cerrado. sdd-archive persiste, no decide. El implementador tiene que pasarle: contexto, decisión, razones, alternativas descartadas, consecuencias.

---

## Diferencia con Engram

Engram persiste el estado del plan (vive durante el proyecto, lo escribe el orquestador). sdd-archive persiste decisiones técnicas en el repo (vive permanentemente, lo dispara el implementador). Pueden coexistir: Engram registra que la fase tomó la decisión X; sdd-archive deja la decisión X documentada en el código.

---

## Cómo sugerirlos en una delegación

Bloque sugerido para incluir cuando la fase pinta candidata:

```
Si durante esta fase necesitás:
  - Entender código que no te pasé en el contexto: podés spawnear sdd-explore.
    Dale una pregunta verificable, no una tarea abierta.
  - Documentar una decisión arquitectónica que tomes: podés spawnear sdd-archive.
    Llegá con la decisión cerrada — sdd-archive solo persiste.

Si los usás, mencionalo en tu reporte para que pueda registrarlo en Engram.
```

Omitir si la fase es trivial. No mencionarlos solo por completitud.
