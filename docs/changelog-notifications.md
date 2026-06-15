# Notificaciones de novedades

Las novedades que aparecen en la campana se crean con el comando interactivo:

```bash
pnpm changelog:notify
```

El comando pide estos datos:

- `Nombre de la notificación`: título visible de la novedad.
- `Descripción corta`: resumen breve que se muestra en la campana y en la página de novedades.
- `ID del changelog`: identificador estable de la novedad, por ejemplo `mejora-apuntes-junio-2026`.
- `Rol objetivo`: público al que va dirigida la novedad.

Roles válidos:

- `PUBLIC`: visible para todos los roles autenticados que consulten novedades.
- `AYUDANTE`: visible para ayudantes, supervisores y administradores.
- `SUPERVISOR`: visible para supervisores y administradores.
- `ADMIN`: visible solo para administradores.

El comando usa `DIRECT_URL` si está disponible. Si no existe, usa `DATABASE_URL`.

## Creación o actualización

El `ID del changelog` define si el comando crea una novedad nueva o actualiza una existente:

- Si el `ID del changelog` no existe, crea una nueva entrada en el changelog.
- Si el `ID del changelog` ya existe, actualiza esa entrada con el nuevo nombre, descripción, rol objetivo y fecha de visibilidad.

Esto evita duplicar novedades cuando necesitás corregir el texto o cambiar el público objetivo.

Ejemplo de carga:

```text
Nombre de la notificación: Nuevo panel de apuntes
Descripción corta: Mejoramos la forma de descubrir los últimos apuntes cargados.
ID del changelog: nuevo-panel-apuntes-2026-06
Rol objetivo (PUBLIC/AYUDANTE/SUPERVISOR/ADMIN): PUBLIC
```
