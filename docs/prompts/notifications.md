Necesito implementar un sistema compuesto por dos grandes módulos en mi aplicación web (nextCampus): un **Sistema de Notificaciones con Changelog basado en roles** y un **Mecanismo de Badges para feeds de apuntes**.

No tenemos usuarios finales registrados (estudiantes), solo administradores del campus con distintos roles jerárquicos. La implementación debe respetar estrictamente nuestro diseño (`@DESIGN.md`).

A continuación, los requerimientos técnicos y de UX para cada sistema:

### 1. Sistema de Notificaciones y Changelog
El objetivo es comunicar nuevas funcionalidades (changelog) mediante notificaciones, filtradas según el rol del usuario.

*   **Jerarquía de Roles:** Los roles son inclusivos (`Admin` > `Supervisor` > `Ayudante`). Si una notificación va dirigida a "Ayudantes", la ven Ayudantes, Supervisores y Admins. Si va para "Supervisores", no la ven los Ayudantes. Si es una feature pública, la ven todos (incluso usuarios no logueados).
*   **Generación (CLI):** Las notificaciones *solo* las generan los administradores mediante un comando CLI desde el repositorio. El comando debe pedir: Nombre de la notificación, Descripción corta, ID del changelog (para enlazarlo) y Rol objetivo.
*   **UI/UX del Navbar:** Una campana en el navbar que muestra un *badge* (puntito naranja/rojo) si hay notificaciones sin leer. Al clickear, despliega un panel (dropdown en desktop, sheet en mobile) con las notificaciones recientes.
*   **Ruta del Changelog:** Se accederá desde `admin/changelog`. Muestra un feed de las entradas publicadas que correspondan al rol del usuario. Si se modifica una funcionalidad, su entrada en el changelog debe poder actualizarse para quedar arriba.
*   **Marcado como leído:** Al abrir el panel de notificaciones o pasar el mouse sobre una nueva en el changelog, esta pierde el estado de "no leída".
*   **Tutoriales (Carrusel):** Cada entrada del changelog puede tener un botón "Ver tutorial". Esto abrirá un Modal que renderiza un carrusel explicativo. La data de este carrusel debe venir de un JSON estandarizado almacenado en una carpeta específica, mapeado al ID del changelog, conteniendo pares de `[ruta de imagen, descripción del paso]`.

### 2. Sistema de Badges para Apuntes Nuevos
El objetivo es destacar (mediante un badge/puntito naranja) los apuntes que el usuario aún no ha visto en su feed. Dado que los estudiantes no tienen cuenta, el estado debe vivir puramente en el cliente.

*   **Arquitectura de Estado (LocalStorage):** Se utilizará el `localStorage` del navegador para guardar un array con los IDs de los apuntes ya vistos. Para evitar sobrecargar la memoria, este array debe limitarse a los últimos 100 apuntes (`if (seen.length > 100) seen.shift()`). Al renderizar el feed, cualquier ID de apunte que no esté en el `localStorage` recibe el badge de "NUEVO".
*   **Mobile UX (Intersection Observer):** NUNCA usar swipes para marcar como leído, ya que genera fricción innecesaria. Se debe implementar un `IntersectionObserver`. Cuando el apunte "nuevo" entra en el viewport y permanece visible de forma continua por **1 segundo**, se marca automáticamente como leído (se guarda el ID y desaparece el badge).
*   **Desktop UX (Hover):** Además del observer, para navegadores de escritorio se debe agregar un detector de *hover*. Si el usuario deja el cursor sobre el apunte por **0.8 segundos**, se marca como leído.

Por favor, analizá estos requerimientos y armá un plan de implementación detallando cómo estructurar la base de datos (para el changelog), cómo armar los componentes de React y la lógica del `IntersectionObserver`.
