import { requireAcademicManager } from '@/lib/auth'
import { getPeriodos } from '@/lib/queries'
import { PeriodoManager } from '@/components/admin/PeriodoManager'

export default async function AdminCalendarioPage() {
  await requireAcademicManager()
  const periodos = await getPeriodos()

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-200/70">Calendario</p>
        <h1 className="mt-3 font-display text-3xl font-black tracking-tight text-white">Períodos del calendario</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">
          Cargá y editá los feriados, las mesas de examen y la suspensión de clases. Estos períodos se aplican a todo el campus y se pintan en el calendario de cada año.
        </p>
      </div>

      <PeriodoManager periodos={periodos} />
    </div>
  )
}
