'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  Filter,
  GraduationCap,
  Lock,
  Map,
  RefreshCw,
  Search,
  Sparkles,
  Unlock,
} from 'lucide-react';
import { subjectsData } from '@/lib/domain/mapa/correlativasData';
import {
  DESKTOP_STATUS_LABELS as STATUS_LABELS,
  MAPA_YEARS,
  YEAR_ACTION_LABELS,
  YEAR_LABELS as YEAR_NAMES,
  type MapaYear,
} from '@/lib/domain/mapa/mapaConstants';
import {
  getMissingCorrelatives,
  getSubjectName,
  getUnlocks,
} from '@/lib/domain/mapa/subjectQueries';
import type { SubjectNode, SubjectStatus } from '@/lib/domain/mapa/types';
import { useMapaProgress } from '@/hooks/useMapaProgress';
import { useSuggestedYear } from '@/hooks/useSuggestedYear';
import { cn } from '@/lib/utils';
import { yearSlugFromNumber } from '@/lib/slug';
import { buildSubjectHref } from '@/components/mobile/shared/subjectRoutes';
import { AlertDialog } from '@/components/ui/AlertDialog';

type StatusFilter = 'ALL' | SubjectStatus;
type SubjectsByYear = Record<MapaYear, SubjectNode[]>;

type MapaCorrelativasProps = {
  availableSubjectSlugs?: string[];
};

type MapaProgressState = ReturnType<typeof useMapaProgress>;

type MapaDerivedState = {
  availableSlugs: Set<string>;
  filteredSubjects: SubjectNode[];
  selectedDirectUnlocks: SubjectNode[];
  selectedMissing: string[];
  selectedMissingSubjects: SubjectNode[];
  selectedStatus: SubjectStatus;
  selectedSubject: SubjectNode;
  selectedUnlocks: SubjectNode[];
  subjectsByYear: SubjectsByYear;
  suggestedSubjects: SubjectNode[];
  suggestedYearToComplete: MapaYear | null;
};

type MapaActions = {
  autocompleteYear: (year: number) => void;
  onAskReset: () => void;
  onSearchTermChange: (value: string) => void;
  onSelectSubject: (slug: string) => void;
  onStatusFilterChange: (filter: StatusFilter) => void;
  onToggleSubject: (subject: SubjectNode) => void;
};

const EMPTY_AVAILABLE_SUBJECT_SLUGS: string[] = [];
const STATUS_FILTERS: readonly StatusFilter[] = ['ALL', 'UNLOCKED', 'LOCKED', 'COMPLETED'];

export function MapaCorrelativas({
  availableSubjectSlugs = EMPTY_AVAILABLE_SUBJECT_SLUGS,
}: MapaCorrelativasProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [selectedSubjectSlug, setSelectedSubjectSlug] = useState(subjectsData[0]?.slug ?? '');
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const progress = useMapaProgress();
  const derived = useMapaDerivedState({
    availableSubjectSlugs,
    completed: progress.completed,
    searchTerm,
    selectedSubjectSlug,
    statusFilter,
    subjectStatuses: progress.subjectStatuses,
  });

  const actions: MapaActions = {
    autocompleteYear: progress.autocompleteYear,
    onAskReset: () => setConfirmResetOpen(true),
    onSearchTermChange: setSearchTerm,
    onSelectSubject: setSelectedSubjectSlug,
    onStatusFilterChange: setStatusFilter,
    onToggleSubject: (subject) => {
      const currentStatus = progress.subjectStatuses[subject.slug];
      setSelectedSubjectSlug(subject.slug);
      if (currentStatus === 'LOCKED') return;
      progress.toggleSubject(subject);
    },
  };

  const confirmReset = () => {
    setConfirmResetOpen(false);
    progress.reset();
    setSelectedSubjectSlug(subjectsData[0]?.slug ?? '');
  };

  if (!progress.isHydrated) return <MapaLoadingState />;

  return (
    <div className="space-y-6">
      <MapaOverviewSection
        actions={actions}
        derived={derived}
        progress={progress}
        searchTerm={searchTerm}
        statusFilter={statusFilter}
      />
      <MapaYearGrid
        actions={actions}
        completed={progress.completed}
        derived={derived}
        selectedSubjectSlug={selectedSubjectSlug}
        subjectStatuses={progress.subjectStatuses}
      />
      <AlertDialog
        open={confirmResetOpen}
        onClose={() => setConfirmResetOpen(false)}
        onConfirm={confirmReset}
        title="Reiniciar el progreso del mapa"
        description="Se va a borrar todo el avance que marcaste en el mapa de correlativas. Esta acción no se puede deshacer."
        confirmText="Reiniciar"
        variant="destructive"
      />
    </div>
  );
}

