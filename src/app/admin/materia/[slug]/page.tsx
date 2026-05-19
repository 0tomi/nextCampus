import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowLeft,
  CalendarDays,
  FileText,
  Shield,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { getAdminUser } from '@/lib/auth'
import { getAdminSubjectBySlug, getTiposEvento } from '@/lib/queries'
import { listQuizBanks } from '@/lib/storage'
import { DarkCard } from '@/components/ui/DarkCard'
import { formatDate } from '@/lib/utils'
import {
  createApunte,
  createEvento,
  deleteApunte,
  deleteEvento,
} from '@/app/admin/actions'
import { QuizBankManager } from './QuizBankManager'

export const dynamic = 'force-dynamic'

const FIELD_CLASSNAME =
  'block w-full rounded-none border border-white/5 bg-[#0a0a0a] px-3 py-2 text-sm text-white placeholder:text-white/28 focus:border-white/10 focus:outline-none'

const BUTTON_CLASSNAME =
  'inline-flex items-center gap-2 rounded-none border border-white/5 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10'

const DELETE_BUTTON_CLASSNAME =
  'inline-flex items-center gap-2 rounded-none border border-white/5 bg-white/5 px-3 py-2 text-sm font-semibold text-rose-200 transition-colors hover:bg-white/10'

export default async function AdminSubjectPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const admin = await getAdminUser()
  if (!admin) {
    return (
      <DarkCard className="p-6 text-white">
        <p className="font-semibold">No autorizado.</p>
      </DarkCard>
    )
  }

  const { slug } = await params
  const subject = await getAdminSubjectBySlug(slug)
  if (!subject || !subject.agenda) notFound()
  const tipos = await getTiposEvento()
  const agendaId = subject.agenda.id
  const bancos = await listQuizBanks(subject.year.slug, slug)

  return (
    <div className="space-y-8 text-white">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-sm font-semibold text-white/58 transition-colors hover:text-white/82"
        >
          <ArrowLeft className="h-4 w-4" />
          Panel
        </Link>

        <div className="inline-flex items-center gap-2 self-start border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white/74">
          <Shield className="h-4 w-4 text-violet-300" />
          {admin.email}
        </div>
      </div>

      <DarkCard className="p-6 sm:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/38">
          Edición de materia
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl">
          {subject.nombre}
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-white/62 sm:text-base">
          Gestioná agenda, apuntes y quiz desde una superficie clara para el
          equipo de administración.
        </p>
      </DarkCard>

      <div className="grid gap-4 md:grid-cols-3">
        <DarkCard className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/38">
                Eventos
              </p>
              <strong className="mt-3 block text-3xl font-black text-white">
                {subject.agenda.eventos.length}
              </strong>
            </div>
            <span className="inline-flex h-11 w-11 items-center justify-center border border-white/10 bg-white/5 text-white/78">
              <CalendarDays className="h-5 w-5" />
            </span>
          </div>
        </DarkCard>

        <DarkCard className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/38">
                Apuntes
              </p>
              <strong className="mt-3 block text-3xl font-black text-white">
                {subject.apuntes.length}
              </strong>
            </div>
            <span className="inline-flex h-11 w-11 items-center justify-center border border-white/10 bg-white/5 text-white/78">
              <FileText className="h-5 w-5" />
            </span>
          </div>
        </DarkCard>

        <DarkCard className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/38">
                Bancos de quiz
              </p>
              <strong className="mt-3 block text-3xl font-black text-white">
                {bancos.length}
              </strong>
            </div>
            <span className="inline-flex h-11 w-11 items-center justify-center border border-white/10 bg-white/5 text-white/78">
              <Sparkles className="h-5 w-5" />
            </span>
          </div>
        </DarkCard>
      </div>

      {/* Eventos */}
      <DarkCard className="space-y-5 p-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/38">
            Agenda
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-white">
            Calendario
          </h2>
        </div>
        <form action={createEvento} className="grid gap-3">
          <input type="hidden" name="agendaId" value={agendaId} />
          <input type="hidden" name="subjectSlug" value={slug} />
          <input
            name="titulo"
            placeholder="Título"
            required
            className={FIELD_CLASSNAME}
          />
          <select
            name="tipoEventoId"
            required
            className={FIELD_CLASSNAME}
          >
            {tipos.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
              </option>
            ))}
          </select>
          <input
            type="datetime-local"
            name="fecha"
            required
            className={FIELD_CLASSNAME}
          />
          <textarea
            name="descripcionHtml"
            placeholder="Descripción (HTML básico permitido)"
            className={`${FIELD_CLASSNAME} min-h-28`}
          />
          <button
            type="submit"
            className={BUTTON_CLASSNAME}
          >
            <CalendarDays className="h-4 w-4" />
            Crear evento
          </button>
        </form>
        <ul className="space-y-2">
          {subject.agenda.eventos.map((evento) => (
            <li
              key={evento.id}
              className="flex flex-col gap-3 border border-white/5 bg-surface-0 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="text-sm text-white/74">
                {formatDate(evento.fecha)} — {evento.titulo} (
                {evento.tipoEvento.nombre})
              </span>
              <form action={deleteEvento}>
                <input type="hidden" name="id" value={evento.id} />
                <input type="hidden" name="subjectSlug" value={slug} />
                <button
                  type="submit"
                  className={DELETE_BUTTON_CLASSNAME}
                >
                  <Trash2 className="h-4 w-4" />
                  Borrar
                </button>
              </form>
            </li>
          ))}
        </ul>
      </DarkCard>

      {/* Apuntes */}
      <DarkCard className="space-y-5 p-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/38">
            Recursos
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-white">
            Apuntes
          </h2>
        </div>
        <form action={createApunte} className="grid gap-3">
          <input type="hidden" name="subjectId" value={subject.id} />
          <input type="hidden" name="subjectSlug" value={slug} />
          <input
            name="titulo"
            placeholder="Título"
            required
            className={FIELD_CLASSNAME}
          />
          <textarea
            name="descripcionHtml"
            placeholder="Descripción / links (HTML básico)"
            className={`${FIELD_CLASSNAME} min-h-28`}
          />
          <input
            type="file"
            name="pdf"
            accept="application/pdf"
            className="block w-full rounded-none border border-white/5 bg-[#0a0a0a] px-3 py-2 text-sm text-white file:mr-4 file:rounded-none file:border-0 file:bg-white/5 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-white/10"
          />
          <button
            type="submit"
            className={BUTTON_CLASSNAME}
          >
            <FileText className="h-4 w-4" />
            Crear apunte
          </button>
        </form>
        <ul className="space-y-2">
          {subject.apuntes.map((apunte) => (
            <li
              key={apunte.id}
              className="flex flex-col gap-3 border border-white/5 bg-surface-0 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="text-sm text-white/74">{apunte.titulo}</span>
              <form action={deleteApunte}>
                <input type="hidden" name="id" value={apunte.id} />
                <input type="hidden" name="subjectSlug" value={slug} />
                <button
                  type="submit"
                  className={DELETE_BUTTON_CLASSNAME}
                >
                  <Trash2 className="h-4 w-4" />
                  Borrar
                </button>
              </form>
            </li>
          ))}
        </ul>
      </DarkCard>

      {/* Quiz */}
      <QuizBankManager subjectSlug={slug} bancos={bancos} />
    </div>
  )
}
