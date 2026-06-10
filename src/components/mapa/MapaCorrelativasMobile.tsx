'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Filter,
  GraduationCap,
  Layers3,
  Lock,
  Radar,
  RefreshCw,
  Search,
  Sparkles,
  Target,
} from 'lucide-react';
import { MobileShell, type MobileShellDrawerYear } from '@/components/mobile/shell/MobileShell';
import { Modal } from '@/components/ui/Modal';
import { MAPA_YEARS, MOBILE_STATUS_BADGE as STATUS_BADGE, MOBILE_STATUS_CARD as STATUS_CARD, MOBILE_STATUS_LABELS as STATUS_LABELS, YEAR_LABELS, YEAR_SHORT_LABELS } from '@/lib/domain/mapa/mapaConstants';
import {
  canOpenSubjectPage,
  filterSubjects,
  getMissingCorrelatives,
  getSubjectName,
  getSuggestedSubjects,
  getUnlocks,
  getYearSummaries,
  type YearSummary,
} from '@/lib/domain/mapa/subjectQueries';
import type { SubjectNode, SubjectStatus } from '@/lib/domain/mapa/types';
import { useMapaProgress } from '@/hooks/useMapaProgress';
import { getSubjectDetails, useSubjectSelection } from '@/hooks/useSubjectSelection';
import { useSuggestedYear } from '@/hooks/useSuggestedYear';
import { yearSlugFromNumber } from '@/lib/slug';
import { buildSubjectHref } from '@/components/mobile/shared/subjectRoutes';
import { cn } from '@/lib/utils';
import { MapaResetDialog } from './MapaResetDialog';

type MobileMapaMode = 'plan' | 'ruta';
type StatusFilter = 'ALL' | SubjectStatus;
type YearFilter = 'ALL' | 1 | 2 | 3 | 4 | 5;

type MapaCorrelativasMobileProps = {
  careerName: string;
  drawerYears: MobileShellDrawerYear[];
  availableSubjectSlugs?: string[];
  initialMode?: MobileMapaMode;
};

const EMPTY_AVAILABLE_SUBJECT_SLUGS: string[] = [];

