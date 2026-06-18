import 'server-only'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

export const APUNTE_SEARCH_LIMIT = 20
export const apunteSearchQuerySchema = z.object({
  q: z.string().trim().min(2).max(120),
})

export type ApunteSearchInput = z.infer<typeof apunteSearchQuerySchema>

export type ApunteSearchItem = {
  id: string
  title: string
  slug: string
  href: string
  excerpt: string | null
  categories: string[]
  resourceTypes: string[]
  subject: {
    name: string
    slug: string
  }
  year: {
    name: string
    slug: string
  }
}

type ApunteSearchRow = {
  id: string
  title: string
  slug: string
  excerpt: string | null
  categories: string[] | null
  resourceTypes: string[] | null
  subjectName: string
  subjectSlug: string
  yearName: string
  yearSlug: string
  rank: number
  updatedAt: Date
}

function normalizeStringArray(value: string[] | null): string[] {
  return Array.isArray(value) ? value.filter((item) => item.trim().length > 0) : []
}

export function buildApunteHref({
  apunteSlug,
  subjectSlug,
  yearSlug,
}: {
  apunteSlug: string
  subjectSlug: string
  yearSlug: string
}) {
  return `/${yearSlug}/${subjectSlug}/apuntes/${apunteSlug}`
}

export async function searchApuntes(input: ApunteSearchInput): Promise<ApunteSearchItem[]> {
  const rows = await prisma.$queryRaw<ApunteSearchRow[]>`
    WITH note_categories AS (
      SELECT
        ac."apunteId",
        array_agg(DISTINCT c.nombre ORDER BY c.nombre) AS categories,
        string_agg(DISTINCT c.nombre, ' ') AS category_text
      FROM "ApunteCategoria" ac
      JOIN "Categoria" c ON c.id = ac."categoriaId"
      GROUP BY ac."apunteId"
    ),
    note_resources AS (
      SELECT
        r."apunteId",
        array_agg(DISTINCT r.tipo::text ORDER BY r.tipo::text) AS resource_types,
        string_agg(DISTINCT coalesce(r.nombre, ''), ' ') AS resource_text
      FROM "ApunteRecurso" r
      GROUP BY r."apunteId"
    ),
    documents AS (
      SELECT
        a.id,
        a.titulo AS title,
        a.slug,
        a."updatedAt",
        s.nombre AS subject_name,
        s.slug AS subject_slug,
        y.nombre AS year_name,
        y.slug AS year_slug,
        coalesce(nc.categories, ARRAY[]::text[]) AS categories,
        coalesce(nr.resource_types, ARRAY[]::text[]) AS resource_types,
        nullif(
          trim(
            regexp_replace(
              regexp_replace(coalesce(a."descripcionHtml", ''), '<[^>]+>', ' ', 'g'),
              '\\s+',
              ' ',
              'g'
            )
          ),
          ''
        ) AS plain_description,
        setweight(to_tsvector('spanish', unaccent(coalesce(a.titulo, ''))), 'A')
          || setweight(to_tsvector('spanish', unaccent(coalesce(s.nombre, ''))), 'B')
          || setweight(to_tsvector('spanish', unaccent(coalesce(y.nombre, ''))), 'B')
          || setweight(
            to_tsvector(
              'spanish',
              unaccent(coalesce(nc.category_text, '') || ' ' || coalesce(nr.resource_text, ''))
            ),
            'B'
          )
          || setweight(
            to_tsvector(
              'spanish',
              unaccent(regexp_replace(coalesce(a."descripcionHtml", ''), '<[^>]+>', ' ', 'g'))
            ),
            'C'
          ) AS document
      FROM "Apunte" a
      JOIN "Subject" s ON s.id = a."subjectId"
      JOIN "AcademicYear" y ON y.id = s."yearId"
      LEFT JOIN note_categories nc ON nc."apunteId" = a.id
      LEFT JOIN note_resources nr ON nr."apunteId" = a.id
    ),
    query AS (
      SELECT websearch_to_tsquery('spanish', unaccent(${input.q})) AS value
    )
    SELECT
      d.id,
      d.title,
      d.slug,
      CASE
        WHEN d.plain_description IS NULL THEN NULL
        WHEN char_length(d.plain_description) <= 180 THEN d.plain_description
        ELSE left(d.plain_description, 177) || '...'
      END AS excerpt,
      d.categories,
      d.resource_types AS "resourceTypes",
      d.subject_name AS "subjectName",
      d.subject_slug AS "subjectSlug",
      d.year_name AS "yearName",
      d.year_slug AS "yearSlug",
      ts_rank(d.document, q.value) AS rank,
      d."updatedAt"
    FROM documents d
    CROSS JOIN query q
    WHERE d.document @@ q.value
    ORDER BY rank DESC, d."updatedAt" DESC, d.id DESC
    LIMIT ${APUNTE_SEARCH_LIMIT};
  `

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    href: buildApunteHref({
      apunteSlug: row.slug,
      subjectSlug: row.subjectSlug,
      yearSlug: row.yearSlug,
    }),
    excerpt: row.excerpt,
    categories: normalizeStringArray(row.categories),
    resourceTypes: normalizeStringArray(row.resourceTypes),
    subject: {
      name: row.subjectName,
      slug: row.subjectSlug,
    },
    year: {
      name: row.yearName,
      slug: row.yearSlug,
    },
  }))
}
