import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAdminUser } from '@/lib/auth'
import { getAdminSubjectBySlug, getTiposEvento } from '@/lib/queries'
import { ConstructivistCard } from '@/components/shared/ConstructivistCard'
import { formatDate } from '@/lib/utils'
import {
  createApunte,
  createEvento,
  createPregunta,
  createQuizUnidad,
  deleteApunte,
  deleteEvento,
} from '@/app/admin/actions'

export const dynamic = 'force-dynamic'

export default async function AdminSubjectPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const admin = await getAdminUser()
  if (!admin) {
    return (
      <ConstructivistCard>
        <p className="font-semibold">No autorizado.</p>
      </ConstructivistCard>
    )
  }

  const { slug } = await params
  const subject = await getAdminSubjectBySlug(slug)
  if (!subject || !subject.agenda) notFound()
  const tipos = await getTiposEvento()
  const agendaId = subject.agenda.id

  return (
    <div className="space-y-8">
      <Link href="/admin" className="text-sm text-accent hover:underline">
        ← Panel
      </Link>
      <h1 className="font-display text-3xl font-extrabold">
        {subject.nombre}
      </h1>

      {/* Eventos */}
      <ConstructivistCard className="space-y-4">
        <h2 className="font-display text-2xl font-bold">Calendario</h2>
        <form action={createEvento} className="space-y-2">
          <input type="hidden" name="agendaId" value={agendaId} />
          <input type="hidden" name="subjectSlug" value={slug} />
          <input
            name="titulo"
            placeholder="Título"
            required
            className="block w-full border-2 border-ink px-2 py-1"
          />
          <select
            name="tipoEventoId"
            required
            className="block w-full border-2 border-ink px-2 py-1"
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
            className="block w-full border-2 border-ink px-2 py-1"
          />
          <textarea
            name="descripcionHtml"
            placeholder="Descripción (HTML básico permitido)"
            className="block w-full border-2 border-ink px-2 py-1"
          />
          <button
            type="submit"
            className="border-4 border-ink bg-primary px-4 py-2 font-bold text-paper shadow-hard-sm"
          >
            Crear evento
          </button>
        </form>
        <ul className="space-y-2">
          {subject.agenda.eventos.map((evento) => (
            <li
              key={evento.id}
              className="flex items-center justify-between border-2 border-ink px-3 py-2"
            >
              <span className="text-sm">
                {formatDate(evento.fecha)} — {evento.titulo} (
                {evento.tipoEvento.nombre})
              </span>
              <form action={deleteEvento}>
                <input type="hidden" name="id" value={evento.id} />
                <input type="hidden" name="subjectSlug" value={slug} />
                <button
                  type="submit"
                  className="text-sm font-bold text-primary"
                >
                  Borrar
                </button>
              </form>
            </li>
          ))}
        </ul>
      </ConstructivistCard>

      {/* Apuntes */}
      <ConstructivistCard className="space-y-4">
        <h2 className="font-display text-2xl font-bold">Apuntes</h2>
        <form action={createApunte} className="space-y-2">
          <input type="hidden" name="subjectId" value={subject.id} />
          <input type="hidden" name="subjectSlug" value={slug} />
          <input
            name="titulo"
            placeholder="Título"
            required
            className="block w-full border-2 border-ink px-2 py-1"
          />
          <textarea
            name="descripcionHtml"
            placeholder="Descripción / links (HTML básico)"
            className="block w-full border-2 border-ink px-2 py-1"
          />
          <input
            type="file"
            name="pdf"
            accept="application/pdf"
            className="block w-full text-sm"
          />
          <button
            type="submit"
            className="border-4 border-ink bg-primary px-4 py-2 font-bold text-paper shadow-hard-sm"
          >
            Crear apunte
          </button>
        </form>
        <ul className="space-y-2">
          {subject.apuntes.map((apunte) => (
            <li
              key={apunte.id}
              className="flex items-center justify-between border-2 border-ink px-3 py-2"
            >
              <span className="text-sm">{apunte.titulo}</span>
              <form action={deleteApunte}>
                <input type="hidden" name="id" value={apunte.id} />
                <input type="hidden" name="subjectSlug" value={slug} />
                <button
                  type="submit"
                  className="text-sm font-bold text-primary"
                >
                  Borrar
                </button>
              </form>
            </li>
          ))}
        </ul>
      </ConstructivistCard>

      {/* Quiz */}
      <ConstructivistCard className="space-y-4">
        <h2 className="font-display text-2xl font-bold">Quiz</h2>
        <form action={createQuizUnidad} className="space-y-2">
          <input type="hidden" name="subjectId" value={subject.id} />
          <input type="hidden" name="subjectSlug" value={slug} />
          <input
            name="titulo"
            placeholder="Título de la unidad"
            required
            className="block w-full border-2 border-ink px-2 py-1"
          />
          <input
            type="number"
            name="orden"
            placeholder="Orden"
            defaultValue={0}
            className="block w-32 border-2 border-ink px-2 py-1"
          />
          <button
            type="submit"
            className="border-4 border-ink bg-accent px-4 py-2 font-bold text-paper shadow-hard-sm"
          >
            Crear unidad
          </button>
        </form>

        {subject.quizUnidades.map((unidad) => (
          <div key={unidad.id} className="border-2 border-ink p-3">
            <p className="font-bold">
              {unidad.titulo} — {unidad._count.preguntas} preguntas
            </p>
            <form
              action={createPregunta}
              className="mt-2 space-y-2 border-t border-ink/30 pt-2"
            >
              <input
                type="hidden"
                name="quizUnidadId"
                value={unidad.id}
              />
              <input type="hidden" name="subjectSlug" value={slug} />
              <input
                name="enunciado"
                placeholder="Enunciado"
                required
                className="block w-full border-2 border-ink px-2 py-1"
              />
              <select
                name="tipo"
                className="block w-full border-2 border-ink px-2 py-1"
              >
                <option value="MULTIPLE_CHOICE">Opción múltiple</option>
                <option value="VERDADERO_FALSO">Verdadero / Falso</option>
                <option value="RESPUESTA_CORTA">Respuesta corta</option>
              </select>
              <textarea
                name="opciones"
                placeholder="Opciones (una por línea, solo opción múltiple)"
                className="block w-full border-2 border-ink px-2 py-1"
              />
              <input
                name="respuestaCorrecta"
                placeholder="Respuesta correcta"
                required
                className="block w-full border-2 border-ink px-2 py-1"
              />
              <textarea
                name="explicacion"
                placeholder="Explicación"
                className="block w-full border-2 border-ink px-2 py-1"
              />
              <button
                type="submit"
                className="border-2 border-ink bg-paper px-3 py-1 text-sm font-bold"
              >
                Agregar pregunta
              </button>
            </form>
          </div>
        ))}
      </ConstructivistCard>
    </div>
  )
}
