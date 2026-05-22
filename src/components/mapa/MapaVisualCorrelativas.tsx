'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Lock,
  Radar,
  RefreshCw,
  Sparkles,
  Unlock,
} from 'lucide-react';
import { subjectsData } from '@/lib/domain/mapa/correlativasData';
import { calculateSubjectStatuses } from '@/lib/domain/mapa/unlockLogic';
import type { SubjectNode, SubjectStatus } from '@/lib/domain/mapa/types';
import { cn } from '@/lib/utils';

type MapaVisualCorrelativasProps = {
  availableSubjectSlugs?: string[];
};

const STORAGE_KEY = 'nextcampus_progreso_materias';
const NODE_WIDTH = 198;
const NODE_HEIGHT = 76;
const YEAR_GAP = 288;
const ROW_GAP = 108;
const START_X = 92;
const START_Y = 142;

const STATUS_COPY: Record<SubjectStatus, string> = {
  COMPLETED: 'Completada',
  UNLOCKED: 'Disponible',
  LOCKED: 'En espera',
};

const STATUS_STYLES: Record<SubjectStatus, string> = {
  COMPLETED: 'border-emerald-200/45 bg-emerald-300/14 text-emerald-50 shadow-[0_0_26px_rgba(52,211,153,0.16)]',
  UNLOCKED: 'border-amber-200/42 bg-amber-300/12 text-amber-50 shadow-[0_0_26px_rgba(251,191,36,0.12)]',
  LOCKED: 'border-white/10 bg-black/32 text-white/52 shadow-none',
};

const YEAR_LABELS: Record<number, string> = {
  1: 'Primer año',
  2: 'Segundo año',
  3: 'Tercer año',
  4: 'Cuarto año',
  5: 'Quinto año',
};

function getUnlocks(slug: string) {
  return subjectsData.filter((subject) => subject.correlativas.includes(slug));
}

function getSubjectName(slug: string) {
  return subjectsData.find((subject) => subject.slug === slug)?.nombre ?? 'Materia';
}

function removeSubjectAndDependents(slugToRemove: string, currentCompleted: string[]): string[] {
  let nextCompleted = currentCompleted.filter((slug) => slug !== slugToRemove);
  const dependents = subjectsData.filter(
    (subject) => subject.correlativas.includes(slugToRemove) && nextCompleted.includes(subject.slug),
  );

  for (const dependent of dependents) {
    nextCompleted = removeSubjectAndDependents(dependent.slug, nextCompleted);
  }

  return nextCompleted;
}

function getNodePosition(subject: SubjectNode) {
  const subjectsInYear = subjectsData.filter((item) => item.year === subject.year);
  const yearIndex = subject.year - 1;
  const rowIndex = subjectsInYear.findIndex((item) => item.slug === subject.slug);
  const columnDrift = subject.year % 2 === 0 ? 34 : 0;
  const rowDrift = rowIndex % 2 === 0 ? 0 : 18;

  return {
    x: START_X + yearIndex * YEAR_GAP,
    y: START_Y + rowIndex * ROW_GAP + columnDrift + rowDrift,
  };
}

function createPath(from: SubjectNode, to: SubjectNode) {
  const start = getNodePosition(from);
  const end = getNodePosition(to);
  const sx = start.x + NODE_WIDTH;
  const sy = start.y + NODE_HEIGHT / 2;
  const ex = end.x;
  const ey = end.y + NODE_HEIGHT / 2;
  const curve = Math.max(76, (ex - sx) * 0.44);

  return `M ${sx} ${sy} C ${sx + curve} ${sy}, ${ex - curve} ${ey}, ${ex} ${ey}`;
}

