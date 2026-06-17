  # Plan simplificado — Quiz shuffle + Examen Ranked beta

  ## Summary

  - Mantener Math.random() y el Fisher-Yates actual: es suficiente para que cada intento sea distinto.
  - Agregar shuffle de respuestas sin seed, sin crypto y sin PRNG custom.
  - Agregar Examen Ranked · beta con el mínimo backend necesario para guardar ranking e invalidar intentos sospechosos.

  ## Key Changes

  - Shuffle
      - Mantener el shuffle actual de preguntas en buildSet.
      - Para ranked y examen/práctica, también mezclar opciones single y multiple antes de enviarlas al cliente.
      - Cambiar opciones públicas de string[] a opciones con { id, label }, donde id referencia la opción original. Así el server corrige bien aunque el orden visual cambie.
      - No usar seed, no persistir orden salvo en ranked si hace falta validar el intento.

  - Examen Ranked
      - Agregar modo ranked con badge beta.
      - El usuario elige un banco.
      - No puede elegir unidades ni cantidad.
      - Se toma el porcentaje ranked del banco y se redondea hacia abajo al múltiplo de 5 más cercano.
      - Ranked solo se habilita si la cantidad final da al menos 10 preguntas.
      - Cada intento vuelve a llamar al backend y recibe otro set random.

  - Nombre
      - Pedir nombre antes de iniciar ranked.
      - Guardar nombre válido en localStorage.
      - Validar en backend con normalización simple + lista/regex de insultos ofensivos en español.
      - Mensaje frontend user-friendly: “Elegí otro nombre para participar.”

  - Ranking y persistencia mínima
      - Crear una tabla simple de intentos ranked con: banco, materia, nombre, preguntas tomadas, estado válido/inválido, puntaje, porcentaje, duración y fecha.
      - Guardar intento al iniciar ranked.
      - Al finalizar, corregir solo contra las preguntas guardadas para ese intento.
      - Top: mejor intento válido por nombre, ordenado por mayor porcentaje, menor tiempo y fecha más reciente.

  - Anti-trampa simple
      - Al iniciar ranked, pedir fullscreen.
      - Si sale de fullscreen o la pestaña se oculta, marcar el intento como inválido.
      - El usuario puede seguir respondiendo y ver su resultado, pero no aparece en el top.
      - No usar SSE en v1: sería más complejo y no aporta lo suficiente.

  ## Test Plan

  - Verificar que dos intentos ranked suelen recibir sets/órdenes distintos.
  - Verificar que respuestas shuffleadas corrigen bien.
  - Verificar bloqueo ranked si el banco no alcanza mínimo 10 preguntas.
  - Verificar nombres válidos/ofensivos.
  - Verificar que intento invalidado no aparece en top.
  - Correr pnpm typecheck y tests relevantes.

  ## Assumptions

  - No se cambian slugs.
  - Math.random() queda como solución simple y suficiente.
  - No se implementa crypto/seed/SSE salvo que luego se necesite mayor robustez.
