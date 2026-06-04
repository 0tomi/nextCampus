  # Plan: refactor coherente de giant components

  ## Summary

  - React Doctor marca dos warnings reales de no-giant-component: src/app/page.tsx y src/app/[yearSlug]/
    page.tsx.

  - El problema principal no es sólo JSX largo: ambas páginas mezclan fetching, mapeos de datos, reglas
    de visibilidad, layouts desktop/mobile y wiring admin.

  - El refactor debe extraer adapters/helpers reutilizables y luego separar la presentación, sin cambiar
    slugs ni rutas.

  ## Key Changes

  - Crear helpers puros/server-safe:
      - src/lib/domain/home-page-adapters.ts: eventos del home, próximos eventos, apuntes visibles,
        visibilidad por preferencias, serialización de fechas.

      - src/lib/domain/year-page-adapters.ts: allYears, sidebar items, modal subjects, eventos del año,
        próximos eventos, datos mobile/admin.

      - src/lib/domain/event-adapters.ts: flatten/sort común por fecha + hora.

  - Refactor de YearPage siguiendo el patrón existente de materias:
      - src/app/[yearSlug]/page.tsx queda como route mínimo.
      - Agregar year-route-context.ts para fetching + shaping.
      - Agregar YearRoutePage.tsx / secciones internas para desktop, mobile y admin overlay.

  - Refactor de HomePage:
      - page.tsx queda con cookies + render condicional.
      - Extraer HomeEmptyState, HomeDesktop, HomeTopbarActions.
      - Mantener MobileHome como boundary client existente.

  - Reutilizar piezas existentes:
      - buildSubjectHref, GoogleDriveIcon, HomeGlobalCalendar.utils, HomeYearsGrid.utils, DashboardShell,
        Sidebar, MobileShell.

  - No abstraer todavía:
      - No unificar DashboardShell con MobileShell.
      - No crear un “EventCard universal”.
      - No mover admin overlays/modales.
      - No cambiar slugs ni shapes de rutas.

  ## Test Plan

  - Agregar Vitest para helpers:
      - sort/flatten de eventos.
      - próximos eventos desde todayKey.
      - visibilidad por preferencias y comisiones.
      - modalSubjects, allYears, sidebar items.
      - latestApuntes limita a 6 y serializa fechas.

  - Mantener/ajustar tests existentes de Home si cambia contrato.
  - Verificación final:
      - pnpm typecheck
      - pnpm test
      - npx react-doctor@latest --verbose --diff

  ## Assumptions

  - No se cambian slugs, URLs ni navegación pública.
  - El primer objetivo es eliminar los giant components sin cambiar comportamiento visual.
  - Cualquier mejora más profunda en MobileHome o MobileYear queda para una segunda pasada si React
    Doctor o duplicación lo justifican.
