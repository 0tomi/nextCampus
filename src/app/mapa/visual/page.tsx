import Link from 'next/link';
import { GraduationCap, Shield } from 'lucide-react';
import { getCareer } from '@/lib/queries';
import { getYearColorClasses } from '@/lib/yearColors';
import { DashboardShell } from '@/components/shell/DashboardShell';
import { Sidebar } from '@/components/shell/Sidebar';
import { AnimateIn } from '@/components/ui/AnimateIn';
import { MapaVisualCorrelativas } from '@/components/mapa/MapaVisualCorrelativas';

export const revalidate = 300;

function DashboardBrand() {
  return (
    <Link href="/" className="flex items-center gap-3 text-left">
      <span className="inline-flex h-9 w-9 items-center justify-center rounded bg-gradient-to-br from-amber-400 to-orange-500 text-black shadow-[0_0_15px_rgba(249,115,22,0.2)]">
        <GraduationCap className="h-5 w-5" />
      </span>
      <div className="flex items-baseline gap-2">
        <span className="text-xl font-bold tracking-tight text-white">Campus Virtual</span>
        <span className="text-xs font-semibold uppercase tracking-widest text-white/40">FCYT - UADER</span>
      </div>
    </Link>
  );
}

export default async function MapaVisualPage() {
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
          <h1 className="text-3xl font-black tracking-tight text-white">No hay datos cargados todavía.</h1>
          <p className="mt-3 text-sm leading-6 text-white/64">
            Cargá los datos de la carrera para poder visualizar el mapa de correlatividades.
          </p>
        </div>
      </DashboardShell>
    );
  }

  const sidebarItems = career.years.map((year, index) => {
    const colors = getYearColorClasses(year.slug);

    return {
      id: year.id,
      href: `/year/${year.slug}`,
      label: year.nombre,
      badge: String(index + 1),
      meta: `${year.subjects.length} materias`,
      badgeClassName: colors.progressClassName + ' text-white',
    };
  });
  const availableSubjectSlugs = career.years.flatMap((year) => year.subjects.map((subject) => subject.slug));

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
          title={career.nombre}
          secondaryEyebrow="AÑOS ACADÉMICOS"
          items={sidebarItems}
        />
      }
    >
      <AnimateIn className="space-y-6">
        <MapaVisualCorrelativas availableSubjectSlugs={availableSubjectSlugs} />
      </AnimateIn>
    </DashboardShell>
  );
}
