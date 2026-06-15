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

Si se vuelve a ejecutar con el mismo `ID del changelog`, actualiza la novedad existente en lugar de crear una duplicada.

Ejemplo de carga:

```text
Nombre de la notificación: Nuevo panel de apuntes
Descripción corta: Mejoramos la forma de descubrir los últimos apuntes cargados.
ID del changelog: nuevo-panel-apuntes-2026-06
Rol objetivo (PUBLIC/AYUDANTE/SUPERVISOR/ADMIN): PUBLIC
```
