'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  Filter,
  GraduationCap,
  Info,
  Lock,
  RefreshCw,
  Search,
  Sparkles,
  Unlock,
} from 'lucide-react';
import { subjectsData } from '@/lib/domain/mapa/correlativasData';
import { calculateSubjectStatuses } from '@/lib/domain/mapa/unlockLogic';
import type { SubjectNode, SubjectStatus } from '@/lib/domain/mapa/types';
import { cn } from '@/lib/utils';

type StatusFilter = 'ALL' | SubjectStatus;

type MapaCorrelativasProps = {
  availableSubjectSlugs?: string[];
};

const YEAR_NAMES: Record<number, string> = {
  1: 'Primer año',
  2: 'Segundo año',
  3: 'Tercer año',
  4: 'Cuarto año',
  5: 'Quinto año',
};

const YEAR_ACTION_LABELS: Record<number, string> = {
  1: '1er año',
  2: '2do año',
  3: '3er año',
  4: '4to año',
  5: '5to año',
};

const STATUS_LABELS: Record<SubjectStatus, string> = {
  COMPLETED: 'Marcada',
  UNLOCKED: 'Disponible',
  LOCKED: 'En espera',
};

function getSubjectName(slug: string) {
  return subjectsData.find((subject) => subject.slug === slug)?.nombre ?? 'Materia';
}

function getUnlocks(slug: string) {
  return subjectsData.filter((subject) => subject.correlativas.includes(slug));
}

function getMissingCorrelatives(subject: SubjectNode, completed: string[]) {
  return subject.correlativas.filter((slug) => !completed.includes(slug));
}