function useMapaDerivedState({
  availableSubjectSlugs,
  completed,
  searchTerm,
  selectedSubjectSlug,
  statusFilter,
  subjectStatuses,
}: {
  availableSubjectSlugs: string[];
  completed: string[];
  searchTerm: string;
  selectedSubjectSlug: string;
  statusFilter: StatusFilter;
  subjectStatuses: Record<string, SubjectStatus>;
}): MapaDerivedState {
  const availableSlugs = useMemo(() => new Set(availableSubjectSlugs), [availableSubjectSlugs]);
  const suggestedYearToComplete = useSuggestedYear(completed) as MapaYear | null;

  return useMemo(() => {
    const filteredSubjects = getFilteredSubjects(searchTerm, statusFilter, subjectStatuses);
    const selectedSubject = getSelectedSubject(selectedSubjectSlug);
    const selectedStatus = subjectStatuses[selectedSubject.slug] ?? 'UNLOCKED';
    const selectedMissing = getMissingCorrelatives(selectedSubject, completed);
    const selectedUnlocks = getUnlocks(selectedSubject.slug);
    const selectedDirectUnlocks = selectedUnlocks.slice(0, 4);

    return {
      availableSlugs,
      filteredSubjects,
      selectedDirectUnlocks,
      selectedMissing,
      selectedMissingSubjects: resolveSubjectSlugs(selectedMissing).slice(0, 5),
      selectedStatus,
      selectedSubject,
      selectedUnlocks,
      subjectsByYear: groupSubjectsByYear(filteredSubjects),
      suggestedSubjects: getSuggestedSubjects(subjectStatuses),
      suggestedYearToComplete,
    };
  }, [availableSlugs, completed, searchTerm, selectedSubjectSlug, statusFilter, subjectStatuses, suggestedYearToComplete]);
}

function getFilteredSubjects(
  searchTerm: string,
  statusFilter: StatusFilter,
  subjectStatuses: Record<string, SubjectStatus>,
) {
  const normalizedSearch = searchTerm.trim().toLowerCase();

  return subjectsData.filter((subject) => {
    const matchesSearch =
      normalizedSearch.length === 0 ||
      subject.nombre.toLowerCase().includes(normalizedSearch) ||
      subject.codigo.includes(normalizedSearch);
    const matchesStatus = statusFilter === 'ALL' || subjectStatuses[subject.slug] === statusFilter;

    return matchesSearch && matchesStatus;
  });
}

function getSelectedSubject(selectedSubjectSlug: string) {
  return subjectsData.find((subject) => subject.slug === selectedSubjectSlug) ?? subjectsData[0];
}

function getSuggestedSubjects(subjectStatuses: Record<string, SubjectStatus>) {
  return subjectsData
    .filter((subject) => subjectStatuses[subject.slug] === 'UNLOCKED')
    .sort((a, b) => getUnlocks(b.slug).length - getUnlocks(a.slug).length)
    .slice(0, 4);
}

function resolveSubjectSlugs(slugs: string[]) {
  return slugs
    .map((slug) => subjectsData.find((subject) => subject.slug === slug))
    .filter((subject): subject is SubjectNode => Boolean(subject));
}

function groupSubjectsByYear(subjects: SubjectNode[]) {
  const grouped: SubjectsByYear = { 1: [], 2: [], 3: [], 4: [], 5: [] };
  for (const subject of subjects) grouped[subject.year as MapaYear].push(subject);
  return grouped;
}

function MapaLoadingState() {
  return (
    <div className="flex h-96 items-center justify-center">
      <div className="space-y-4 text-center">
        <RefreshCw className="mx-auto size-8 animate-spin text-amber-500" />
        <p className="text-sm font-semibold tracking-wider text-white/40">Cargando mapa curricular…</p>
      </div>
    </div>
  );
}

function MapaOverviewSection({
  actions,
  derived,
  progress,
  searchTerm,
  statusFilter,
}: {
  actions: MapaActions;
  derived: MapaDerivedState;
  progress: MapaProgressState;
  searchTerm: string;
  statusFilter: StatusFilter;
}) {
  return (
    <section className="overflow-hidden rounded-md border border-white/8 bg-surface-1 shadow-2xl">
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="p-5 sm:p-6">
          <MapaOverviewHeader
            completedCount={progress.completedCount}
            progressPercentage={progress.progressPercentage}
            unlockedCount={progress.unlockedCount}
          />
          <MapaProgressBar progressPercentage={progress.progressPercentage} />
          <MapaToolbar
            searchTerm={searchTerm}
            statusFilter={statusFilter}
            onSearchTermChange={actions.onSearchTermChange}
            onStatusFilterChange={actions.onStatusFilterChange}
          />
          <MapaQuickPanels actions={actions} derived={derived} />
        </div>
        <SubjectDetailPanel actions={actions} completed={progress.completed} derived={derived} />
      </div>
    </section>
  );
}

