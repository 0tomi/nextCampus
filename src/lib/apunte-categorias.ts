import {
  extraerDriveFileId,
  type RecursoTipo,
} from './recursos'

export const APUNTE_CATEGORIAS = [
  'Otro',
  'Documento',
  'Herramienta',
  'Cuestionario',
  'Video',
  'Imágenes',
  'Pizarra',
  'Interactivo',
] as const

export type ApunteCategoriaNombre = (typeof APUNTE_CATEGORIAS)[number]

export interface CategoriaOption {
  id: string
  nombre: ApunteCategoriaNombre | string
}

export interface RecursoCategoriaInput {
  tipo: RecursoTipo | null
  url?: string | null
  nombre?: string | null
  fileName?: string | null
}

const DOCUMENT_EXTENSIONS = new Set([
  'pdf',
  'doc',
  'docx',
  'ppt',
  'pptx',
  'xls',
  'xlsx',
])

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'avif'])

function extensionFromText(value?: string | null): string | null {
  const normalized = value?.trim().toLowerCase() ?? ''
  const extension = normalized.match(/\.([a-z0-9]+)(?:\?|#)?$/)?.[1]
  return extension ?? null
}

function inferirCategoriaPorExtension(value?: string | null): ApunteCategoriaNombre | null {
  const extension = extensionFromText(value)
  if (!extension) return null
  if (DOCUMENT_EXTENSIONS.has(extension)) return 'Documento'
  if (IMAGE_EXTENSIONS.has(extension)) return 'Imágenes'
  return null
}

export function inferirCategoriasDeRecurso(
  recurso: RecursoCategoriaInput,
): ApunteCategoriaNombre[] {
  if (recurso.tipo === 'HTML') return ['Interactivo']
  if (recurso.tipo === 'YOUTUBE') return ['Video']

  if (recurso.tipo === 'DRIVE') {
    const parsed = recurso.url ? extraerDriveFileId(recurso.url) : null
    if (parsed && parsed.kind !== 'file') return ['Documento']

    const byName =
      inferirCategoriaPorExtension(recurso.nombre) ??
      inferirCategoriaPorExtension(recurso.fileName) ??
      inferirCategoriaPorExtension(recurso.url)
    return byName ? [byName] : []
  }

  return []
}

export function inferirCategoriasDeApunte(
  recursos: readonly RecursoCategoriaInput[],
): ApunteCategoriaNombre[] {
  const inferred = new Set<ApunteCategoriaNombre>()

  for (const recurso of recursos) {
    for (const categoria of inferirCategoriasDeRecurso(recurso)) {
      inferred.add(categoria)
    }
  }

  return inferred.size > 0 ? [...inferred] : ['Otro']
}

export function categoriaIdsFromNames(
  categorias: readonly CategoriaOption[],
  nombres: readonly string[],
): string[] {
  const wanted = new Set(nombres)
  return categorias
    .filter((categoria) => wanted.has(categoria.nombre))
    .map((categoria) => categoria.id)
}

export function categoriaNamesFromIds(
  categorias: readonly CategoriaOption[],
  ids: readonly string[],
): string[] {
  const selected = new Set(ids)
  return categorias
    .filter((categoria) => selected.has(categoria.id))
    .map((categoria) => categoria.nombre)
}
