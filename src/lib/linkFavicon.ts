// Resuelve el favicon de una URL usando el servicio de Google (el mismo que la
// app ya usa en las previsualizaciones de recursos). Así cada botón muestra el
// icono real del sitio sin tener que mantener un set de tipos hardcodeados.

export function faviconUrl(url: string): string | null {
  try {
    const { hostname } = new URL(url)
    if (!hostname) return null
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`
  } catch {
    return null
  }
}

// Etiqueta por defecto a partir de la URL cuando el usuario no escribe una.
export function hostnameLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}