function MapaOverviewHeader({
  completedCount,
  progressPercentage,
  unlockedCount,
}: {
  completedCount: number;
  progressPercentage: number;
  unlockedCount: number;
}) {
  return (
    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
      <div className="max-w-3xl space-y-3">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-amber-300">
          <GraduationCap className="size-4" />
          Plan 2010 · FCYT UADER
        </div>
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
            Mapa de correlativas
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/62">
            Seleccioná una materia para ver sus requisitos. Usá el botón de cada materia para marcar tu avance.
          </p>
        </div>
      </div>
      <div className="w-full space-y-2 sm:min-w-[360px] xl:w-auto">
        <VisualMapLink />
        <MapaStats
          completedCount={completedCount}
          progressPercentage={progressPercentage}
          unlockedCount={unlockedCount}
        />
      </div>
    </div>
  );
}

function VisualMapLink() {
  return (
    <Link
      href="/mapa/visual"
      className="group flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-md border border-cyan-300/20 bg-cyan-300/8 px-3 py-2.5 text-left shadow-[0_0_22px_rgba(103,232,249,0.04)] transition hover:border-cyan-200/45 hover:bg-cyan-300/12"
    >
      <span className="flex items-center gap-3">
        <span className="inline-flex size-9 items-center justify-center rounded bg-cyan-200 text-black shadow-[0_0_18px_rgba(103,232,249,0.18)]">
          <Map className="size-4.5" />
        </span>
        <span>
          <span className="block text-xs font-black uppercase tracking-wider text-cyan-100">
            Vista visual
          </span>
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-white/38">
            Recorrido animado
          </span>
        </span>
      </span>
      <ArrowRight className="size-4 text-cyan-100/45 transition group-hover:translate-x-0.5 group-hover:text-cyan-100" />
    </Link>
  );
}

function MapaStats({
  completedCount,
  progressPercentage,
  unlockedCount,
}: {
  completedCount: number;
  progressPercentage: number;
  unlockedCount: number;
}) {
  return (
    <div className="grid min-w-0 grid-cols-3 gap-2">
      <MapaStatCard tone="emerald" label="Marcadas" value={completedCount} />
      <MapaStatCard tone="amber" label="Disponibles" value={unlockedCount} />
      <MapaStatCard tone="neutral" label="Avance" value={`${progressPercentage}%`} />
    </div>
  );
}

function MapaStatCard({ label, tone, value }: { label: string; tone: 'emerald' | 'amber' | 'neutral'; value: number | string }) {
  return (
    <div
      className={cn(
        'rounded-md border p-3',
        tone === 'emerald' && 'border-emerald-400/20 bg-emerald-500/8',
        tone === 'amber' && 'border-amber-400/20 bg-amber-500/8',
        tone === 'neutral' && 'border-white/10 bg-white/5',
      )}
    >
      <p
        className={cn(
          'text-[10px] font-black uppercase tracking-widest',
          tone === 'emerald' && 'text-emerald-200/70',
          tone === 'amber' && 'text-amber-200/70',
          tone === 'neutral' && 'text-white/45',
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          'mt-2 text-2xl font-black',
          tone === 'emerald' && 'text-emerald-200',
          tone === 'amber' && 'text-amber-200',
          tone === 'neutral' && 'text-white',
        )}
      >
        {value}
      </p>
    </div>
  );
}

function MapaProgressBar({ progressPercentage }: { progressPercentage: number }) {
  return (
    <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/6">
      <div
        className="h-full rounded-full bg-gradient-to-r from-emerald-300 via-amber-300 to-orange-400 transition-all duration-500"
        style={{ width: `${progressPercentage}%` }}
      />
    </div>
  );
}

function MapaToolbar({
  onSearchTermChange,
  onStatusFilterChange,
  searchTerm,
  statusFilter,
}: {
  onSearchTermChange: (value: string) => void;
  onStatusFilterChange: (filter: StatusFilter) => void;
  searchTerm: string;
  statusFilter: StatusFilter;
}) {
  return (
    <div className="mt-6 flex flex-col gap-3 border-t border-white/6 pt-5 xl:flex-row xl:items-center xl:justify-between">
      <div className="relative w-full xl:max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/30" />
        <input
          type="search"
          aria-label="Buscar por materia o código"
          placeholder="Buscar por materia o código"
          value={searchTerm}
          onChange={(event) => onSearchTermChange(event.target.value)}
          className="w-full rounded-md border border-white/10 bg-black/20 py-2.5 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-amber-300/55 focus:bg-white/7"
        />
      </div>
      <StatusFilterButtons statusFilter={statusFilter} onStatusFilterChange={onStatusFilterChange} />
    </div>
  );
}