export function MapaCorrelativasMobile({
  careerName,
  drawerYears,
  availableSubjectSlugs = EMPTY_AVAILABLE_SUBJECT_SLUGS,
  initialMode = 'plan',
}: MapaCorrelativasMobileProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [yearFilter, setYearFilter] = useState<YearFilter>('ALL');
  const [mode, setMode] = useState<MobileMapaMode>(initialMode);
  const [detailSubjectSlug, setDetailSubjectSlug] = useState<string | null>(null);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const progress = useMapaProgress();
  const selection = useSubjectSelection(progress);
  const {
    completed,
    completedCount,
    isHydrated,
    lockedCount,
    progressPercentage,
    subjectStatuses,
    autocompleteYear,
    reset,
    unlockedCount,
  } = progress;

  const availableSlugs = useMemo(() => new Set(availableSubjectSlugs), [availableSubjectSlugs]);

  const selectedSubjectSlug = selection.selectedSlug;
  const selectedSubject = selection.selectedSubject;
  const selectedStatus = selection.selectedStatus;
  const selectedUnlocks = selection.selectedUnlocks;
  const detail = getSubjectDetails(detailSubjectSlug, subjectStatuses, completed);

  const openSubjectDetail = (subject: SubjectNode) => {
    selection.selectSubject(subject.slug);
    setDetailSubjectSlug(subject.slug);
  };

  const handleConfirmReset = () => {
    setConfirmResetOpen(false);
    reset();
    selection.resetSelection();
  };

  const suggestedYearToComplete = useSuggestedYear(completed);

  const handleAutocompleteYear = (year: 2 | 3 | 4 | 5) => {
    autocompleteYear(year);
  };

  const filteredSubjects = useMemo(() => {
    return filterSubjects({ searchTerm, statusFilter, yearFilter, subjectStatuses });
  }, [searchTerm, statusFilter, subjectStatuses, yearFilter]);

  const recommendedSubjects = useMemo(
    () => getSuggestedSubjects(subjectStatuses, 5),
    [subjectStatuses],
  );

  const yearSummaries = useMemo(
    () => getYearSummaries(subjectStatuses),
    [subjectStatuses],
  );

  if (!isHydrated) {
    return (
      <MobileShell
        title="Correlativas"
        subtitle={careerName}
        onBack="/"
        drawerYears={drawerYears}
        careerName={careerName}
      >
        <div className="flex min-h-[70vh] items-center justify-center px-[18px]">
          <div className="space-y-3 text-center">
            <RefreshCw className="mx-auto size-8 animate-spin text-amber-300" />
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/42">
              Preparando tu recorrido
            </p>
          </div>
        </div>
      </MobileShell>
    );
  }

  return (
    <MobileShell
      title="Correlativas"
      subtitle={careerName}
      onBack="/"
      drawerYears={drawerYears}
      careerName={careerName}
      mainClassName="pb-24 pt-14"
    >
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.16),transparent_54%),radial-gradient(circle_at_85%_8%,rgba(251,191,36,0.18),transparent_34%)]" />

        <div className="relative flex flex-col gap-6">
          <MapaMobileHero
            completedCount={completedCount}
            lockedCount={lockedCount}
            progressPercentage={progressPercentage}
            unlockedCount={unlockedCount}
          />
          <MapaModeTabs mode={mode} onChange={setMode} />
          <MapaSearchFilters
            searchTerm={searchTerm}
            statusFilter={statusFilter}
            yearFilter={yearFilter}
            onSearchChange={setSearchTerm}
            onStatusFilterChange={setStatusFilter}
            onYearFilterChange={setYearFilter}
          />
          <RecommendedSubjects
            recommendedSubjects={recommendedSubjects}
            selectedSubjectSlug={selectedSubjectSlug}
            onOpenSubject={openSubjectDetail}
          />

          {mode === 'plan' ? (
            <MapaMobilePlanList
              availableSlugs={availableSlugs}
              completed={completed}
              filteredSubjects={filteredSubjects}
              selectedSubjectSlug={selectedSubjectSlug}
              subjectStatuses={subjectStatuses}
              onOpenSubject={openSubjectDetail}
              onToggleSubject={selection.toggleSubject}
            />
          ) : (
            <MapaMobileRouteView
              completed={completed}
              selectedSubject={selectedSubject}
              selectedSubjectSlug={selectedSubjectSlug}
              selectedStatus={selectedStatus}
              selectedUnlocks={selectedUnlocks}
              subjectStatuses={subjectStatuses}
              yearSummaries={yearSummaries}
              onOpenSubject={openSubjectDetail}
            />
          )}

          <MapaQuickActions
            completedCount={completed.length}
            suggestedYearToComplete={suggestedYearToComplete}
            onAutocompleteYear={handleAutocompleteYear}
            onRequestReset={() => setConfirmResetOpen(true)}
          />
        </div>
      </div>

      <SubjectDetailModal
        subject={detail?.subject ?? null}
        status={detail?.status ?? null}
        missing={detail?.missing ?? []}
        unlocks={detail?.unlocks ?? []}
        canOpen={detail ? canOpenSubjectPage(availableSlugs, detail.subject.slug) : false}
        onClose={() => setDetailSubjectSlug(null)}
        onToggle={selection.toggleSubject}
      />

      <MapaResetDialog
        open={confirmResetOpen}
        onClose={() => setConfirmResetOpen(false)}
        onConfirm={handleConfirmReset}
      />
    </MobileShell>
  );
}

function MapaMobileHero({
  completedCount,
  lockedCount,
  progressPercentage,
  unlockedCount,
}: {
  completedCount: number;
  lockedCount: number;
  progressPercentage: number;
  unlockedCount: number;
}) {
  return (
    <section className="px-[18px] pt-4">
      <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#131313] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.34)]">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),transparent_35%,rgba(34,211,238,0.12)_78%,transparent)]" />
        <div className="pointer-events-none absolute -right-10 top-[-26px] size-36 rounded-full bg-cyan-300/16 blur-3xl" />
        <div className="pointer-events-none absolute left-[-24px] bottom-[-42px] size-32 rounded-full bg-amber-300/12 blur-3xl" />

        <div className="relative flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/62">Seguimiento personal</p>
            <h1 className="mt-2 max-w-[14rem] text-[28px] font-black leading-[1.02] tracking-[-0.04em] text-white">
              Calculá tu camino materia por materia
            </h1>
            <p className="mt-3 max-w-[16.5rem] text-[13px] leading-5 text-white/60">
              Marcá lo que ya cursaste y descubrí enseguida qué materias ya tenés listas para seguir.
            </p>
          </div>

          <div className="relative shrink-0">
            <div
              className="grid size-[84px] place-items-center rounded-full"
              style={{ background: `conic-gradient(#fde68a 0 ${progressPercentage}%, rgba(255,255,255,0.1) ${progressPercentage}% 100%)` }}
            >
              <div className="grid size-[64px] place-items-center rounded-full bg-[#111111] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
                <div className="text-center">
                  <span className="block text-xl font-black leading-none text-white">{progressPercentage}%</span>
                  <span className="mt-1 block text-[9px] font-black uppercase tracking-[0.18em] text-white/38">avance</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative mt-5 grid grid-cols-3 gap-2.5">
          <MetricCard label="Marcadas" value={completedCount} tone="emerald" />
          <MetricCard label="Listas" value={unlockedCount} tone="amber" />
          <MetricCard label="Pendientes" value={lockedCount} tone="slate" />
        </div>
      </div>
    </section>
  );
}