export function MapaVisualCorrelativas({ availableSubjectSlugs = [] }: MapaVisualCorrelativasProps) {
  const [completed, setCompleted] = useState<string[]>([]);
  const [selectedSlug, setSelectedSlug] = useState(subjectsData[0]?.slug ?? '');
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved) {
      try {
        const parsed = JSON.parse(saved) as string[];
        const validProgress = parsed.filter((slug) => subjectsData.some((subject) => subject.slug === slug));
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCompleted(validProgress);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }

    setIsHydrated(true);
  }, []);

  const availableSlugs = useMemo(() => new Set(availableSubjectSlugs), [availableSubjectSlugs]);
  const subjectStatuses = useMemo(() => calculateSubjectStatuses(completed), [completed]);
  const selectedSubject = subjectsData.find((subject) => subject.slug === selectedSlug) ?? subjectsData[0];
  const selectedStatus = selectedSubject ? subjectStatuses[selectedSubject.slug] : 'UNLOCKED';
  const selectedUnlocks = selectedSubject ? getUnlocks(selectedSubject.slug) : [];
  const selectedMissing = selectedSubject
    ? selectedSubject.correlativas.filter((slug) => !completed.includes(slug))
    : [];
  const completedCount = completed.length;
  const unlockedCount = Object.values(subjectStatuses).filter((status) => status === 'UNLOCKED').length;
  const progress = Math.round((completedCount / subjectsData.length) * 100);
  const activeSlug = hoveredSlug ?? selectedSlug;
  const activeSubject = subjectsData.find((subject) => subject.slug === activeSlug);
  const activeChain = new Set<string>([
    activeSlug,
    ...(activeSubject?.correlativas ?? []),
    ...getUnlocks(activeSlug).map((subject) => subject.slug),
  ]);
  const allEdges = subjectsData.flatMap((subject) =>
    subject.correlativas
      .map((sourceSlug) => {
        const source = subjectsData.find((item) => item.slug === sourceSlug);

        if (!source) return null;

        return { source, target: subject };
      })
      .filter((edge): edge is { source: SubjectNode; target: SubjectNode } => Boolean(edge)),
  );
  const canvasHeight =
    Math.max(...subjectsData.map((subject) => getNodePosition(subject).y)) + NODE_HEIGHT + 110;

  const saveProgress = (nextCompleted: string[]) => {
    setCompleted(nextCompleted);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextCompleted));
  };

  const handleToggleSubject = (subject: SubjectNode) => {
    const currentStatus = subjectStatuses[subject.slug];
    setSelectedSlug(subject.slug);

    if (currentStatus === 'LOCKED') return;

    if (currentStatus === 'COMPLETED') {
      saveProgress(removeSubjectAndDependents(subject.slug, completed));
      return;
    }

    saveProgress(Array.from(new Set([...completed, subject.slug])));
  };

  if (!isHydrated) {
    return (
      <div className="grid min-h-[520px] place-items-center rounded-md border border-white/8 bg-surface-1">
        <div className="text-center">
          <Radar className="mx-auto h-9 w-9 animate-spin text-cyan-200" />
          <p className="mt-4 text-xs font-black uppercase tracking-[0.2em] text-white/42">Abriendo recorrido</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-white/8 bg-[#08090a] shadow-2xl">
      <div className="relative isolate border-b border-white/8 px-4 py-4 sm:px-6">
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(120deg,rgba(45,212,191,0.12),transparent_32%,rgba(251,191,36,0.10)_68%,transparent)]" />
        <div className="absolute inset-0 -z-10 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.8)_1px,transparent_1px)] [background-size:42px_42px]" />

        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <Link
              href="/mapa"
              className="inline-flex cursor-pointer items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-white/45 transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al mapa
            </Link>
            <div className="mt-4 flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-cyan-100">
              <Sparkles className="h-4 w-4" />
              Vista visual
            </div>
            <h1 className="mt-2 font-display text-3xl font-black tracking-normal text-white sm:text-5xl">
              Recorrido de correlativas
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/58">
              Tocá una materia y seguí el camino que abre. Las materias disponibles brillan; las completadas dejan una estela.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:min-w-[390px]">
            <div className="rounded-md border border-emerald-200/20 bg-emerald-300/9 p-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-100/70">Completadas</p>
              <p className="mt-2 text-2xl font-black text-emerald-100">{completedCount}</p>
            </div>
            <div className="rounded-md border border-cyan-200/20 bg-cyan-300/9 p-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-cyan-100/70">Disponibles</p>
              <p className="mt-2 text-2xl font-black text-cyan-100">{unlockedCount}</p>
            </div>
            <div className="rounded-md border border-amber-200/20 bg-amber-300/9 p-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-100/70">Avance</p>
              <p className="mt-2 text-2xl font-black text-amber-100">{progress}%</p>
            </div>
          </div>
        </div>

        <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/8">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-200 via-cyan-200 to-amber-200 transition-[width] duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="grid xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="relative min-h-[620px] overflow-x-auto overflow-y-hidden bg-[radial-gradient(circle_at_25%_20%,rgba(45,212,191,0.12),transparent_28%),radial-gradient(circle_at_70%_10%,rgba(251,191,36,0.10),transparent_24%),linear-gradient(180deg,#090b0c,#050505)]">
          <div className="relative" style={{ width: 1420, height: canvasHeight }}>
            <svg
              aria-hidden="true"
              className="absolute inset-0 h-full w-full"
              viewBox={`0 0 1420 ${canvasHeight}`}
              preserveAspectRatio="none"
            >
              <defs>
                <filter id="mapaVisualGlow" x="-40%" y="-40%" width="180%" height="180%">
                  <feGaussianBlur stdDeviation="3.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              {allEdges.map(({ source, target }, index) => {
                const sourceStatus = subjectStatuses[source.slug];
                const isActive = activeChain.has(source.slug) && activeChain.has(target.slug);
                const isCompletePath = sourceStatus === 'COMPLETED';

                return (
                  <path
                    key={`${source.slug}-${target.slug}`}
                    d={createPath(source, target)}
                    pathLength={1}
                    className={cn(
                      'mapa-visual-trace transition duration-300',
                      isActive && 'mapa-visual-trace-active',
                    )}
                    stroke={isActive ? '#67e8f9' : isCompletePath ? '#6ee7b7' : '#ffffff'}
                    strokeWidth={isActive ? 3 : 1.4}
                    strokeLinecap="round"
                    fill="none"
                    filter={isActive ? 'url(#mapaVisualGlow)' : undefined}
                    opacity={isActive ? 0.95 : isCompletePath ? 0.34 : 0.13}
                    style={{ animationDelay: `${index * 18}ms` }}
                  />
                );
              })}
            </svg>

            {[1, 2, 3, 4, 5].map((year) => (
              <div
                key={year}
                className="absolute top-8 w-[198px] border-b border-white/10 pb-3"
                style={{ left: START_X + (year - 1) * YEAR_GAP }}
              >
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/32">Año {year}</p>
                <p className="mt-1 text-sm font-black text-white">{YEAR_LABELS[year]}</p>
              </div>
            ))}

            {subjectsData.map((subject, index) => {
              const status = subjectStatuses[subject.slug];
              const position = getNodePosition(subject);
              const isSelected = selectedSlug === subject.slug;
              const isActive = activeChain.has(subject.slug);
              const missingCount = subject.correlativas.filter((slug) => !completed.includes(slug)).length;

              return (
                <button
                  key={subject.slug}
                  type="button"
                  onClick={() => setSelectedSlug(subject.slug)}
                  onMouseEnter={() => setHoveredSlug(subject.slug)}
                  onMouseLeave={() => setHoveredSlug(null)}
                  className={cn(
                    'mapa-visual-node group absolute flex cursor-pointer flex-col justify-between rounded-md border p-3 text-left transition duration-300',
                    STATUS_STYLES[status],
                    isSelected && 'ring-2 ring-cyan-100/55',
                    isActive && 'scale-[1.025]',
                    status === 'LOCKED' && !isActive && 'opacity-55',
                  )}
                  style={{
                    left: position.x,
                    top: position.y,
                    width: NODE_WIDTH,
                    height: NODE_HEIGHT,
                    animationDelay: `${index * 35}ms`,
                  }}
                  aria-label={`Ver ${subject.nombre}`}
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block text-[10px] font-black uppercase tracking-widest text-white/38">
                        {subject.codigo}
                      </span>
                      <span className="mt-1 line-clamp-2 block text-[12px] font-black leading-4 text-white">
                        {subject.nombre}
                      </span>
                    </span>
                    {status === 'COMPLETED' ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-100" /> : null}
                    {status === 'UNLOCKED' ? <Unlock className="h-4 w-4 shrink-0 text-amber-100" /> : null}
                    {status === 'LOCKED' ? <Lock className="h-4 w-4 shrink-0 text-white/28" /> : null}
                  </span>
                  <span className="flex items-center justify-between gap-2 border-t border-white/10 pt-1.5">
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/45">
                      {STATUS_COPY[status]}
                    </span>
                    {missingCount > 0 ? (
                      <span className="text-[9px] font-black uppercase tracking-widest text-rose-100/70">
                        Faltan {missingCount}
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <aside className="border-t border-white/8 bg-white/[0.035] p-4 xl:border-l xl:border-t-0 xl:p-5">
          {selectedSubject ? (
            <div className="sticky top-4 space-y-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-100/55">
                  Materia enfocada
                </p>
                <h2 className="mt-2 text-xl font-black leading-tight text-white">{selectedSubject.nombre}</h2>
                <p className="mt-2 text-xs font-bold uppercase tracking-widest text-white/38">
                  {selectedSubject.codigo} · {selectedSubject.periodo}
                </p>
              </div>

              <div className={cn('rounded-md border p-3', STATUS_STYLES[selectedStatus])}>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/48">Estado</p>
                <p className="mt-1 text-lg font-black text-white">{STATUS_COPY[selectedStatus]}</p>
              </div>

              <button
                type="button"
                disabled={selectedStatus === 'LOCKED'}
                onClick={() => handleToggleSubject(selectedSubject)}
                className={cn(
                  'inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-md border px-4 text-sm font-black uppercase tracking-wider transition',
                  selectedStatus === 'COMPLETED' &&
                    'border-emerald-200/25 bg-emerald-300/10 text-emerald-50 hover:bg-emerald-300/16',
                  selectedStatus === 'UNLOCKED' &&
                    'border-amber-200/25 bg-amber-300/10 text-amber-50 hover:bg-amber-300/16',
                  selectedStatus === 'LOCKED' &&
                    'cursor-not-allowed border-white/10 bg-white/5 text-white/28',
                )}
              >
                {selectedStatus === 'COMPLETED' ? <RefreshCw className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                {selectedStatus === 'COMPLETED' ? 'Quitar marca' : 'Marcar avance'}
              </button>

              {availableSlugs.size === 0 || availableSlugs.has(selectedSubject.slug) ? (
                <Link
                  href={`/materia/${selectedSubject.slug}`}
                  className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-white/10 bg-white/5 px-4 text-sm font-black uppercase tracking-wider text-white/68 transition hover:bg-white/8 hover:text-white"
                >
                  Abrir materia
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              ) : null}

              <RelationCloud
                title="Necesita"
                slugs={selectedSubject.correlativas}
                empty="No pide materias previas."
                highlightSlugs={selectedMissing}
              />
              <RelationCloud
                title="Abre camino a"
                slugs={selectedUnlocks.map((subject) => subject.slug)}
                empty="No abre materias directas."
              />
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function RelationCloud({
  title,
  slugs,
  empty,
  highlightSlugs = [],
}: {
  title: string;
  slugs: string[];
  empty: string;
  highlightSlugs?: string[];
}) {
  return (
    <div>
      <p className="mb-2 text-[10px] font-black uppercase tracking-[0.24em] text-white/35">{title}</p>
      {slugs.length === 0 ? (
        <p className="rounded-md border border-white/8 bg-white/5 px-3 py-2 text-xs text-white/42">{empty}</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {slugs.map((slug) => {
            const isHighlighted = highlightSlugs.includes(slug);

            return (
              <span
                key={slug}
                className={cn(
                  'rounded-md border px-2 py-1 text-[11px] font-semibold leading-4',
                  isHighlighted
                    ? 'border-rose-200/28 bg-rose-300/10 text-rose-50'
                    : 'border-white/10 bg-white/5 text-white/68',
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
