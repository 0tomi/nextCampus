'use client';

import type { CSSProperties } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  CheckCircle2,
  LocateFixed,
  Lock,
  Minus,
  Move,
  Plus,
  Radar,
  RefreshCw,
  Unlock,
  X,
} from 'lucide-react';
import { subjectsData } from '@/lib/domain/mapa/correlativasData';
import { calculateSubjectStatuses } from '@/lib/domain/mapa/unlockLogic';
import type { SubjectNode, SubjectStatus } from '@/lib/domain/mapa/types';
import { readMapaProgress, writeMapaProgress } from '@/lib/mapaProgress';
import { cn } from '@/lib/utils';
import { yearSlugFromNumber } from '@/lib/slug';
import { buildSubjectHref } from '@/components/mobile/shared/subjectRoutes';

type MapaVisualCorrelativasProps = {
  availableSubjectSlugs?: string[];
};

type Camera = {
  x: number;
  y: number;
  scale: number;
};

const NODE_WIDTH = 326;
const NODE_HEIGHT = 138;
const YEAR_GAP = 580;
const ROW_GAP = 182;
const START_X = 130;
const START_Y = 220;
const WORLD_WIDTH = 3120;
const MIN_SCALE = 0.38;
const MAX_SCALE = 1.36;
const INITIAL_CAMERA: Camera = { x: -40, y: -50, scale: 0.58 };

const STATUS_COPY: Record<SubjectStatus, string> = {
  COMPLETED: 'Completada',
  UNLOCKED: 'Disponible',
  LOCKED: 'En espera',
};

const STATUS_STYLES: Record<SubjectStatus, string> = {
  COMPLETED: 'border-emerald-200/52 bg-emerald-300/16 text-emerald-50 shadow-[0_0_42px_rgba(52,211,153,0.22)]',
  UNLOCKED: 'border-amber-200/52 bg-amber-300/14 text-amber-50 shadow-[0_0_42px_rgba(251,191,36,0.18)]',
  LOCKED: 'border-white/12 bg-black/44 text-white/54 shadow-none',
};

const STATUS_ACCENTS: Record<SubjectStatus, string> = {
  COMPLETED: '#6ee7b7',
  UNLOCKED: '#fde68a',
  LOCKED: '#64748b',
};

const YEAR_LABELS: Record<number, string> = {
  1: 'Primer año',
  2: 'Segundo año',
  3: 'Tercer año',
  4: 'Cuarto año',
  5: 'Quinto año',
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

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
  const columnDrift = subject.year % 2 === 0 ? 42 : 0;
  const rowDrift = rowIndex % 2 === 0 ? 0 : 20;

  return {
    x: START_X + yearIndex * YEAR_GAP,
    y: START_Y + rowIndex * ROW_GAP + columnDrift + rowDrift,
  };
}

const ARROW_INSET = 18;

function createPath(from: SubjectNode, to: SubjectNode) {
  const start = getNodePosition(from);
  const end = getNodePosition(to);
  const sx = start.x + NODE_WIDTH;
  const sy = start.y + NODE_HEIGHT / 2;
  const ex = end.x - ARROW_INSET;
  const ey = end.y + NODE_HEIGHT / 2;
  const dx = ex - sx;
  const curve = Math.max(100, dx * 0.48);

  return `M ${sx} ${sy} C ${sx + curve} ${sy}, ${ex - curve} ${ey}, ${ex} ${ey}`;
}

