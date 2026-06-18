import type { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowRight, BookOpen, FileText, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ApunteSearchItem } from '@/lib/domain/apunte-search'
import { groupApunteSearchItems } from './ApunteSearchResults.utils'

const RESOURCE_TYPE_LABELS: Record<string, string> = {
  DRIVE: 'Drive',
  HTML: 'Interactivo',
  OTHER: 'Recurso',
  REPOSITORY: 'Repositorio',
  YOUTUBE: 'Video',
}

export type ApunteSearchStatus = 'initial' | 'too-short' | 'too-long' | 'results' | 'empty' | 'error'

export interface ApunteSearchViewModel {
  query: string
  status: ApunteSearchStatus
  items: ApunteSearchItem[]
}

export function ApunteSearchPanel({ model }: { model: ApunteSearchViewModel }) {
  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-0 lg:py-0">
      <div className="relative overflow-hidden rounded-[24px] border border-white/8 bg-[linear-gradient(135deg,rgba(255,255,255,0.07),rgba(255,255,255,0.025))] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.18)] sm:p-7">
        <div className="pointer-events-none absolute -right-20 -top-20 size-44 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-12 size-40 rounded-full bg-amber-300/8 blur-3xl" />
        <div className="relative space-y-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
              Apuntes
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
              Buscar material de estudio
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/58">
              Encontrá apuntes por tema, materia, año o tipo de material.
            </p>
          </div>

          <form action="/buscar" className="flex flex-col gap-3 sm:flex-row">
            <label className="sr-only" htmlFor="apunte-search-input">
              Buscar apuntes
            </label>
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-white/35" />
              <input
                id="apunte-search-input"
                name="q"
                type="search"
                defaultValue={model.query}
                placeholder="Ej: parcial, punteros, cálculo"
                className="h-12 w-full rounded-xl border border-white/10 bg-black/20 pl-10 pr-4 text-sm font-semibold text-white placeholder:text-white/32 focus:border-white/25 focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <button
              type="submit"
              className="inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-black text-white transition-colors hover:bg-primary-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Buscar
              <ArrowRight className="size-4" />
            </button>
          </form>
        </div>
      </div>

      <SearchBody model={model} />
    </section>
  )
}

function SearchBody({ model }: { model: ApunteSearchViewModel }) {
  if (model.status === 'initial') {
    return (
      <SearchStateCard
        icon={<Search className="size-5" />}
        title="Buscá por tema, materia o tipo de material."
        description="Probá con palabras como “parcial”, “punteros” o el nombre de una materia."
      />
    )
  }

  if (model.status === 'too-short') {
    return (
      <SearchStateCard
        icon={<Search className="size-5" />}
        title="Escribí al menos 2 caracteres."
        description="Con una palabra un poco más completa podemos encontrar mejores resultados."
      />
    )
  }

  if (model.status === 'too-long') {
    return (
      <SearchStateCard
        icon={<Search className="size-5" />}
        title="Probá con una búsqueda más corta."
        description="Usá una palabra o frase breve para encontrar el material más rápido."
      />
    )
  }

  if (model.status === 'error') {
    return (
      <SearchStateCard
        tone="danger"
        icon={<Search className="size-5" />}
        title="No pudimos buscar ahora. Probá de nuevo en unos segundos."
      />
    )
  }

  if (model.status === 'empty') {
    return (
      <SearchStateCard
        icon={<BookOpen className="size-5" />}
        title="No encontramos apuntes con esas palabras."
        description="Probá con una búsqueda más corta o con el nombre de la materia."
      />
    )
  }

  const groups = groupApunteSearchItems(model.items)

  return (
    <div className="space-y-5">
      <p className="px-1 text-sm font-semibold text-white/52">
        {model.items.length} {model.items.length === 1 ? 'resultado' : 'resultados'} para “{model.query}”
      </p>
      <div className="space-y-6">
        {groups.map((group) => (
          <section key={group.key} className="space-y-3">
            <div className="px-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">
                {group.yearName}
              </p>
              <h2 className="mt-1 text-lg font-black text-white">{group.subjectName}</h2>
            </div>
            <div className="grid gap-3">
              {group.items.map((item) => (
                <ApunteResultCard key={item.id} item={item} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

function ApunteResultCard({ item }: { item: ApunteSearchItem }) {
  const labels = buildMetaLabels(item)

  return (
    <Link
      href={item.href}
      className="group block cursor-pointer rounded-2xl border border-white/7 bg-surface-1/80 p-4 transition-all hover:border-white/14 hover:bg-[#202020] hover:shadow-[0_18px_50px_rgba(0,0,0,0.24)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:p-5"
    >
      <div className="flex items-start gap-4">
        <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/8 bg-white/[0.04] text-white/62 transition-colors group-hover:text-white">
          <FileText className="size-4.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-lg font-black leading-tight text-white sm:text-xl">
            {item.title}
          </span>
          {labels.length > 0 ? (
            <span className="mt-3 flex flex-wrap gap-2">
              {labels.map((label) => (
                <span
                  key={label}
                  className="rounded-full border border-white/8 bg-white/[0.035] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/48"
                >
                  {label}
                </span>
              ))}
            </span>
          ) : null}
          {item.excerpt ? (
            <span className="mt-3 block text-sm leading-6 text-white/56">
              {item.excerpt}
            </span>
          ) : null}
          <span className="mt-4 inline-flex items-center gap-2 text-sm font-black text-white/70 transition-colors group-hover:text-white">
            Abrir apunte
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </span>
      </div>
    </Link>
  )
}

function buildMetaLabels(item: ApunteSearchItem) {
  const resourceLabels = item.resourceTypes.map((type) => RESOURCE_TYPE_LABELS[type] ?? 'Recurso')
  return [...new Set([...item.categories, ...resourceLabels])].slice(0, 5)
}

function SearchStateCard({
  description,
  icon,
  title,
  tone = 'neutral',
}: {
  description?: string
  icon: ReactNode
  title: string
  tone?: 'neutral' | 'danger'
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-dashed p-5 sm:p-6',
        tone === 'danger'
          ? 'border-rose-400/25 bg-rose-500/8 text-rose-100'
          : 'border-white/10 bg-surface-1/55 text-white',
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-xl border',
            tone === 'danger'
              ? 'border-rose-300/20 bg-rose-400/10 text-rose-200'
              : 'border-white/8 bg-white/[0.04] text-white/58',
          )}
        >
          {icon}
        </span>
        <div>
          <h2 className="text-base font-black leading-snug">{title}</h2>
          {description ? (
            <p className="mt-2 text-sm leading-6 text-white/50">{description}</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