function MapaModeTabs({ mode, onChange }: { mode: MobileMapaMode; onChange: (mode: MobileMapaMode) => void }) {
  return (
    <section className="px-[18px]">
      <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-1.5">
        <div className="grid grid-cols-2 gap-1.5">
          {([
            { id: 'plan', label: 'Calculá', icon: GraduationCap },
            { id: 'ruta', label: 'Ruta', icon: Radar },
          ] as const).map((view) => {
            const active = mode === view.id;
            const Icon = view.icon;

            return (
              <button
                key={view.id}
                type="button"
                onClick={() => onChange(view.id)}
                className={cn(
                  'flex h-11 cursor-pointer items-center justify-center gap-2 rounded-[14px] text-sm font-black transition',
                  active
                    ? 'bg-gradient-to-r from-amber-300 to-cyan-300 text-black shadow-[0_10px_30px_rgba(34,211,238,0.14)]'
                    : 'bg-transparent text-white/58 hover:bg-white/5 hover:text-white',
                )}
              >
                <Icon className="size-4" />
                {view.label}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function MapaSearchFilters({
  searchTerm,
  statusFilter,
  yearFilter,
  onSearchChange,
  onStatusFilterChange,
  onYearFilterChange,
}: {
  searchTerm: string;
  statusFilter: StatusFilter;
  yearFilter: YearFilter;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: StatusFilter) => void;
  onYearFilterChange: (value: YearFilter) => void;
}) {
  return (
    <>
      <section className="flex flex-col gap-3 px-[18px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/28" />
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
            aria-label="Buscar materia o código"
            placeholder="Buscar materia o código"
            className="h-12 w-full rounded-2xl border border-white/10 bg-[#151515] pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-white/28 focus:border-cyan-300/40 focus:bg-white/[0.06]"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button type="button" onClick={() => onYearFilterChange('ALL')} className={yearFilterButtonClassName(yearFilter === 'ALL')}>
            Todos
          </button>
          {MAPA_YEARS.map((year) => (
            <button key={year} type="button" onClick={() => onYearFilterChange(year)} className={yearFilterButtonClassName(yearFilter === year)}>
              {YEAR_SHORT_LABELS[year]}
            </button>
          ))}
        </div>
      </section>

      <section className="px-[18px]">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {([
            { value: 'ALL', label: 'Todas' },
            { value: 'UNLOCKED', label: 'Listas' },
            { value: 'LOCKED', label: 'Todavía no' },
            { value: 'COMPLETED', label: 'Marcadas' },
          ] as const).map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => onStatusFilterChange(filter.value)}
              className={cn(
                'inline-flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-full border px-4 text-[11px] font-black uppercase tracking-[0.16em] transition',
                statusFilter === filter.value
                  ? 'border-amber-300/30 bg-amber-300/12 text-amber-50'
                  : 'border-white/10 bg-transparent text-white/48 hover:text-white/74',
              )}
            >
              <Filter className="size-3.5" />
              {filter.label}
            </button>
          ))}
        </div>
      </section>
    </>
  );
}

function yearFilterButtonClassName(isActive: boolean) {
  return cn(
    'h-9 shrink-0 rounded-full border px-4 text-[11px] font-black uppercase tracking-[0.18em] transition',
    isActive ? 'border-cyan-300/35 bg-cyan-300/12 text-cyan-50' : 'border-white/10 bg-transparent text-white/45 hover:text-white/74',
  );
}

function RecommendedSubjects({
  recommendedSubjects,
  selectedSubjectSlug,
  onOpenSubject,
}: {
  recommendedSubjects: SubjectNode[];
  selectedSubjectSlug: string;
  onOpenSubject: (subject: SubjectNode) => void;
}) {
  return (
    <section className="px-[18px]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/38">Próximo paso</p>
          <h2 className="mt-1 text-lg font-black text-white">Lo que más te conviene mirar ahora</h2>
        </div>
        <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-50">
          {recommendedSubjects.length}
        </span>
      </div>

      <div className="mt-3 flex gap-3 overflow-x-auto pb-1 scrollbar-none">
        {recommendedSubjects.length === 0 ? (
          <div className="w-full rounded-2xl border border-dashed border-white/10 bg-[#171717] p-4 text-sm text-white/42">
            Cuando marques materias, acá vas a ver qué opciones ya tenés listas para seguir.
          </div>
        ) : (
          recommendedSubjects.map((subject) => (
            <RecommendedSubjectCard
              key={subject.slug}
              subject={subject}
              selected={selectedSubjectSlug === subject.slug}
              onOpen={() => onOpenSubject(subject)}
            />
          ))
        )}
      </div>
    </section>
  );
}

function RecommendedSubjectCard({ subject, selected, onOpen }: { subject: SubjectNode; selected: boolean; onOpen: () => void }) {
  const unlockCount = getUnlocks(subject.slug).length;

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'min-w-[260px] shrink-0 rounded-[22px] border p-4 text-left transition',
        selected ? 'border-cyan-300/38 bg-cyan-300/10 shadow-[0_18px_40px_rgba(34,211,238,0.08)]' : 'border-white/10 bg-[#151515] hover:border-white/18 hover:bg-white/[0.05]',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/58">{YEAR_LABELS[subject.year as 1 | 2 | 3 | 4 | 5]}</p>
          <h3 className="mt-2 text-base font-black leading-5 text-white">{subject.nombre}</h3>
        </div>
        <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-white/6 text-cyan-100">
          <Target className="size-4.5" />
        </span>
      </div>
      <div className="relative z-20 mt-4 flex items-center justify-between gap-2 border-t border-white/8 pt-3">
        <span className="text-[11px] font-bold text-white/56">Abre {unlockCount} materia{unlockCount === 1 ? '' : 's'}</span>
        <span className="inline-flex items-center gap-1 text-[11px] font-black text-white">
          Ver foco
          <ChevronRight className="size-3.5" />
        </span>
      </div>
    </button>
  );
}

function MapaMobilePlanList({
  availableSlugs,
  completed,
  filteredSubjects,
  selectedSubjectSlug,
  subjectStatuses,
  onOpenSubject,
  onToggleSubject,
}: {
  availableSlugs: Set<string>;
  completed: readonly string[];
  filteredSubjects: SubjectNode[];
  selectedSubjectSlug: string;
  subjectStatuses: Record<string, SubjectStatus>;
  onOpenSubject: (subject: SubjectNode) => void;
  onToggleSubject: (subject: SubjectNode) => void;
}) {
  return (
    <section className="flex flex-col gap-3 px-[18px]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/38">Explorá</p>
          <h2 className="mt-1 text-lg font-black text-white">Materias filtradas para tu momento</h2>
        </div>
        <span className="text-[11px] font-bold text-white/45">{filteredSubjects.length} resultado{filteredSubjects.length === 1 ? '' : 's'}</span>
      </div>

      {filteredSubjects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-[#171717] px-4 py-5 text-sm text-white/42">
          No hay materias con esos filtros. Probá cambiar la búsqueda o el estado.
        </div>
      ) : (
        filteredSubjects.map((subject) => (
          <SubjectListCard
            key={subject.slug}
            subject={subject}
            selected={selectedSubjectSlug === subject.slug}
            status={subjectStatuses[subject.slug]}
            completed={completed}
            canOpen={canOpenSubjectPage(availableSlugs, subject.slug)}
            onSelect={() => onOpenSubject(subject)}
            onToggle={() => onToggleSubject(subject)}
          />
        ))
      )}
    </section>
  );
}

function MapaMobileRouteView({
  completed,
  selectedSubject,
  selectedSubjectSlug,
  selectedStatus,
  selectedUnlocks,
  subjectStatuses,
  yearSummaries,
  onOpenSubject,
}: {
  completed: readonly string[];
  selectedSubject: SubjectNode;
  selectedSubjectSlug: string;
  selectedStatus: SubjectStatus;
  selectedUnlocks: SubjectNode[];
  subjectStatuses: Record<string, SubjectStatus>;
  yearSummaries: YearSummary[];
  onOpenSubject: (subject: SubjectNode) => void;
}) {
  return (
    <section className="flex flex-col gap-4 px-[18px]">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/38">Ruta visual</p>
        <h2 className="mt-1 text-lg font-black text-white">Leé tu carrera como un recorrido</h2>
      </div>

      <FocusedRouteCard
        completed={completed}
        selectedSubject={selectedSubject}
        selectedStatus={selectedStatus}
        selectedUnlocks={selectedUnlocks}
        subjectStatuses={subjectStatuses}
      />
      <YearSummaryList
        selectedSubjectSlug={selectedSubjectSlug}
        subjectStatuses={subjectStatuses}
        yearSummaries={yearSummaries}
        onOpenSubject={onOpenSubject}
      />
    </section>
  );
}

function FocusedRouteCard({
  completed,
  selectedSubject,
  selectedStatus,
  selectedUnlocks,
  subjectStatuses,
}: {
  completed: readonly string[];
  selectedSubject: SubjectNode;
  selectedStatus: SubjectStatus;
  selectedUnlocks: SubjectNode[];
  subjectStatuses: Record<string, SubjectStatus>;
}) {
  return (
    <div className="rounded-[24px] border border-cyan-300/14 bg-[#121417] p-4 shadow-[0_22px_60px_rgba(0,0,0,0.24)]">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100/58">Materia enfocada</p>
      <div className="mt-3 space-y-4">
        <RutaLane
          title="Antes"
          empty="No necesita materias previas."
          tone="rose"
          items={selectedSubject.correlativas.map((slug) => ({
            slug,
            label: getSubjectName(slug),
            done: completed.includes(slug),
          }))}
        />
        <div className="relative rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
          <div className="absolute -left-1.5 top-1/2 size-3 -translate-y-1/2 rounded-full bg-cyan-200 shadow-[0_0_18px_rgba(103,232,249,0.45)]" />
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/40">{selectedSubject.codigo} · {YEAR_LABELS[selectedSubject.year as 1 | 2 | 3 | 4 | 5]}</p>
              <h3 className="mt-2 text-lg font-black leading-6 text-white">{selectedSubject.nombre}</h3>
            </div>
            <span className={cn('rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em]', STATUS_BADGE[selectedStatus])}>
              {STATUS_LABELS[selectedStatus]}
            </span>
          </div>
        </div>
        <RutaLane
          title="Después"
          empty="Por ahora no abre materias directas."
          tone="cyan"
          items={selectedUnlocks.map((subject) => ({
            slug: subject.slug,
            label: subject.nombre,
            done: subjectStatuses[subject.slug] === 'COMPLETED',
          }))}
        />
      </div>
    </div>
  );
}

function YearSummaryList({
  selectedSubjectSlug,
  subjectStatuses,
  yearSummaries,
  onOpenSubject,
}: {
  selectedSubjectSlug: string;
  subjectStatuses: Record<string, SubjectStatus>;
  yearSummaries: YearSummary[];
  onOpenSubject: (subject: SubjectNode) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {yearSummaries.map((summary) => (
        <div key={summary.year} className="rounded-[24px] border border-white/10 bg-[#151515] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/38">{YEAR_SHORT_LABELS[summary.year]}</p>
              <h3 className="mt-1 text-lg font-black text-white">{summary.title}</h3>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/55">
              {summary.done}/{summary.total}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <MetricCard label="Hechas" value={summary.done} tone="emerald" compact />
            <MetricCard label="Listas" value={summary.ready} tone="amber" compact />
            <MetricCard label="Total" value={summary.total} tone="slate" compact />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {summary.subjects.map((subject) => {
              const status = subjectStatuses[subject.slug];

              return (
                <button
                  key={subject.slug}
                  type="button"
                  onClick={() => onOpenSubject(subject)}
                  className={cn(
                    'cursor-pointer rounded-full border px-3 py-2 text-left text-[11px] font-bold leading-4 transition',
                    STATUS_CARD[status],
                    selectedSubjectSlug === subject.slug && 'border-cyan-300/36 ring-1 ring-cyan-300/30',
                  )}
                >
                  {subject.nombre}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function MapaQuickActions({
  completedCount,
  suggestedYearToComplete,
  onAutocompleteYear,
  onRequestReset,
}: {
  completedCount: number;
  suggestedYearToComplete: 2 | 3 | 4 | 5 | null;
  onAutocompleteYear: (year: 2 | 3 | 4 | 5) => void;
  onRequestReset: () => void;
}) {
  return (
    <section className="px-[18px]">
      <div className="rounded-[24px] border border-white/10 bg-[#141414] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/38">Atajos</p>
            <h2 className="mt-1 text-lg font-black text-white">Acciones rápidas</h2>
          </div>
          <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-white/5 text-white/52">
            <Layers3 className="size-4.5" />
          </span>
        </div>

        <div className="mt-4 flex flex-col gap-2.5">
          {suggestedYearToComplete ? (
            <button
              type="button"
              onClick={() => onAutocompleteYear(suggestedYearToComplete)}
              className="flex min-h-12 cursor-pointer items-center justify-between rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-4 text-left transition hover:bg-emerald-400/14"
            >
              <span>
                <span className="block text-[11px] font-black uppercase tracking-[0.16em] text-emerald-50">Marcar año completo</span>
                <span className="mt-1 block text-sm font-bold text-white">Completar {YEAR_SHORT_LABELS[suggestedYearToComplete]} de una vez</span>
              </span>
              <Sparkles className="size-4.5 text-emerald-100" />
            </button>
          ) : null}

          <button
            type="button"
            onClick={onRequestReset}
            disabled={completedCount === 0}
            className="flex min-h-12 cursor-pointer items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 text-left transition hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span>
              <span className="block text-[11px] font-black uppercase tracking-[0.16em] text-white/45">Empezar de nuevo</span>
              <span className="mt-1 block text-sm font-bold text-white">Reiniciar las materias marcadas</span>
            </span>
            <RefreshCw className="size-4.5 text-white/58" />
          </button>
        </div>
      </div>
    </section>
  );
}

function SubjectDetailModal({
  subject,
  status,
  missing,
  unlocks,
  canOpen,
  onClose,
  onToggle,
}: {
  subject: SubjectNode | null;
  status: SubjectStatus | null;
  missing: string[];
  unlocks: SubjectNode[];
  canOpen: boolean;
  onClose: () => void;
  onToggle: (subject: SubjectNode) => void;
}) {
  if (!subject || !status) return null;

  const guidance = getSubjectGuidance(subject, status, missing, unlocks);

  return (
    <Modal
      open={Boolean(subject)}
      onClose={onClose}
      title={subject.nombre}
      className="mx-3 flex h-[min(74vh,34rem)] max-w-none flex-col overflow-hidden rounded-[28px] border-white/10 bg-[#111111]"
      contentClassName="min-h-0 flex-1 overflow-hidden p-0"
    >
      <div className="flex h-full min-h-0 flex-col">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/38">
              {subject.codigo} · {YEAR_LABELS[subject.year as 1 | 2 | 3 | 4 | 5]}
            </p>
            <p className="mt-2 text-sm leading-6 text-white/62">
              {guidance.summary}
            </p>
          </div>

          <span className={cn('shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em]', STATUS_BADGE[status])}>
            {STATUS_LABELS[status]}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <MiniFact label="Código" value={subject.codigo} />
          <MiniFact label="Horas" value={subject.horas} />
          <MiniFact label="Cursado" value={subject.periodo === 'Anual' ? 'Anual' : 'Cuatri'} />
        </div>

        <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/38">
            Qué te conviene hacer
          </p>
          <p className="mt-2 text-sm font-bold leading-6 text-white">
            {guidance.title}
          </p>
          <p className="mt-2 text-sm leading-6 text-white/58">
            {guidance.detail}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onToggle(subject)}
            disabled={status === 'LOCKED'}
            className={cn(
              'flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl border text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-40',
              status === 'COMPLETED' && 'border-emerald-300/20 bg-emerald-400/10 text-emerald-50 hover:bg-emerald-400/14',
              status === 'UNLOCKED' && 'border-amber-300/20 bg-amber-300/10 text-amber-50 hover:bg-amber-300/14',
              status === 'LOCKED' && 'border-white/10 bg-white/5 text-white/38',
            )}
          >
            {status === 'COMPLETED' ? <RefreshCw className="size-4" /> : status === 'LOCKED' ? <Lock className="size-4" /> : <Check className="size-4" />}
            {status === 'COMPLETED' ? 'Quitar marca' : status === 'LOCKED' ? 'Todavía no disponible' : 'Marcar avance'}
          </button>

          {canOpen ? (
            <Link
              href={buildSubjectHref({ yearSlug: yearSlugFromNumber(subject.year), subjectSlug: subject.slug })}
              onClick={onClose}
              className="flex h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-black text-white/74 transition hover:bg-white/8 hover:text-white"
            >
              <BookOpen className="size-4" />
              Abrir
            </Link>
          ) : null}
        </div>

        <div className="space-y-3">
          <RelationGroup
            title="Te falta para cursarla"
            empty="Ya cumple todo lo necesario."
            tone="rose"
            items={missing.map((slug) => ({ slug, label: getSubjectName(slug), done: false }))}
          />
          <RelationGroup
            title="Te abre después"
            empty="No destraba materias directas."
            tone="cyan"
            items={unlocks.map((item) => ({ slug: item.slug, label: item.nombre, done: false }))}
          />
        </div>
        </div>
      </div>
    </Modal>
  );
}

function SubjectListCard({
  subject,
  status,
  selected,
  completed,
  canOpen,
  onSelect,
  onToggle,
}: {
  subject: SubjectNode;
  status: SubjectStatus;
  selected: boolean;
  completed: readonly string[];
  canOpen: boolean;
  onSelect: () => void;
  onToggle: () => void;
}) {
  const missing = getMissingCorrelatives(subject, completed);

  return (
    <div
      className={cn(
        'relative w-full cursor-pointer rounded-[24px] border p-4 text-left transition',
        STATUS_CARD[status],
        selected ? 'border-cyan-300/34 ring-1 ring-cyan-300/26' : 'hover:border-white/18',
      )}
    >
      <button
        type="button"
        aria-label={`Ver detalles de ${subject.nombre}`}
        onClick={onSelect}
        className="absolute inset-0 z-10 cursor-pointer rounded-[24px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200/70"
      />
      <div className="relative z-20 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/38">
            {subject.codigo} · {YEAR_LABELS[subject.year as 1 | 2 | 3 | 4 | 5]}
          </p>
          <h3 className="mt-2 text-base font-black leading-5 text-white">{subject.nombre}</h3>
          <p className="mt-2 text-[12px] leading-5 text-white/52">{STATUS_LABELS[status]}</p>
        </div>
        <span className={cn('shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em]', STATUS_BADGE[status])}>
          {status === 'COMPLETED' ? 'Hecha' : status === 'UNLOCKED' ? 'Lista' : 'En espera'}
        </span>
      </div>

      {missing.length > 0 ? (
        <p className="relative z-20 mt-3 line-clamp-2 text-[12px] leading-5 text-rose-100/72">
          Falta: {missing.map(getSubjectName).join(', ')}
        </p>
      ) : (
        <p className="relative z-20 mt-3 text-[12px] leading-5 text-white/46">
          {subject.correlativas.length === 0
            ? 'Sin requisitos previos.'
            : 'Ya reúne los requisitos principales para seguir.'}
        </p>
      )}

      <div className="relative z-20 mt-4 flex items-center justify-between gap-2 border-t border-white/8 pt-3">
        {canOpen ? (
          <Link
            href={buildSubjectHref({ yearSlug: yearSlugFromNumber(subject.year), subjectSlug: subject.slug })}
            onClick={(event) => event.stopPropagation()}
            className="inline-flex cursor-pointer items-center gap-1 text-[11px] font-black text-white/44 transition hover:text-white"
          >
            Ver materia
            <ArrowRight className="size-3.5" />
          </Link>
        ) : (
          <span className="text-[11px] font-black text-white/28">Sin detalle público</span>
        )}

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onToggle();
          }}
          disabled={status === 'LOCKED'}
          className={cn(
            'inline-flex h-9 cursor-pointer items-center gap-1 rounded-full border px-3 text-[11px] font-black uppercase tracking-[0.14em] transition disabled:cursor-not-allowed disabled:opacity-40',
            status === 'COMPLETED' && 'border-emerald-300/20 bg-emerald-400/10 text-emerald-50 hover:bg-emerald-400/14',
            status === 'UNLOCKED' && 'border-amber-300/20 bg-amber-300/10 text-amber-50 hover:bg-amber-300/14',
            status === 'LOCKED' && 'border-white/10 bg-white/5 text-white/38',
          )}
        >
          {status === 'COMPLETED' ? 'Quitar' : status === 'LOCKED' ? 'Bloqueada' : 'Marcar'}
        </button>
      </div>
    </div>
  );
}

function RutaLane({
  title,
  items,
  empty,
  tone,
}: {
  title: string;
  items: Array<{ slug: string; label: string; done: boolean }>;
  empty: string;
  tone: 'rose' | 'cyan';
}) {
  const toneClassName =
    tone === 'rose'
      ? 'border-rose-300/16 bg-rose-400/8 text-rose-50'
      : 'border-cyan-300/16 bg-cyan-400/8 text-cyan-50';

  return (
    <div className="relative pl-5">
      <div className="absolute left-[6px] top-0 bottom-0 w-px bg-gradient-to-b from-white/26 via-white/10 to-transparent" />
      <div className="absolute left-0 top-2 size-3 rounded-full bg-white/80 shadow-[0_0_16px_rgba(255,255,255,0.18)]" />
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">{title}</p>
      {items.length === 0 ? (
        <p className="mt-2 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm text-white/42">
          {empty}
        </p>
      ) : (
        <div className="mt-2 flex flex-wrap gap-2">
          {items.map((item) => (
            <span
              key={item.slug}
              className={cn('rounded-full border px-3 py-2 text-[11px] font-bold leading-4', toneClassName, item.done && 'border-emerald-300/20 bg-emerald-400/10 text-emerald-50')}
            >
              {item.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function RelationGroup({
  title,
  empty,
  tone,
  items,
}: {
  title: string;
  empty: string;
  tone: 'rose' | 'cyan';
  items: Array<{ slug: string; label: string; done: boolean }>;
}) {
  const toneClassName =
    tone === 'rose'
      ? 'border-rose-300/20 bg-rose-400/10 text-rose-50'
      : 'border-cyan-300/20 bg-cyan-400/10 text-cyan-50';

  return (
    <div>
      <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/38">{title}</p>
      {items.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm text-white/42">
          {empty}
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <span key={item.slug} className={cn('rounded-full border px-3 py-2 text-[11px] font-bold leading-4', toneClassName)}>
              {item.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  tone,
  compact = false,
}: {
  label: string;
  value: number | string;
  tone: 'emerald' | 'amber' | 'slate';
  compact?: boolean;
}) {
  const toneClassName = {
    emerald: 'border-emerald-300/20 bg-emerald-400/9 text-emerald-50',
    amber: 'border-amber-300/20 bg-amber-300/9 text-amber-50',
    slate: 'border-white/10 bg-white/[0.04] text-white',
  }[tone];

  return (
    <div className={cn('rounded-[20px] border p-3', toneClassName, compact && 'rounded-[18px] p-2.5')}>
      <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-68">{label}</p>
      <p className={cn('mt-2 font-black', compact ? 'text-xl' : 'text-2xl')}>{value}</p>
    </div>
  );
}

function MiniFact({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/36">{label}</p>
      <p className="mt-2 text-sm font-black text-white">{value}</p>
    </div>
  );
}

function getSubjectGuidance(
  subject: SubjectNode,
  status: SubjectStatus,
  missing: string[],
  unlocks: SubjectNode[],
) {
  if (status === 'COMPLETED') {
    return {
      summary: 'Esta materia ya cuenta como resuelta dentro del recorrido que marcaste.',
      title: 'Ya la tenés cubierta',
      detail:
        unlocks.length > 0
          ? `Te sirve para acercarte a ${unlocks
              .slice(0, 2)
              .map((item) => item.nombre)
              .join(' y ')}${unlocks.length > 2 ? ' y más' : ''}.`
          : 'No destraba materias directas, pero sigue sumando al avance general de tu carrera.',
    };
  }

  if (status === 'UNLOCKED') {
    return {
      summary: 'Con lo que ya marcaste, esta materia está lista para ser tu próximo movimiento.',
      title: 'Podés seguir con esta materia',
      detail:
        unlocks.length > 0
          ? `Si avanzás con ${subject.nombre}, después vas a abrir ${unlocks.length} materia${unlocks.length === 1 ? '' : 's'} directa${unlocks.length === 1 ? '' : 's'}.`
          : 'No abre materias directas inmediatas, pero te deja mejor posicionado para etapas siguientes.',
    };
  }

  return {
    summary: 'Todavía no aparece disponible con el progreso que tenés marcado hasta ahora.',
    title: 'Primero conviene completar requisitos',
    detail:
      missing.length > 0
        ? `Antes de llegar a ${subject.nombre}, te conviene enfocarte en ${missing
            .slice(0, 3)
            .map(getSubjectName)
            .join(', ')}${missing.length > 3 ? ' y otras más' : ''}.`
        : 'Aún no está lista dentro de tu recorrido actual.',
  };
}