export function MapaVisualCorrelativas({ availableSubjectSlugs = [] }: MapaVisualCorrelativasProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; camera: Camera } | null>(null);
  const [completed, setCompleted] = useState<string[]>([]);
  const [selectedSlug, setSelectedSlug] = useState(subjectsData[0]?.slug ?? '');
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [camera, setCamera] = useState<Camera>(INITIAL_CAMERA);
  const [isDragging, setIsDragging] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCompleted(readMapaProgress());
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
  const worldHeight = Math.max(...subjectsData.map((subject) => getNodePosition(subject).y)) + NODE_HEIGHT + 140;

  const saveProgress = (nextCompleted: string[]) => {
    setCompleted(nextCompleted);
    writeMapaProgress(nextCompleted);
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

  const getBoundedPosition = (x: number, y: number, scale: number, width: number, height: number) => {
    const paddingX = Math.min(180, width / 3);
    const paddingY = Math.min(180, height / 3);
    const minX = paddingX - WORLD_WIDTH * scale;
    const maxX = width - paddingX;
    const minY = paddingY - worldHeight * scale;
    const maxY = height - paddingY;

    return {
      x: clamp(x, minX, maxX),
      y: clamp(y, minY, maxY),
    };
  };

  const moveCameraToSubject = (subject: SubjectNode) => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const rect = viewport.getBoundingClientRect();
    const position = getNodePosition(subject);
    const scale = Math.max(camera.scale, 0.78);
    const targetX = rect.width / 2 - (position.x + NODE_WIDTH / 2) * scale;
    const targetY = rect.height / 2 - (position.y + NODE_HEIGHT / 2) * scale;

    const bounded = getBoundedPosition(targetX, targetY, scale, rect.width, rect.height);

    setCamera({
      scale,
      x: bounded.x,
      y: bounded.y,
    });
  };

  const zoomAt = (nextScale: number, originX?: number, originY?: number) => {
    const viewport = viewportRef.current;
    const rect = viewport?.getBoundingClientRect();
    const targetScale = clamp(nextScale, MIN_SCALE, MAX_SCALE);
    const anchorX = originX ?? (rect?.width ?? 0) / 2;
    const anchorY = originY ?? (rect?.height ?? 0) / 2;

    setCamera((current) => {
      const worldX = (anchorX - current.x) / current.scale;
      const worldY = (anchorY - current.y) / current.scale;

      const targetX = anchorX - worldX * targetScale;
      const targetY = anchorY - worldY * targetScale;

      if (rect) {
        const bounded = getBoundedPosition(targetX, targetY, targetScale, rect.width, rect.height);
        return {
          scale: targetScale,
          x: bounded.x,
          y: bounded.y,
        };
      }

      return {
        scale: targetScale,
        x: targetX,
        y: targetY,
      };
    });
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const delta = event.deltaY > 0 ? -0.08 : 0.08;

    zoomAt(camera.scale + delta, event.clientX - rect.left, event.clientY - rect.top);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;

    if (target.closest('[data-map-node], [data-map-control], a, button')) return;

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      camera,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;

    if (!drag || drag.pointerId !== event.pointerId) return;

    const viewport = viewportRef.current;
    if (!viewport) return;
    const rect = viewport.getBoundingClientRect();

    const targetX = drag.camera.x + event.clientX - drag.startX;
    const targetY = drag.camera.y + event.clientY - drag.startY;

    const bounded = getBoundedPosition(targetX, targetY, drag.camera.scale, rect.width, rect.height);

    setCamera({
      ...drag.camera,
      x: bounded.x,
      y: bounded.y,
    });
  };

  const stopDragging = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
      setIsDragging(false);
    }
  };

  if (!isHydrated) {
    return (
      <div className="grid min-h-[calc(100vh-4rem)] place-items-center bg-surface-1">
        <div className="text-center">
          <Radar className="mx-auto h-9 w-9 animate-spin text-cyan-200" />
          <p className="mt-4 text-xs font-black uppercase tracking-[0.2em] text-white/42">Abriendo recorrido</p>
        </div>
      </div>
    );
  }

  return (
    <section className="relative h-[calc(100vh-4rem)] min-h-[720px] overflow-hidden bg-[#060808]">
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(45,212,191,0.15),transparent_34%,rgba(251,191,36,0.11)_72%,transparent)]" />
      <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.9)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.9)_1px,transparent_1px)] [background-size:46px_46px]" />

      <div
        ref={viewportRef}
        className={cn(
          'absolute inset-0 touch-none select-none overflow-hidden',
          isDragging ? 'cursor-grabbing' : 'cursor-grab',
        )}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
        onWheel={handleWheel}
      >
        <div
          className="absolute left-0 top-0"
          style={{
            width: WORLD_WIDTH,
            height: worldHeight,
            transform: `translate3d(${camera.x}px, ${camera.y}px, 0) scale(${camera.scale})`,
            transformOrigin: '0 0',
          }}
        >
          <svg
            aria-hidden="true"
            className="absolute inset-0 h-full w-full"
            viewBox={`0 0 ${WORLD_WIDTH} ${worldHeight}`}
            preserveAspectRatio="none"
          >
            <defs>
              <filter id="mapaVisualGlow" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="4.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <marker
                id="arrowActive"
                viewBox="0 0 12 10"
                refX="10"
                refY="5"
                markerWidth="10"
                markerHeight="8"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 Z" fill="#67e8f9" />
              </marker>
              <marker
                id="arrowComplete"
                viewBox="0 0 12 10"
                refX="10"
                refY="5"
                markerWidth="8"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 9 5 L 0 8.5 Z" fill="#6ee7b7" opacity="0.55" />
              </marker>
              <marker
                id="arrowDefault"
                viewBox="0 0 12 10"
                refX="10"
                refY="5"
                markerWidth="7"
                markerHeight="5"
                orient="auto-start-reverse"
              >
                <path d="M 0 2 L 8 5 L 0 8 Z" fill="#ffffff" opacity="0.22" />
              </marker>
            </defs>
            {allEdges.map(({ source, target }, index) => {
              const sourceStatus = subjectStatuses[source.slug];
              const isActive = activeChain.has(source.slug) && activeChain.has(target.slug);
              const isCompletePath = sourceStatus === 'COMPLETED';
              const markerId = isActive ? 'arrowActive' : isCompletePath ? 'arrowComplete' : 'arrowDefault';

              return (
                <g key={`${source.slug}-${target.slug}`}>
                  <path
                    d={createPath(source, target)}
                    pathLength={1}
                    className={cn('mapa-visual-trace transition duration-300', isActive && 'mapa-visual-trace-active')}
                    stroke={isActive ? '#67e8f9' : isCompletePath ? '#6ee7b7' : '#ffffff'}
                    strokeWidth={isActive ? 3.5 : isCompletePath ? 2 : 1.5}
                    strokeLinecap="round"
                    fill="none"
                    filter={isActive ? 'url(#mapaVisualGlow)' : undefined}
                    opacity={isActive ? 1 : isCompletePath ? 0.42 : 0.16}
                    markerEnd={`url(#${markerId})`}
                    style={{ '--trace-delay': `${index * 16}ms` } as CSSProperties}
                  />
                  {isActive ? (
                    <path
                      d={createPath(source, target)}
                      className="mapa-visual-flow"
                      stroke="#67e8f9"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeDasharray="8 16"
                      fill="none"
                      opacity={0.6}
                    />
                  ) : null}
                </g>
              );
            })}
          </svg>

          {[1, 2, 3, 4, 5].map((year) => (
            <div
              key={year}
              className="absolute top-8 w-[326px] pb-4"
              style={{ left: START_X + (year - 1) * YEAR_GAP }}
            >
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-200/40">Año {year}</p>
              <p className="mt-1.5 text-lg font-black tracking-tight text-white">{YEAR_LABELS[year]}</p>
              <div className="mt-3 h-px bg-gradient-to-r from-white/20 via-white/8 to-transparent" />
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
                data-map-node
                type="button"
                onClick={() => {
                  setSelectedSlug(subject.slug);
                  setIsPanelOpen(true);
                }}
                onDoubleClick={() => moveCameraToSubject(subject)}
                onMouseEnter={() => setHoveredSlug(subject.slug)}
                onMouseLeave={() => setHoveredSlug(null)}
                className={cn(
                  'mapa-visual-node group absolute flex cursor-pointer flex-col justify-between border px-8 py-5 text-left backdrop-blur-md transition duration-300',
                  STATUS_STYLES[status],
                  isSelected && 'ring-2 ring-cyan-100/70',
                  isActive && 'scale-[1.035]',
                  status === 'LOCKED' && !isActive && 'opacity-58',
                )}
                style={{
                  left: position.x,
                  top: position.y,
                  width: NODE_WIDTH,
                  height: NODE_HEIGHT,
                  animationDelay: `${index * 32}ms`,
                  '--node-accent': STATUS_ACCENTS[status],
                } as CSSProperties}
                aria-label={`Ver ${subject.nombre}`}
              >
                <span className="pointer-events-none absolute left-[-7px] top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border border-[var(--node-accent)] bg-[#060808] shadow-[0_0_14px_var(--node-accent)]" />
                <span className="pointer-events-none absolute right-[-7px] top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border border-[var(--node-accent)] bg-[#060808] shadow-[0_0_14px_var(--node-accent)]" />
                <span className="relative z-10 flex items-start justify-between gap-4">
                  <span className="min-w-0 flex-1">
                    <span className="inline-flex min-h-6 items-center border border-white/10 bg-black/22 px-2 text-[10px] font-black uppercase tracking-widest text-white/46">
                      {subject.codigo} · Año {subject.year}
                    </span>
                    <span className="mt-2 line-clamp-2 block text-[15px] font-black leading-5 text-white">
                      {subject.nombre}
                    </span>
                  </span>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-white/10 bg-black/24 text-white">
                    {status === 'COMPLETED' ? <CheckCircle2 className="h-4.5 w-4.5 text-emerald-100" /> : null}
                    {status === 'UNLOCKED' ? <Unlock className="h-4.5 w-4.5 text-amber-100" /> : null}
                    {status === 'LOCKED' ? <Lock className="h-4.5 w-4.5 text-white/28" /> : null}
                  </span>
                </span>
                <span className="relative z-10 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/48">
                    {STATUS_COPY[status]}
                  </span>
                  {missingCount > 0 ? (
                    <span className="border border-rose-200/20 bg-rose-300/10 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-rose-100/75">
                      Faltan {missingCount}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div data-map-control className="absolute left-4 top-4 z-20">
        <Link
          href="/mapa"
          className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-white/10 bg-black/58 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-white/45 shadow-2xl backdrop-blur-xl transition hover:bg-white/10 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Link>
      </div>

      <div data-map-control className="absolute bottom-4 left-4 z-20 flex items-center overflow-hidden rounded-md border border-white/10 bg-black/58 shadow-2xl backdrop-blur-xl">
        <button
          type="button"
          title="Alejar"
          onClick={() => zoomAt(camera.scale - 0.12)}
          className="inline-flex h-11 w-11 cursor-pointer items-center justify-center border-r border-white/10 text-white/68 transition hover:bg-white/10 hover:text-white"
        >
          <Minus className="h-4 w-4" />
        </button>
        <div className="flex h-11 min-w-20 items-center justify-center gap-2 border-r border-white/10 px-3 text-xs font-black text-white/62">
          <Move className="h-4 w-4" />
          {Math.round(camera.scale * 100)}%
        </div>
        <button
          type="button"
          title="Acercar"
          onClick={() => zoomAt(camera.scale + 0.12)}
          className="inline-flex h-11 w-11 cursor-pointer items-center justify-center border-r border-white/10 text-white/68 transition hover:bg-white/10 hover:text-white"
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="Centrar mapa"
          onClick={() => setCamera(INITIAL_CAMERA)}
          className="inline-flex h-11 w-11 cursor-pointer items-center justify-center text-white/68 transition hover:bg-white/10 hover:text-white"
        >
          <LocateFixed className="h-4 w-4" />
        </button>
      </div>

      {selectedSubject ? (
        <aside
          data-map-control
          className={cn(
            'absolute bottom-4 right-4 top-4 z-20 w-[min(360px,calc(100vw-2rem))] overflow-y-auto rounded-md border border-white/10 bg-black/64 p-4 shadow-2xl backdrop-blur-xl transition duration-300',
            isPanelOpen ? 'translate-x-0 opacity-100' : 'pointer-events-none translate-x-[calc(100%+1rem)] opacity-0',
          )}
        >
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-100/55">
                  Materia enfocada
                </p>
                <h2 className="mt-2 text-2xl font-black leading-tight text-white">{selectedSubject.nombre}</h2>
                <p className="mt-2 text-xs font-bold uppercase tracking-widest text-white/38">
                  {selectedSubject.codigo} · {selectedSubject.periodo}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPanelOpen(false)}
                className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-white/40 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className={cn('rounded-md border p-3 backdrop-blur', STATUS_STYLES[selectedStatus])}>
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
                selectedStatus === 'LOCKED' && 'cursor-not-allowed border-white/10 bg-white/5 text-white/28',
              )}
            >
              {selectedStatus === 'COMPLETED' ? <RefreshCw className="h-4 w-4" /> : <Check className="h-4 w-4" />}
              {selectedStatus === 'COMPLETED' ? 'Quitar marca' : 'Marcar avance'}
            </button>

            <button
              type="button"
              onClick={() => moveCameraToSubject(selectedSubject)}
              className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-cyan-200/18 bg-cyan-300/8 px-4 text-sm font-black uppercase tracking-wider text-cyan-50 transition hover:bg-cyan-300/13"
            >
              <LocateFixed className="h-4 w-4" />
              Centrar
            </button>

            {availableSlugs.size === 0 || availableSlugs.has(selectedSubject.slug) ? (
              <Link
                href={buildSubjectHref({ yearSlug: yearSlugFromNumber(selectedSubject.year), subjectSlug: selectedSubject.slug })}
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
        </aside>
      ) : null}
    </section>
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