function StatusFilterButtons({
  onStatusFilterChange,
  statusFilter,
}: {
  onStatusFilterChange: (filter: StatusFilter) => void;
  statusFilter: StatusFilter;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {STATUS_FILTERS.map((filter) => (
        <button
          key={filter}
          type="button"
          onClick={() => onStatusFilterChange(filter)}
          className={cn(
            'inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-xs font-bold transition',
            statusFilter === filter
              ? 'border-amber-300/50 bg-amber-300/12 text-amber-100'
              : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/8 hover:text-white',
          )}
        >
          <Filter className="size-3.5" />
          {filter === 'ALL' ? 'Todas' : STATUS_LABELS[filter]}
        </button>
      ))}
    </div>
  );
}

function MapaQuickPanels({ actions, derived }: { actions: MapaActions; derived: MapaDerivedState }) {
  return (
    <div className="mt-5 grid gap-3 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
      <SuggestedSubjectsPanel
        subjects={derived.suggestedSubjects}
        onSelectSubject={actions.onSelectSubject}
      />
      <SelectedQuickReadPanel derived={derived} onSelectSubject={actions.onSelectSubject} />
    </div>
  );
}

function SuggestedSubjectsPanel({
  onSelectSubject,
  subjects,
}: {
  onSelectSubject: (slug: string) => void;
  subjects: SubjectNode[];
}) {
  return (
    <div className="rounded-md border border-white/8 bg-black/18 p-4">
      <PanelHeading count={subjects.length} eyebrow="Siguiente paso" title="Disponibles con más impacto" />
      {subjects.length === 0 ? (
        <p className="rounded-md bg-white/5 p-3 text-xs leading-5 text-white/45">
          No hay materias disponibles con el progreso actual.
        </p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {subjects.map((subject) => (
            <SuggestedSubjectButton
              key={subject.slug}
              subject={subject}
              onSelectSubject={onSelectSubject}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PanelHeading({ count, eyebrow, title }: { count?: number; eyebrow: string; title: string }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">{eyebrow}</p>
        <h2 className="mt-1 text-sm font-black text-white">{title}</h2>
      </div>
      {typeof count === 'number' ? (
        <span className="rounded-md border border-amber-300/20 bg-amber-400/8 px-2 py-1 text-[10px] font-black text-amber-100">
          {count}
        </span>
      ) : null}
    </div>
  );
}

function SuggestedSubjectButton({
  onSelectSubject,
  subject,
}: {
  onSelectSubject: (slug: string) => void;
  subject: SubjectNode;
}) {
  const unlockCount = getUnlocks(subject.slug).length;

  return (
    <button
      type="button"
      onClick={() => onSelectSubject(subject.slug)}
      className="cursor-pointer rounded-md border border-white/8 bg-white/5 px-3 py-2 text-left transition hover:border-amber-300/35 hover:bg-amber-400/8"
    >
      <span className="block truncate text-xs font-black text-white">{subject.nombre}</span>
      <span className="mt-1 block text-[10px] font-bold uppercase tracking-wider text-amber-100/65">
        Año {subject.year} · habilita {unlockCount}
      </span>
    </button>
  );
}

function SelectedQuickReadPanel({
  derived,
  onSelectSubject,
}: {
  derived: MapaDerivedState;
  onSelectSubject: (slug: string) => void;
}) {
  return (
    <div className="rounded-md border border-white/8 bg-black/18 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">Lectura rápida</p>
          <h2 className="mt-1 text-sm font-black text-white">{derived.selectedSubject.nombre}</h2>
        </div>
        <StatusPill status={derived.selectedStatus} />
      </div>
      {derived.selectedMissingSubjects.length > 0 ? (
        <MissingSubjectsPreview subjects={derived.selectedMissingSubjects} />
      ) : (
        <DirectUnlocksPreview subjects={derived.selectedDirectUnlocks} onSelectSubject={onSelectSubject} />
      )}
    </div>
  );
}

function MissingSubjectsPreview({ subjects }: { subjects: SubjectNode[] }) {
  return (
    <div>
      <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-rose-100/55">
        Falta para cursar
      </p>
      <div className="flex flex-wrap gap-1.5">
        {subjects.map((subject) => (
          <span
            key={subject.slug}
            className="rounded-md border border-rose-300/20 bg-rose-400/10 px-2 py-1 text-[11px] font-semibold text-rose-100"
          >
            {subject.nombre}
          </span>
        ))}
      </div>
    </div>
  );
}

function DirectUnlocksPreview({
  onSelectSubject,
  subjects,
}: {
  onSelectSubject: (slug: string) => void;
  subjects: SubjectNode[];
}) {
  if (subjects.length === 0) {
    return (
      <div>
        <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100/55">
          Habilita directamente
        </p>
        <p className="rounded-md bg-white/5 px-3 py-2 text-xs text-white/45">
          No destraba materias directas.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100/55">
        Habilita directamente
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {subjects.map((subject) => (
          <button
            key={subject.slug}
            type="button"
            onClick={() => onSelectSubject(subject.slug)}
            className="cursor-pointer rounded-md border border-cyan-300/14 bg-cyan-400/8 px-3 py-2 text-left text-xs font-bold text-cyan-50 transition hover:border-cyan-300/30 hover:bg-cyan-400/12"
          >
            {subject.nombre}
          </button>
        ))}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: SubjectStatus }) {
  return (
    <span
      className={cn(
        'rounded-md border px-2 py-1 text-[10px] font-black uppercase tracking-widest',
        status === 'COMPLETED' && 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200',
        status === 'UNLOCKED' && 'border-amber-300/30 bg-amber-400/10 text-amber-200',
        status === 'LOCKED' && 'border-white/10 bg-white/5 text-white/45',
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

function SubjectDetailPanel({
  actions,
  completed,
  derived,
}: {
  actions: MapaActions;
  completed: string[];
  derived: MapaDerivedState;
}) {
  return (
    <aside className="flex h-[520px] flex-col overflow-hidden border-t border-white/8 bg-black/18 p-5 lg:border-l lg:border-t-0">
      <SubjectDetailHeader actions={actions} completed={completed} derived={derived} />
      <SuggestedYearCallout suggestedYearToComplete={derived.suggestedYearToComplete} />
      <div className="mt-4 flex-1 space-y-4 overflow-y-auto pr-1">
        <SubjectOptative subject={derived.selectedSubject} />
        <SubjectFactGrid subject={derived.selectedSubject} />
        <SubjectRelations derived={derived} />
      </div>
    </aside>
  );
}

function SubjectDetailHeader({
  actions,
  completed,
  derived,
}: {
  actions: MapaActions;
  completed: string[];
  derived: MapaDerivedState;
}) {
  return (
    <div className="space-y-4 border-b border-white/8 pb-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">
            Materia seleccionada
          </p>
          <h2 className="mt-2 text-lg font-black leading-tight text-white">{derived.selectedSubject.nombre}</h2>
        </div>
        <StatusPill status={derived.selectedStatus} />
      </div>
      <SubjectDetailActions actions={actions} completed={completed} derived={derived} />
    </div>
  );
}

function SubjectDetailActions({
  actions,
  completed,
  derived,
}: {
  actions: MapaActions;
  completed: string[];
  derived: MapaDerivedState;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <ToggleSubjectButton
        status={derived.selectedStatus}
        subject={derived.selectedSubject}
        onToggleSubject={actions.onToggleSubject}
      />
      <AutocompleteYearButton
        suggestedYearToComplete={derived.suggestedYearToComplete}
        onAutocompleteYear={actions.autocompleteYear}
      />
      <button
        type="button"
        onClick={actions.onAskReset}
        disabled={completed.length === 0}
        className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-red-300/20 bg-red-400/8 px-3 py-2 text-xs font-bold text-red-100 transition hover:bg-red-400/14 disabled:cursor-not-allowed disabled:opacity-35"
      >
        <RefreshCw className="size-3.5" />
        Reiniciar
      </button>
    </div>
  );
}

function ToggleSubjectButton({
  onToggleSubject,
  status,
  subject,
}: {
  onToggleSubject: (subject: SubjectNode) => void;
  status: SubjectStatus;
  subject: SubjectNode;
}) {
  return (
    <button
      type="button"
      onClick={() => onToggleSubject(subject)}
      disabled={status === 'LOCKED'}
      className={cn(
        'inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-35',
        status === 'COMPLETED' &&
          'border-emerald-300/25 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/16',
        status === 'UNLOCKED' &&
          'border-amber-300/25 bg-amber-400/10 text-amber-100 hover:bg-amber-400/16',
        status === 'LOCKED' && 'border-white/10 bg-white/5 text-white/45',
      )}
    >
      {status === 'COMPLETED' ? <RefreshCw className="size-3.5" /> : <Check className="size-3.5" />}
      {status === 'COMPLETED' && 'Quitar marca'}
      {status === 'UNLOCKED' && 'Marcar avance'}
      {status === 'LOCKED' && 'En espera'}
    </button>
  );
}

function AutocompleteYearButton({
  onAutocompleteYear,
  suggestedYearToComplete,
}: {
  onAutocompleteYear: (year: number) => void;
  suggestedYearToComplete: MapaYear | null;
}) {
  if (!suggestedYearToComplete) return null;

  return (
    <button
      type="button"
      onClick={() => onAutocompleteYear(suggestedYearToComplete)}
      className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-emerald-300/20 bg-emerald-400/8 px-3 py-2 text-xs font-bold text-emerald-100 transition hover:bg-emerald-400/14"
    >
      <Sparkles className="size-3.5" />
      Marcar {YEAR_ACTION_LABELS[suggestedYearToComplete]}
    </button>
  );
}

function SuggestedYearCallout({ suggestedYearToComplete }: { suggestedYearToComplete: MapaYear | null }) {
  if (!suggestedYearToComplete) return null;

  return (
    <div className="mt-4 rounded-md border border-emerald-300/14 bg-emerald-400/6 px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-100/60">
        Sugerencia
      </p>
      <p className="mt-1 text-xs leading-5 text-emerald-50/90">
        Ya dejaste listo {YEAR_NAMES[(suggestedYearToComplete - 1) as MapaYear].toLowerCase()}. Si querés avanzar más rápido,
        podés marcar {YEAR_NAMES[suggestedYearToComplete].toLowerCase()} completo.
      </p>
    </div>
  );
}

function SubjectOptative({ subject }: { subject: SubjectNode }) {
  if (!subject.optativaActual) return null;

  return (
    <div className="rounded-md border border-cyan-300/18 bg-cyan-400/8 p-3">
      <p className="text-[10px] font-black uppercase tracking-widest text-cyan-100/60">Optativa 2025</p>
      <p className="mt-1 text-sm font-semibold leading-5 text-cyan-50">{subject.optativaActual}</p>
    </div>
  );
}

function SubjectFactGrid({ subject }: { subject: SubjectNode }) {
  return (
    <div className="grid grid-cols-3 gap-2 text-center">
      <SubjectFact label="Código" value={subject.codigo} />
      <SubjectFact label="Horas" value={subject.horas} />
      <SubjectFact label="Año" value={subject.year} />
    </div>
  );
}

function SubjectFact({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md bg-white/5 p-2">
      <p className="text-[10px] font-bold uppercase tracking-widest text-white/35">{label}</p>
      <p className="mt-1 text-sm font-black text-white">{value}</p>
    </div>
  );
}

function SubjectRelations({ derived }: { derived: MapaDerivedState }) {
  return (
    <div className="space-y-3">
      <RelationList
        title="Para cursar"
        slugs={derived.selectedSubject.correlativas}
        empty="Sin requisitos previos."
        missing={derived.selectedMissing}
      />
      <RelationList
        title="Para rendir"
        slugs={derived.selectedSubject.paraRendir ?? []}
        empty="Sin requisitos extra cargados."
      />
      <RelationList
        title="Habilita"
        slugs={derived.selectedUnlocks.map((subject) => subject.slug)}
        empty="No destraba materias directas."
      />
    </div>
  );
}

function MapaYearGrid({
  actions,
  completed,
  derived,
  selectedSubjectSlug,
  subjectStatuses,
}: {
  actions: MapaActions;
  completed: string[];
  derived: MapaDerivedState;
  selectedSubjectSlug: string;
  subjectStatuses: Record<string, SubjectStatus>;
}) {
  return (
    <section className="grid gap-4 xl:grid-cols-5">
      {MAPA_YEARS.map((year) => (
        <MapaYearColumn
          key={year}
          actions={actions}
          availableSlugs={derived.availableSlugs}
          completed={completed}
          selectedSubject={derived.selectedSubject}
          selectedSubjectSlug={selectedSubjectSlug}
          selectedUnlocks={derived.selectedUnlocks}
          subjectStatuses={subjectStatuses}
          subjects={derived.subjectsByYear[year]}
          year={year}
        />
      ))}
    </section>
  );
}

function MapaYearColumn({
  actions,
  availableSlugs,
  completed,
  selectedSubject,
  selectedSubjectSlug,
  selectedUnlocks,
  subjectStatuses,
  subjects,
  year,
}: {
  actions: MapaActions;
  availableSlugs: Set<string>;
  completed: string[];
  selectedSubject: SubjectNode;
  selectedSubjectSlug: string;
  selectedUnlocks: SubjectNode[];
  subjectStatuses: Record<string, SubjectStatus>;
  subjects: SubjectNode[];
  year: MapaYear;
}) {
  return (
    <div className="rounded-md border border-white/8 bg-surface-2/50 p-3">
      <MapaYearHeader subjectsCount={subjects.length} year={year} />
      <div className="space-y-2">
        {subjects.length === 0 ? (
          <p className="py-6 text-center text-xs text-white/30">Sin resultados.</p>
        ) : (
          subjects.map((subject) => (
            <MapaSubjectCard
              key={subject.slug}
              availableSlugs={availableSlugs}
              completed={completed}
              isSelected={selectedSubjectSlug === subject.slug}
              isUnlock={selectedUnlocks.some((unlock) => unlock.slug === subject.slug)}
              selectedSubject={selectedSubject}
              status={subjectStatuses[subject.slug]}
              subject={subject}
              onSelectSubject={actions.onSelectSubject}
              onToggleSubject={actions.onToggleSubject}
            />
          ))
        )}
      </div>
    </div>
  );
}

function MapaYearHeader({ subjectsCount, year }: { subjectsCount: number; year: MapaYear }) {
  return (
    <div className="mb-3 flex items-center justify-between border-b border-white/8 pb-3">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">Año {year}</p>
        <h3 className="text-sm font-black text-white">{YEAR_NAMES[year]}</h3>
      </div>
      <span className="rounded-md bg-white/6 px-2 py-1 text-[10px] font-black text-white/55">
        {subjectsCount}
      </span>
    </div>
  );
}

function MapaSubjectCard({
  availableSlugs,
  completed,
  isSelected,
  isUnlock,
  onSelectSubject,
  onToggleSubject,
  selectedSubject,
  status,
  subject,
}: {
  availableSlugs: Set<string>;
  completed: string[];
  isSelected: boolean;
  isUnlock: boolean;
  onSelectSubject: (slug: string) => void;
  onToggleSubject: (subject: SubjectNode) => void;
  selectedSubject: SubjectNode;
  status: SubjectStatus;
  subject: SubjectNode;
}) {
  const isCompleted = status === 'COMPLETED';
  const isRequirement = !isCompleted && selectedSubject.correlativas.includes(subject.slug);
  const missing = getMissingCorrelatives(subject, completed);
  const hasPage = availableSlugs.size === 0 || availableSlugs.has(subject.slug);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelectSubject(subject.slug)}
      onKeyDown={(event) => selectSubjectWithKeyboard(event, subject.slug, onSelectSubject)}
      aria-label={`Ver detalles de ${subject.nombre}`}
      className={cn(
        'group relative flex min-h-[132px] w-full cursor-pointer flex-col justify-between rounded-md border p-3 text-left transition duration-200',
        isCompleted && 'border-emerald-300/35 bg-emerald-400/10 shadow-[0_0_18px_rgba(52,211,153,0.06)]',
        status === 'UNLOCKED' && 'border-white/10 bg-surface-1 hover:border-amber-300/45 hover:bg-white/6',
        status === 'LOCKED' && 'cursor-not-allowed border-white/6 bg-black/15 opacity-55',
        isSelected && 'ring-2 ring-amber-300/40',
        isRequirement && 'border-rose-300/45 bg-rose-400/8',
        isUnlock && 'border-cyan-300/45 bg-cyan-400/8',
      )}
    >
      <SubjectCardHeader status={status} subject={subject} />
      <SubjectCardFooter
        hasPage={hasPage}
        isCompleted={isCompleted}
        missing={missing}
        onToggleSubject={onToggleSubject}
        status={status}
        subject={subject}
      />
    </div>
  );
}

function selectSubjectWithKeyboard(
  event: React.KeyboardEvent<HTMLDivElement>,
  subjectSlug: string,
  onSelectSubject: (slug: string) => void,
) {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  onSelectSubject(subjectSlug);
}

function SubjectCardHeader({ status, subject }: { status: SubjectStatus; subject: SubjectNode }) {
  return (
    <div className="space-y-2 pr-5">
      <div className="absolute right-3 top-3">
        {status === 'COMPLETED' ? <CheckCircle2 className="size-4 text-emerald-200" /> : null}
        {status === 'UNLOCKED' ? <Unlock className="size-4 text-amber-200/70" /> : null}
        {status === 'LOCKED' ? <Lock className="size-4 text-white/30" /> : null}
      </div>
      <p className="text-[10px] font-black uppercase tracking-widest text-white/35">
        {subject.codigo} · {subject.periodo}
      </p>
      <h4 className="text-sm font-black leading-snug text-white">{subject.nombre}</h4>
      {subject.optativaActual ? (
        <p className="line-clamp-2 text-[11px] font-semibold leading-4 text-cyan-100/70">
          {subject.optativaActual}
        </p>
      ) : null}
    </div>
  );
}

function SubjectCardFooter({
  hasPage,
  isCompleted,
  missing,
  onToggleSubject,
  status,
  subject,
}: {
  hasPage: boolean;
  isCompleted: boolean;
  missing: string[];
  onToggleSubject: (subject: SubjectNode) => void;
  status: SubjectStatus;
  subject: SubjectNode;
}) {
  return (
    <div className="mt-3 space-y-2 border-t border-white/8 pt-2">
      <SubjectCardStatusRow status={status} subject={subject} />
      <SubjectMissingLine missing={missing} />
      {status !== 'LOCKED' ? (
        <SubjectCardActions
          hasPage={hasPage}
          isCompleted={isCompleted}
          onToggleSubject={onToggleSubject}
          subject={subject}
        />
      ) : (
        <LockedSubjectButton />
      )}
    </div>
  );
}

function SubjectCardStatusRow({ status, subject }: { status: SubjectStatus; subject: SubjectNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span
        className={cn(
          'text-[10px] font-black uppercase tracking-widest',
          status === 'COMPLETED' && 'text-emerald-200',
          status === 'UNLOCKED' && 'text-amber-200',
          status === 'LOCKED' && 'text-white/35',
        )}
      >
        {STATUS_LABELS[status]}
      </span>
      <span className="text-[10px] font-semibold text-white/35">
        {subject.correlativas.length === 0
          ? 'Sin correlativas'
          : `${subject.correlativas.length} requisito${subject.correlativas.length > 1 ? 's' : ''}`}
      </span>
    </div>
  );
}

function SubjectMissingLine({ missing }: { missing: string[] }) {
  if (missing.length === 0) return null;

  return (
    <p className="truncate text-[10px] font-semibold text-rose-100/70">
      Falta: {missing.map(getSubjectName).join(', ')}
    </p>
  );
}

function SubjectCardActions({
  hasPage,
  isCompleted,
  onToggleSubject,
  subject,
}: {
  hasPage: boolean;
  isCompleted: boolean;
  onToggleSubject: (subject: SubjectNode) => void;
  subject: SubjectNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <SubjectPageLink hasPage={hasPage} subject={subject} />
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onToggleSubject(subject);
        }}
        className={cn(
          'inline-flex cursor-pointer items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-black uppercase tracking-wider transition',
          isCompleted
            ? 'border-emerald-300/25 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/16'
            : 'border-amber-300/25 bg-amber-400/10 text-amber-100 hover:bg-amber-400/16',
        )}
      >
        {isCompleted ? <RefreshCw className="size-3" /> : <Check className="size-3" />}
        {isCompleted ? 'Quitar' : 'Marcar'}
      </button>
    </div>
  );
}

function SubjectPageLink({ hasPage, subject }: { hasPage: boolean; subject: SubjectNode }) {
  if (!hasPage) return <span className="text-[10px] font-bold text-white/28">Ver detalle</span>;

  return (
    <Link
      href={buildSubjectHref({
        yearSlug: yearSlugFromNumber(subject.year),
        subjectSlug: subject.slug,
      })}
      onClick={(event) => event.stopPropagation()}
      className="inline-flex w-fit cursor-pointer items-center gap-1 text-[10px] font-bold text-white/40 transition hover:text-white"
    >
      <BookOpen className="size-3" />
      Abrir materia
      <ArrowRight className="size-3" />
    </Link>
  );
}

function LockedSubjectButton() {
  return (
    <button
      type="button"
      disabled
      className="inline-flex cursor-not-allowed items-center gap-1 rounded-md border border-white/8 bg-white/5 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-white/28"
    >
      <Lock className="size-3" />
      En espera
    </button>
  );
}

function RelationList({
  title,
  slugs,
  empty,
  missing = [],
}: {
  title: string;
  slugs: string[];
  empty: string;
  missing?: string[];
}) {
  return (
    <div>
      <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/35">{title}</p>
      {slugs.length === 0 ? (
        <p className="rounded-md bg-white/5 px-3 py-2 text-xs text-white/45">{empty}</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {slugs.map((slug) => (
            <RelationBadge key={slug} missing={missing.includes(slug)} slug={slug} />
          ))}
        </div>
      )}
    </div>
  );
}

function RelationBadge({ missing, slug }: { missing: boolean; slug: string }) {
  return (
    <span
      className={cn(
        'rounded-md border px-2 py-1 text-[11px] font-semibold leading-4',
        missing
          ? 'border-rose-300/25 bg-rose-400/10 text-rose-100'
          : 'border-white/10 bg-white/5 text-white/70',
      )}
    >
      {getSubjectName(slug)}
    </span>
  );
}