export function MapaCorrelativas({ availableSubjectSlugs = [] }: MapaCorrelativasProps) {
  const [completed, setCompleted] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [selectedSubjectSlug, setSelectedSubjectSlug] = useState(subjectsData[0]?.slug ?? '');
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('nextcampus_progreso_materias');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as string[];
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCompleted(parsed.filter((slug) => subjectsData.some((subject) => subject.slug === slug)));
      } catch {
        localStorage.removeItem('nextcampus_progreso_materias');
      }
    }
    setIsHydrated(true);
  }, []);

  const availableSlugs = useMemo(() => new Set(availableSubjectSlugs), [availableSubjectSlugs]);
  const subjectStatuses = useMemo(() => calculateSubjectStatuses(completed), [completed]);

  const saveProgress = (newCompleted: string[]) => {
    setCompleted(newCompleted);
    localStorage.setItem('nextcampus_progreso_materias', JSON.stringify(newCompleted));
  };

  const removeSubjectAndDependents = (slugToRemove: string, currentCompleted: string[]): string[] => {
    let nextCompleted = currentCompleted.filter((slug) => slug !== slugToRemove);
    const dependents = subjectsData.filter(
      (subject) => subject.correlativas.includes(slugToRemove) && nextCompleted.includes(subject.slug),
    );

    for (const dependent of dependents) {
      nextCompleted = removeSubjectAndDependents(dependent.slug, nextCompleted);
    }

    return nextCompleted;
  };

  const handleToggleSubject = (subject: SubjectNode) => {
    const currentStatus = subjectStatuses[subject.slug];
    setSelectedSubjectSlug(subject.slug);

    if (currentStatus === 'LOCKED') return;

    if (currentStatus === 'COMPLETED') {
      saveProgress(removeSubjectAndDependents(subject.slug, completed));
      return;
    }

    saveProgress(Array.from(new Set([...completed, subject.slug])));
  };

  const handleReset = () => {
    if (window.confirm('¿Reiniciar el progreso del mapa?')) {
      saveProgress([]);
      setSelectedSubjectSlug(subjectsData[0]?.slug ?? '');
    }
  };

  const handleAutocompleteYear = (year: number) => {
    const yearSlugs = subjectsData.filter((subject) => subject.year === year).map((subject) => subject.slug);
    saveProgress(Array.from(new Set([...completed, ...yearSlugs])));
  };

  const filteredSubjects = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return subjectsData.filter((subject) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        subject.nombre.toLowerCase().includes(normalizedSearch) ||
        subject.codigo.includes(normalizedSearch);
      const matchesStatus = statusFilter === 'ALL' || subjectStatuses[subject.slug] === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [searchTerm, statusFilter, subjectStatuses]);

  const selectedSubject = subjectsData.find((subject) => subject.slug === selectedSubjectSlug) ?? subjectsData[0];
  const selectedStatus = selectedSubject ? subjectStatuses[selectedSubject.slug] : 'UNLOCKED';
  const selectedMissing = selectedSubject ? getMissingCorrelatives(selectedSubject, completed) : [];
  const selectedUnlocks = selectedSubject ? getUnlocks(selectedSubject.slug) : [];
  const completedCount = completed.length;
  const totalSubjects = subjectsData.length;
  const unlockedCount = Object.values(subjectStatuses).filter((status) => status === 'UNLOCKED').length;
  const progressPercentage = Math.round((completedCount / totalSubjects) * 100);
  const suggestedSubjects = subjectsData
    .filter((subject) => subjectStatuses[subject.slug] === 'UNLOCKED')
    .sort((a, b) => getUnlocks(b.slug).length - getUnlocks(a.slug).length)
    .slice(0, 4);
  const selectedMissingSubjects = selectedMissing
    .map((slug) => subjectsData.find((subject) => subject.slug === slug))
    .filter((subject): subject is SubjectNode => Boolean(subject));
  const selectedDirectUnlocks = selectedUnlocks.slice(0, 4);
  const suggestedYearToComplete = useMemo(() => {
    for (let year = 1; year <= 5; year += 1) {
      const yearSubjects = subjectsData.filter((subject) => subject.year === year);
      const yearIsCompleted = yearSubjects.every((subject) => completed.includes(subject.slug));

      if (!yearIsCompleted) {
        return year > 1 ? year : null;
      }
    }

    return null;
  }, [completed]);

  if (!isHydrated) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="space-y-4 text-center">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-amber-500" />
          <p className="text-sm font-semibold tracking-wider text-white/40">Cargando mapa curricular...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-md border border-white/8 bg-surface-1 shadow-2xl">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="p-5 sm:p-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="max-w-3xl space-y-3">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-amber-300">
                  <GraduationCap className="h-4 w-4" />
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

              <div className="grid min-w-0 grid-cols-3 gap-2 sm:min-w-[360px]">
                <div className="rounded-md border border-emerald-400/20 bg-emerald-500/8 p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-200/70">Marcadas</p>
                  <p className="mt-2 text-2xl font-black text-emerald-200">{completedCount}</p>
                </div>
                <div className="rounded-md border border-amber-400/20 bg-amber-500/8 p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-200/70">Disponibles</p>
                  <p className="mt-2 text-2xl font-black text-amber-200">{unlockedCount}</p>
                </div>
                <div className="rounded-md border border-white/10 bg-white/5 p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/45">Avance</p>
                  <p className="mt-2 text-2xl font-black text-white">{progressPercentage}%</p>
                </div>
              </div>
            </div>

            <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/6">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-300 via-amber-300 to-orange-400 transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>

            <div className="mt-6 flex flex-col gap-3 border-t border-white/6 pt-5 xl:flex-row xl:items-center xl:justify-between">
              <div className="relative w-full xl:max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                <input
                  type="search"
                  placeholder="Buscar por materia o código"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="w-full rounded-md border border-white/10 bg-black/20 py-2.5 pl-10 pr-4 text-sm text-white outline-none transition focus:border-amber-300/55 focus:bg-white/7 placeholder:text-white/30"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {(['ALL', 'UNLOCKED', 'LOCKED', 'COMPLETED'] as const).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setStatusFilter(filter)}
                    className={cn(
                      'inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-xs font-bold transition',
                      statusFilter === filter
                        ? 'border-amber-300/50 bg-amber-300/12 text-amber-100'
                        : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/8 hover:text-white',
                    )}
                  >
                    <Filter className="h-3.5 w-3.5" />
                    {filter === 'ALL' ? 'Todas' : STATUS_LABELS[filter]}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 grid gap-3 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
              <div className="rounded-md border border-white/8 bg-black/18 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">Siguiente paso</p>
                    <h2 className="mt-1 text-sm font-black text-white">Disponibles con más impacto</h2>
                  </div>
                  <span className="rounded-md border border-amber-300/20 bg-amber-400/8 px-2 py-1 text-[10px] font-black text-amber-100">
                    {suggestedSubjects.length}
                  </span>
                </div>

                {suggestedSubjects.length === 0 ? (
                  <p className="rounded-md bg-white/5 px-3 py-3 text-xs leading-5 text-white/45">
                    No hay materias disponibles con el progreso actual.
                  </p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {suggestedSubjects.map((subject) => {
                      const unlockCount = getUnlocks(subject.slug).length;

                      return (
                        <button
                          key={subject.slug}
                          type="button"
                          onClick={() => setSelectedSubjectSlug(subject.slug)}
                          className="cursor-pointer rounded-md border border-white/8 bg-white/5 px-3 py-2 text-left transition hover:border-amber-300/35 hover:bg-amber-400/8"
                        >
                          <span className="block truncate text-xs font-black text-white">{subject.nombre}</span>
                          <span className="mt-1 block text-[10px] font-bold uppercase tracking-wider text-amber-100/65">
                            Año {subject.year} · habilita {unlockCount}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="rounded-md border border-white/8 bg-black/18 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">Lectura rápida</p>
                    <h2 className="mt-1 text-sm font-black text-white">{selectedSubject?.nombre}</h2>
                  </div>
                  <span
                    className={cn(
                      'rounded-md border px-2 py-1 text-[10px] font-black uppercase tracking-widest',
                      selectedStatus === 'COMPLETED' && 'border-emerald-300/25 bg-emerald-400/10 text-emerald-100',
                      selectedStatus === 'UNLOCKED' && 'border-amber-300/25 bg-amber-400/10 text-amber-100',
                      selectedStatus === 'LOCKED' && 'border-white/10 bg-white/5 text-white/42',
                    )}
                  >
                    {STATUS_LABELS[selectedStatus]}
                  </span>
                </div>

                {selectedMissingSubjects.length > 0 ? (
                  <div>
                    <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-rose-100/55">Falta para cursar</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedMissingSubjects.slice(0, 5).map((subject) => (
                        <span key={subject.slug} className="rounded-md border border-rose-300/20 bg-rose-400/10 px-2 py-1 text-[11px] font-semibold text-rose-100">
                          {subject.nombre}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100/55">Habilita directamente</p>
                    {selectedDirectUnlocks.length === 0 ? (
                      <p className="rounded-md bg-white/5 px-3 py-2 text-xs text-white/45">No destraba materias directas.</p>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {selectedDirectUnlocks.map((subject) => (
                          <button
                            key={subject.slug}
                            type="button"
                            onClick={() => setSelectedSubjectSlug(subject.slug)}
                            className="cursor-pointer rounded-md border border-cyan-300/14 bg-cyan-400/8 px-3 py-2 text-left text-xs font-bold text-cyan-50 transition hover:border-cyan-300/30 hover:bg-cyan-400/12"
                          >
                            {subject.nombre}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <aside className="flex h-[520px] flex-col overflow-hidden border-t border-white/8 bg-black/18 p-5 lg:border-l lg:border-t-0">
            <div className="space-y-4 border-b border-white/8 pb-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">Materia seleccionada</p>
                  <h2 className="mt-2 text-lg font-black leading-tight text-white">{selectedSubject?.nombre}</h2>
                </div>
                <span
                  className={cn(
                    'rounded-md border px-2 py-1 text-[10px] font-black uppercase tracking-widest',
                    selectedStatus === 'COMPLETED' && 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200',
                    selectedStatus === 'UNLOCKED' && 'border-amber-300/30 bg-amber-400/10 text-amber-200',
                    selectedStatus === 'LOCKED' && 'border-white/10 bg-white/5 text-white/45',
                  )}
                >
                  {STATUS_LABELS[selectedStatus]}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {selectedSubject ? (
                  <button
                    type="button"
                    onClick={() => handleToggleSubject(selectedSubject)}
                    disabled={selectedStatus === 'LOCKED'}
                    className={cn(
                      'inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-35',
                      selectedStatus === 'COMPLETED' &&
                        'border-emerald-300/25 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/16',
                      selectedStatus === 'UNLOCKED' &&
                        'border-amber-300/25 bg-amber-400/10 text-amber-100 hover:bg-amber-400/16',
                      selectedStatus === 'LOCKED' &&
                        'border-white/10 bg-white/5 text-white/45',
                    )}
                  >
                    {selectedStatus === 'COMPLETED' ? <RefreshCw className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                    {selectedStatus === 'COMPLETED' && 'Quitar marca'}
                    {selectedStatus === 'UNLOCKED' && 'Marcar avance'}
                    {selectedStatus === 'LOCKED' && 'En espera'}
                  </button>
                ) : null}
                {suggestedYearToComplete ? (
                  <button
                    type="button"
                    onClick={() => handleAutocompleteYear(suggestedYearToComplete)}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-emerald-300/20 bg-emerald-400/8 px-3 py-2 text-xs font-bold text-emerald-100 transition hover:bg-emerald-400/14"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Marcar {YEAR_ACTION_LABELS[suggestedYearToComplete]}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={completed.length === 0}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-red-300/20 bg-red-400/8 px-3 py-2 text-xs font-bold text-red-100 transition hover:bg-red-400/14 disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Reiniciar
                </button>
              </div>
            </div>

            {suggestedYearToComplete ? (
              <div className="mt-4 rounded-md border border-emerald-300/14 bg-emerald-400/6 px-3 py-2">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-100/60">Sugerencia</p>
                <p className="mt-1 text-xs leading-5 text-emerald-50/90">
                  Ya dejaste listo {YEAR_NAMES[suggestedYearToComplete - 1].toLowerCase()}. Si querés avanzar más rápido,
                  podés marcar {YEAR_NAMES[suggestedYearToComplete].toLowerCase()} completo.
                </p>
              </div>
            ) : null}

            <div className="mt-4 flex-1 space-y-4 overflow-y-auto pr-1">
              {selectedSubject?.optativaActual ? (
                <div className="rounded-md border border-cyan-300/18 bg-cyan-400/8 p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-cyan-100/60">Optativa 2025</p>
                  <p className="mt-1 text-sm font-semibold leading-5 text-cyan-50">{selectedSubject.optativaActual}</p>
                </div>
              ) : null}

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-md bg-white/5 p-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/35">Código</p>
                  <p className="mt-1 text-sm font-black text-white">{selectedSubject?.codigo}</p>
                </div>
                <div className="rounded-md bg-white/5 p-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/35">Horas</p>
                  <p className="mt-1 text-sm font-black text-white">{selectedSubject?.horas}</p>
                </div>
                <div className="rounded-md bg-white/5 p-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/35">Año</p>
                  <p className="mt-1 text-sm font-black text-white">{selectedSubject?.year}</p>
                </div>
              </div>

              <div className="space-y-3">
                <RelationList title="Para cursar" slugs={selectedSubject?.correlativas ?? []} empty="Sin requisitos previos." missing={selectedMissing} />
                <RelationList title="Para rendir" slugs={selectedSubject?.paraRendir ?? []} empty="Sin requisitos extra cargados." />
                <RelationList title="Habilita" slugs={selectedUnlocks.map((subject) => subject.slug)} empty="No destraba materias directas." />
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-5">
        {[1, 2, 3, 4, 5].map((year) => {
          const yearSubjects = filteredSubjects.filter((subject) => subject.year === year);

          return (
            <div key={year} className="rounded-md border border-white/8 bg-surface-2/50 p-3">
              <div className="mb-3 flex items-center justify-between border-b border-white/8 pb-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">Año {year}</p>
                  <h3 className="text-sm font-black text-white">{YEAR_NAMES[year]}</h3>
                </div>
                <span className="rounded-md bg-white/6 px-2 py-1 text-[10px] font-black text-white/55">
                  {yearSubjects.length}
                </span>
              </div>

              <div className="space-y-2">
                {yearSubjects.length === 0 ? (
                  <p className="py-6 text-center text-xs text-white/30">Sin resultados.</p>
                ) : (
                  yearSubjects.map((subject) => {
                    const status = subjectStatuses[subject.slug];
                    const isSelected = selectedSubjectSlug === subject.slug;
                    const isCompleted = status === 'COMPLETED';
                    const isRequirement = !isCompleted && selectedSubject?.correlativas.includes(subject.slug);
                    const isUnlock = !isCompleted && selectedUnlocks.some((unlock) => unlock.slug === subject.slug);
                    const missing = getMissingCorrelatives(subject, completed);
                    const hasPage = availableSlugs.size === 0 || availableSlugs.has(subject.slug);

                    return (
                      <div
                        key={subject.slug}
                        tabIndex={0}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => setSelectedSubjectSlug(subject.slug)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            setSelectedSubjectSlug(subject.slug);
                          }
                        }}
                        onFocus={() => setSelectedSubjectSlug(subject.slug)}
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
                        <div className="space-y-2 pr-5">
                          <div className="absolute right-3 top-3">
                            {status === 'COMPLETED' ? <CheckCircle2 className="h-4 w-4 text-emerald-200" /> : null}
                            {status === 'UNLOCKED' ? <Unlock className="h-4 w-4 text-amber-200/70" /> : null}
                            {status === 'LOCKED' ? <Lock className="h-4 w-4 text-white/30" /> : null}
                          </div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-white/35">
                            {subject.codigo} · {subject.periodo}
                          </p>
                          <h4 className="text-sm font-black leading-snug text-white">{subject.nombre}</h4>
                          {subject.optativaActual ? (
                            <p className="line-clamp-2 text-[11px] font-semibold leading-4 text-cyan-100/70">{subject.optativaActual}</p>
                          ) : null}
                        </div>

                        <div className="mt-3 space-y-2 border-t border-white/8 pt-2">
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
                              {subject.correlativas.length === 0 ? 'Sin correlativas' : `${subject.correlativas.length} requisito${subject.correlativas.length > 1 ? 's' : ''}`}
                            </span>
                          </div>

                          {missing.length > 0 ? (
                            <p className="truncate text-[10px] font-semibold text-rose-100/70">
                              Falta: {missing.map(getSubjectName).join(', ')}
                            </p>
                          ) : null}

                          {status !== 'LOCKED' ? (
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              {hasPage ? (
                                <Link
                                  href={`/materia/${subject.slug}`}
                                  onClick={(event) => event.stopPropagation()}
                                  className="inline-flex w-fit items-center gap-1 text-[10px] font-bold text-white/40 transition hover:text-white"
                                >
                                  <BookOpen className="h-3 w-3" />
                                  Abrir materia
                                  <ArrowRight className="h-3 w-3" />
                                </Link>
                              ) : (
                                <span className="text-[10px] font-bold text-white/28">Ver detalle</span>
                              )}

                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleToggleSubject(subject);
                                }}
                                className={cn(
                                  'inline-flex cursor-pointer items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-black uppercase tracking-wider transition',
                                  isCompleted
                                    ? 'border-emerald-300/25 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/16'
                                    : 'border-amber-300/25 bg-amber-400/10 text-amber-100 hover:bg-amber-400/16',
                                )}
                              >
                                {isCompleted ? <RefreshCw className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                                {isCompleted ? 'Quitar' : 'Marcar'}
                              </button>
                            </div>
                          ) : null}

                          {status === 'LOCKED' ? (
                            <button
                              type="button"
                              disabled
                              className="inline-flex cursor-not-allowed items-center gap-1 rounded-md border border-white/8 bg-white/5 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-white/28"
                            >
                              <Lock className="h-3 w-3" />
                              En espera
                            </button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </section>

      <section className="flex max-w-4xl flex-col gap-4 rounded-md border border-white/8 bg-surface-1 p-4 text-xs leading-6 text-white/55 md:flex-row">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
        <p>
          Los desbloqueos se calculan con las correlativas para cursar del plan leído en Plande. Las correlativas para rendir aparecen en el panel lateral cuando existen, porque aplican a otra instancia de la materia.
        </p>
      </section>
    </div>
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
          {slugs.map((slug) => {
            const isMissing = missing.includes(slug);

            return (
              <span
                key={slug}
                className={cn(
                  'rounded-md border px-2 py-1 text-[11px] font-semibold leading-4',
                  isMissing
                    ? 'border-rose-300/25 bg-rose-400/10 text-rose-100'
                    : 'border-white/10 bg-white/5 text-white/70',
                )}
              >
                {getSubjectName(slug)}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
