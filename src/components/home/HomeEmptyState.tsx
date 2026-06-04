import { DashboardShell } from '@/components/shell/DashboardShell'
import { Sidebar } from '@/components/shell/Sidebar'
import { AnimateIn } from '@/components/ui/AnimateIn'
import { Mascot } from '@/components/ui/Mascot'
import { MobileShell } from '@/components/mobile/shell/MobileShell'
import { HomeTopbarActions } from './HomeTopbarActions'

export function HomeEmptyState() {
  return (
    <>
      <div className="hidden lg:block">
        <DashboardShell
          topbar={<HomeTopbarActions />}
          sidebar={
            <Sidebar
              eyebrow="CARRERA"
              title="Sin datos"
              secondaryEyebrow="AÑOS ACADÉMICOS"
              items={[]}
              emptyState="Todavía no hay años cargados."
            />
          }
        >
          <AnimateIn className="space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/40">
              Estado inicial
            </p>
            <div className="flex max-w-2xl flex-col items-center gap-6 rounded-md bg-surface-1 p-6 md:flex-row">
              <div className="shrink-0">
                <Mascot size={120} />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight text-white">
                  No hay datos cargados todavía.
                </h1>
                <p className="mt-3 text-sm leading-6 text-white/64">
                  Todavía no se cargó la información de la carrera. Cuando esté
                  lista, vas a ver acá los años y materias disponibles.
                </p>
              </div>
            </div>
          </AnimateIn>
        </DashboardShell>
      </div>
      <div className="lg:hidden">
        <MobileShell title="NextCampus" drawerYears={[]} careerName="">
          <div className="px-[18px] pt-6">
            <div className="mb-5 flex justify-center">
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-5 py-3">
                <Mascot size={96} className="opacity-95" />
              </div>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
              CARRERA
            </p>
            <h1 className="mt-2 text-2xl font-black text-white">
              Todavía no hay datos.
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-white/55">
              Cuando esté listo vas a ver acá los años y materias de la carrera.
            </p>
          </div>
        </MobileShell>
      </div>
    </>
  )
}
