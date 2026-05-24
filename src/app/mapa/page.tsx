import { cookies } from 'next/headers';
import Link from 'next/link';
import { Shield, GraduationCap } from 'lucide-react';
import { getCareer } from '@/lib/queries';
import { PREFERENCES_KEY, isYearVisible, readPreferencesFromCookie } from '@/lib/preferences';
import { DashboardShell } from '@/components/shell/DashboardShell';
import { Sidebar } from '@/components/shell/Sidebar';
import { AnimateIn } from '@/components/ui/AnimateIn';
import { MapaCorrelativas } from '@/components/mapa/MapaCorrelativas';
import { MapaCorrelativasMobile } from '@/components/mapa/MapaCorrelativasMobile';
import { MapaSidebar } from '@/components/mapa/MapaSidebar';

export const revalidate = 300;

function DashboardBrand() {
  return (
    <Link href="/" className="flex items-center gap-3 text-left">
      <span className="inline-flex h-9 w-9 items-center justify-center rounded bg-gradient-to-br from-amber-400 to-orange-500 text-black shadow-[0_0_15px_rgba(249,115,22,0.2)]">
        <GraduationCap className="h-5 w-5" />
      </span>
      <div className="flex items-baseline gap-2">
        <span className="text-xl font-bold tracking-tight text-white">
          Campus Virtual
        </span>
        <span className="text-xs font-semibold uppercase tracking-widest text-white/40">
          FCYT - UADER
        </span>
      </div>
    </Link>
  );
}

export default async function MapaPage() {
  const cookieStore = await cookies();
  const initialPrefs = readPreferencesFromCookie(
    cookieStore.get(PREFERENCES_KEY)?.value ?? null,
  );
  const career = await getCareer();

  if (!career) {
    return (
      <DashboardShell
        brand={<DashboardBrand />}
        topbar={
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-transparent px-4 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/5 hover:text-white"
          >
            <Shield className="h-4 w-4" />
            Admin
          </Link>
        }
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
        <div className="max-w-2xl rounded-md bg-surface-1 p-6">
          <h1 className="text-3xl font-black tracking-tight text-white">
            No hay datos cargados todavía.
          </h1>
          <p className="mt-3 text-sm leading-6 text-white/64">
            Cargá los datos de la carrera para poder visualizar el mapa de correlatividades.
          </p>
        </div>
      </DashboardShell>
    );
  }

  const visibleYears = career.years
    .map((year, index) => ({ year, index }))
    .filter(({ year }) => isYearVisible(year.slug, initialPrefs))
    .map(({ year, index }) => ({ ...year, order: index }));

  const availableSubjectSlugs = career.years.flatMap((year) =>
    year.subjects.map((subject) => subject.slug),
  );

  return (
    <>
      <div className="lg:hidden">
        <MapaCorrelativasMobile
          careerName={career.nombre}
          drawerYears={visibleYears.map((year) => ({
            slug: year.slug,
            nombre: year.nombre,
            subjectsCount: year.subjects.length,
          }))}
          availableSubjectSlugs={availableSubjectSlugs}
          initialMode="plan"
        />
      </div>

      <div className="hidden lg:block">
        <DashboardShell
          brand={<DashboardBrand />}
          topbar={
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-transparent px-4 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/5 hover:text-white"
            >
              <Shield className="h-4 w-4" />
              Admin
            </Link>
          }
          sidebar={
            <MapaSidebar currentView="plan" availableSubjectSlugs={availableSubjectSlugs} />
          }
        >
          <AnimateIn className="space-y-6">
            <MapaCorrelativas availableSubjectSlugs={availableSubjectSlugs} />
          </AnimateIn>
        </DashboardShell>
      </div>
    </>
  );
}
