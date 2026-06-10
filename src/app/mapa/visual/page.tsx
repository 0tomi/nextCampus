import type { Metadata } from 'next'
import { cookies } from 'next/headers';
import Link from 'next/link';
import { Shield } from 'lucide-react';
import { getCareer } from '@/lib/queries';
import { PREFERENCES_KEY, isYearVisible, readPreferencesFromCookie } from '@/lib/preferences';
import { DashboardShell } from '@/components/shell/DashboardShell';
import { Sidebar } from '@/components/shell/Sidebar';
import { AnimateIn } from '@/components/ui/AnimateIn';
import { MapaVisualCorrelativas } from '@/components/mapa/MapaVisualCorrelativas';
import { MapaCorrelativasMobile } from '@/components/mapa/MapaCorrelativasMobile';
import { MapaSidebar } from '@/components/mapa/MapaSidebar';
import { CampusHeaderBrand } from '@/components/shell/CampusHeaderBrand';

export const metadata: Metadata = {
  title: 'Mapa visual | NextCampus',
  description: 'Visualizá las materias y correlativas de la carrera.',
}


function DashboardBrand() {
  return <CampusHeaderBrand />;
}

export default async function MapaVisualPage() {
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
            <Shield className="size-4" />
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
          <h1 className="text-3xl font-black tracking-tight text-white">No hay datos cargados todavía.</h1>
          <p className="mt-3 text-sm leading-6 text-white/64">
            Cargá los datos de la carrera para poder visualizar el mapa de correlatividades.
          </p>
        </div>
      </DashboardShell>
    );
  }

  const visibleYears = career.years.reduce<
    Array<(typeof career.years)[number] & { order: number }>
  >((acc, year, index) => {
    if (!isYearVisible(year.slug, initialPrefs)) return acc
    acc.push({ ...year, order: index })
    return acc
  }, []);

  const availableSubjectSlugs = career.years.flatMap((year) => year.subjects.map((subject) => subject.slug));

  return (
    <>
      <div className="lg:hidden">
        <MapaCorrelativasMobile
          careerName={career.nombre}
          drawerYears={visibleYears.map((year) => ({
            slug: year.slug,
            nombre: year.nombre,
            subjectsCount: year.subjects.length,
            orden: year.orden,
          }))}
          availableSubjectSlugs={availableSubjectSlugs}
          initialMode="ruta"
        />
      </div>

      <div className="hidden lg:block">
        <DashboardShell
          brand={<DashboardBrand />}
          mainClassName="p-0"
          topbar={
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-transparent px-4 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/5 hover:text-white"
            >
              <Shield className="size-4" />
              Admin
            </Link>
          }
          sidebar={
            <MapaSidebar />
          }
        >
          <AnimateIn className="space-y-6">
            <MapaVisualCorrelativas availableSubjectSlugs={availableSubjectSlugs} />
          </AnimateIn>
        </DashboardShell>
      </div>
    </>
  );
}
