'use client';

import type { CSSProperties, PointerEventHandler, RefObject, WheelEventHandler } from 'react';
import { useMemo, useState } from 'react';
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
import {
  MAPA_YEARS,
  VISUAL_STATUS_ACCENTS as STATUS_ACCENTS,
  VISUAL_STATUS_LABELS as STATUS_COPY,
  VISUAL_STATUS_STYLES as STATUS_STYLES,
  YEAR_LABELS,
} from '@/lib/domain/mapa/mapaConstants';
import {
  createPath,
  getMapaVisualEdges,
  getMapaWorldHeight,
  getNodePosition,
  MAPA_NODE_HEIGHT,
  MAPA_NODE_WIDTH,
  MAPA_START_X,
  MAPA_WORLD_WIDTH,
  type MapaCamera,
} from '@/lib/domain/mapa/visualLayout';
import { canOpenSubjectPage, getMissingCorrelatives, getSubjectName, getUnlocks } from '@/lib/domain/mapa/subjectQueries';
import type { SubjectNode, SubjectStatus } from '@/lib/domain/mapa/types';
import { useMapaProgress } from '@/hooks/useMapaProgress';
import { useSubjectSelection } from '@/hooks/useSubjectSelection';
import { useMapaViewport } from '@/hooks/useMapaViewport';
import { cn } from '@/lib/utils';
import { yearSlugFromNumber } from '@/lib/slug';
import { buildSubjectHref } from '@/components/mobile/shared/subjectRoutes';

type MapaVisualCorrelativasProps = {
  availableSubjectSlugs?: string[];
};

type MapaVisualEdge = ReturnType<typeof getMapaVisualEdges>[number];

const EMPTY_AVAILABLE_SUBJECT_SLUGS: string[] = [];
const EMPTY_HIGHLIGHT_SLUGS: string[] = [];

export function MapaVisualCorrelativas({ availableSubjectSlugs = EMPTY_AVAILABLE_SUBJECT_SLUGS }: MapaVisualCorrelativasProps) {
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const progress = useMapaProgress();
  const { completed, isHydrated, subjectStatuses } = progress;
  const { selectedMissing, selectedSlug, selectedStatus, selectedSubject, selectedUnlocks, selectSubject: setSelectedSubject, toggleSubject } = useSubjectSelection(progress);
  const availableSlugs = useMemo(() => new Set(availableSubjectSlugs), [availableSubjectSlugs]);
  const allEdges = useMemo(() => getMapaVisualEdges(), []);
  const worldHeight = useMemo(() => getMapaWorldHeight(), []);
  const viewport = useMapaViewport(worldHeight);

  const activeSlug = hoveredSlug ?? selectedSlug;
  const activeSubject = subjectsData.find((subject) => subject.slug === activeSlug);
  const activeChain = new Set<string>([
    activeSlug,
    ...(activeSubject?.correlativas ?? []),
    ...getUnlocks(activeSlug).map((subject) => subject.slug),
  ]);

  const selectSubject = (subject: SubjectNode) => {
    setSelectedSubject(subject.slug);
    setIsPanelOpen(true);
  };

  if (!isHydrated) {
    return <MapaVisualLoading />;
  }

  return (
    <section className="relative h-[calc(100vh-4rem)] min-h-[720px] overflow-hidden bg-[#060808]">
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(45,212,191,0.15),transparent_34%,rgba(251,191,36,0.11)_72%,transparent)]" />
      <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.9)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.9)_1px,transparent_1px)] [background-size:46px_46px]" />

      <MapaGraphCanvas
        activeChain={activeChain}
        allEdges={allEdges}
        camera={viewport.camera}
        hoveredSlug={hoveredSlug}
        isDragging={viewport.isDragging}
        selectedSlug={selectedSlug}
        subjectStatuses={subjectStatuses}
        completed={completed}
        viewportRef={viewport.viewportRef}
        worldHeight={worldHeight}
        onDoubleClickSubject={viewport.moveCameraToSubject}
        onHoverSubject={setHoveredSlug}
        onSelectSubject={selectSubject}
        onPointerDown={viewport.startDragging}
        onPointerMove={viewport.dragCamera}
        onPointerUp={viewport.stopDragging}
        onWheel={viewport.handleWheel}
      />

      <MapaVisualBackLink />
      <MapaVisualToolbar camera={viewport.camera} onReset={viewport.resetCamera} onZoom={viewport.zoomAt} />

      {selectedSubject ? (
        <MapaVisualDetailsPanel
          availableSlugs={availableSlugs}
          isOpen={isPanelOpen}
          missingSlugs={selectedMissing}
          selectedSubject={selectedSubject}
          selectedStatus={selectedStatus}
          selectedUnlocks={selectedUnlocks}
          onCenterSubject={viewport.moveCameraToSubject}
          onClose={() => setIsPanelOpen(false)}
          onToggleSubject={toggleSubject}
        />
      ) : null}
    </section>
  );
}

function MapaVisualLoading() {
  return (
    <div className="grid min-h-[calc(100vh-4rem)] place-items-center bg-surface-1">
      <div className="text-center">
        <Radar className="mx-auto size-9 animate-spin text-cyan-200" />
        <p className="mt-4 text-xs font-black uppercase tracking-[0.2em] text-white/42">Abriendo recorrido</p>
      </div>
    </div>
  );
}

function MapaGraphCanvas({
  activeChain,
  allEdges,
  camera,
  completed,
  hoveredSlug,
  isDragging,
  selectedSlug,
  subjectStatuses,
  viewportRef,
  worldHeight,
  onDoubleClickSubject,
  onHoverSubject,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onSelectSubject,
  onWheel,
}: {
  activeChain: Set<string>;
  allEdges: MapaVisualEdge[];
  camera: MapaCamera;
  completed: readonly string[];
  hoveredSlug: string | null;
  isDragging: boolean;
  selectedSlug: string;
  subjectStatuses: Record<string, SubjectStatus>;
  viewportRef: RefObject<HTMLDivElement | null>;
  worldHeight: number;
  onDoubleClickSubject: (subject: SubjectNode) => void;
  onHoverSubject: (slug: string | null) => void;
  onPointerDown: PointerEventHandler<HTMLDivElement>;
  onPointerMove: PointerEventHandler<HTMLDivElement>;
  onPointerUp: PointerEventHandler<HTMLDivElement>;
  onSelectSubject: (subject: SubjectNode) => void;
  onWheel: WheelEventHandler<HTMLDivElement>;
}) {
  return (
    <div
      ref={viewportRef}
      className={cn('absolute inset-0 touch-none select-none overflow-hidden', isDragging ? 'cursor-grabbing' : 'cursor-grab')}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
    >
      <div
        className="absolute left-0 top-0"
        style={{
          width: MAPA_WORLD_WIDTH,
          height: worldHeight,
          transform: `translate3d(${camera.x}px, ${camera.y}px, 0) scale(${camera.scale})`,
          transformOrigin: '0 0',
        }}
      >
        <MapaEdges activeChain={activeChain} allEdges={allEdges} subjectStatuses={subjectStatuses} worldHeight={worldHeight} />
        <MapaYearLabels />
        <MapaNodes
          activeChain={activeChain}
          completed={completed}
          hoveredSlug={hoveredSlug}
          selectedSlug={selectedSlug}
          subjectStatuses={subjectStatuses}
          onDoubleClickSubject={onDoubleClickSubject}
          onHoverSubject={onHoverSubject}
          onSelectSubject={onSelectSubject}
        />
      </div>
    </div>
  );
}

function MapaEdges({
  activeChain,
  allEdges,
  subjectStatuses,
  worldHeight,
}: {
  activeChain: Set<string>;
  allEdges: MapaVisualEdge[];
  subjectStatuses: Record<string, SubjectStatus>;
  worldHeight: number;
}) {
  return (
    <svg aria-hidden="true" className="absolute inset-0 size-full" viewBox={`0 0 ${MAPA_WORLD_WIDTH} ${worldHeight}`} preserveAspectRatio="none">
      <defs>
        <filter id="mapaVisualGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="4.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <EdgeMarker id="arrowActive" fill="#67e8f9" width={10} height={8} />
        <EdgeMarker id="arrowComplete" fill="#6ee7b7" width={8} height={6} opacity={0.55} />
        <EdgeMarker id="arrowDefault" fill="#ffffff" width={7} height={5} opacity={0.22} />
      </defs>
      {allEdges.map(({ source, target }, index) => {
        const sourceStatus = subjectStatuses[source.slug];
        const isActive = activeChain.has(source.slug) && activeChain.has(target.slug);
        const isCompletePath = sourceStatus === 'COMPLETED';
        const markerId = isActive ? 'arrowActive' : isCompletePath ? 'arrowComplete' : 'arrowDefault';
        const path = createPath(source, target);

        return (
          <g key={`${source.slug}-${target.slug}`}>
            <path
              d={path}
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
            {isActive ? <path d={path} className="mapa-visual-flow" stroke="#67e8f9" strokeWidth={2} strokeLinecap="round" strokeDasharray="8 16" fill="none" opacity={0.6} /> : null}
          </g>
        );
      })}
    </svg>
  );
}

function EdgeMarker({ id, fill, width, height, opacity = 1 }: { id: string; fill: string; width: number; height: number; opacity?: number }) {
  return (
    <marker id={id} viewBox="0 0 12 10" refX="10" refY="5" markerWidth={width} markerHeight={height} orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 Z" fill={fill} opacity={opacity} />
    </marker>
  );
}

function MapaYearLabels() {
  return (
    <>
      {MAPA_YEARS.map((year) => (
        <div key={year} className="absolute top-8 w-[326px] pb-4" style={{ left: MAPA_START_X + (year - 1) * 580 }}>
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-200/40">Año {year}</p>
          <p className="mt-1.5 text-lg font-black tracking-tight text-white">{YEAR_LABELS[year]}</p>
          <div className="mt-3 h-px bg-gradient-to-r from-white/20 via-white/8 to-transparent" />
        </div>
      ))}
    </>
  );
}

function MapaNodes({
  activeChain,
  completed,
  selectedSlug,
  subjectStatuses,
  onDoubleClickSubject,
  onHoverSubject,
  onSelectSubject,
}: {
  activeChain: Set<string>;
  completed: readonly string[];
  hoveredSlug: string | null;
  selectedSlug: string;
  subjectStatuses: Record<string, SubjectStatus>;
  onDoubleClickSubject: (subject: SubjectNode) => void;
  onHoverSubject: (slug: string | null) => void;
  onSelectSubject: (subject: SubjectNode) => void;
}) {
  return subjectsData.map((subject, index) => {
    const status = subjectStatuses[subject.slug];
    const position = getNodePosition(subject);
    const isSelected = selectedSlug === subject.slug;
    const isActive = activeChain.has(subject.slug);
    const missingCount = getMissingCorrelatives(subject, completed).length;

    return (
      <button
        key={subject.slug}
        data-map-node
        type="button"
        onClick={() => onSelectSubject(subject)}
        onDoubleClick={() => onDoubleClickSubject(subject)}
        onMouseEnter={() => onHoverSubject(subject.slug)}
        onMouseLeave={() => onHoverSubject(null)}
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
          width: MAPA_NODE_WIDTH,
          height: MAPA_NODE_HEIGHT,
          animationDelay: `${index * 32}ms`,
          '--node-accent': STATUS_ACCENTS[status],
        } as CSSProperties}
        aria-label={`Ver ${subject.nombre}`}
      >
        <span className="pointer-events-none absolute left-[-7px] top-1/2 size-3.5 -translate-y-1/2 rounded-full border border-[var(--node-accent)] bg-[#060808] shadow-[0_0_14px_var(--node-accent)]" />
        <span className="pointer-events-none absolute right-[-7px] top-1/2 size-3.5 -translate-y-1/2 rounded-full border border-[var(--node-accent)] bg-[#060808] shadow-[0_0_14px_var(--node-accent)]" />
        <span className="relative z-10 flex items-start justify-between gap-4">
          <span className="min-w-0 flex-1">
            <span className="inline-flex min-h-6 items-center border border-white/10 bg-black/22 px-2 text-[10px] font-black uppercase tracking-widest text-white/46">
              {subject.codigo} · Año {subject.year}
            </span>
            <span className="mt-2 line-clamp-2 block text-[15px] font-black leading-5 text-white">{subject.nombre}</span>
          </span>
          <span className="flex size-9 shrink-0 items-center justify-center border border-white/10 bg-black/24 text-white">
            {status === 'COMPLETED' ? <CheckCircle2 className="size-4.5 text-emerald-100" /> : null}
            {status === 'UNLOCKED' ? <Unlock className="size-4.5 text-amber-100" /> : null}
            {status === 'LOCKED' ? <Lock className="size-4.5 text-white/28" /> : null}
          </span>
        </span>
        <span className="relative z-10 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
          <span className="text-[10px] font-black uppercase tracking-widest text-white/48">{STATUS_COPY[status]}</span>
          {missingCount > 0 ? (
            <span className="border border-rose-200/20 bg-rose-300/10 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-rose-100/75">Faltan {missingCount}</span>
          ) : null}
        </span>
      </button>
    );
  });
}

function MapaVisualBackLink() {
  return (
    <div data-map-control className="absolute left-4 top-4 z-20">
      <Link href="/mapa" className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-white/10 bg-black/58 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-white/45 shadow-2xl backdrop-blur-xl transition hover:bg-white/10 hover:text-white">
        <ArrowLeft className="size-4" />
        Volver
      </Link>
    </div>
  );
}

function MapaVisualToolbar({ camera, onReset, onZoom }: { camera: MapaCamera; onReset: () => void; onZoom: (scale: number) => void }) {
  return (
    <div data-map-control className="absolute bottom-4 left-4 z-20 flex items-center overflow-hidden rounded-md border border-white/10 bg-black/58 shadow-2xl backdrop-blur-xl">
      <button type="button" title="Alejar" onClick={() => onZoom(camera.scale - 0.12)} className="inline-flex size-11 cursor-pointer items-center justify-center border-r border-white/10 text-white/68 transition hover:bg-white/10 hover:text-white">
        <Minus className="size-4" />
      </button>
      <div className="flex h-11 min-w-20 items-center justify-center gap-2 border-r border-white/10 px-3 text-xs font-black text-white/62">
        <Move className="size-4" />
        {Math.round(camera.scale * 100)}%
      </div>
      <button type="button" title="Acercar" onClick={() => onZoom(camera.scale + 0.12)} className="inline-flex size-11 cursor-pointer items-center justify-center border-r border-white/10 text-white/68 transition hover:bg-white/10 hover:text-white">
        <Plus className="size-4" />
      </button>
      <button type="button" title="Centrar mapa" onClick={onReset} className="inline-flex size-11 cursor-pointer items-center justify-center text-white/68 transition hover:bg-white/10 hover:text-white">
        <LocateFixed className="size-4" />
      </button>
    </div>
  );
}

function MapaVisualDetailsPanel({
  availableSlugs,
  isOpen,
  missingSlugs,
  selectedSubject,
  selectedStatus,
  selectedUnlocks,
  onCenterSubject,
  onClose,
  onToggleSubject,
}: {
  availableSlugs: Set<string>;
  isOpen: boolean;
  missingSlugs: string[];
  selectedSubject: SubjectNode;
  selectedStatus: SubjectStatus;
  selectedUnlocks: SubjectNode[];
  onCenterSubject: (subject: SubjectNode) => void;
  onClose: () => void;
  onToggleSubject: (subject: SubjectNode) => void;
}) {
  const canOpenSubject = canOpenSubjectPage(availableSlugs, selectedSubject.slug);

  return (
    <aside
      data-map-control
      className={cn(
        'absolute bottom-4 right-4 top-4 z-20 w-[min(360px,calc(100vw-2rem))] overflow-y-auto rounded-md border border-white/10 bg-black/64 p-4 shadow-2xl backdrop-blur-xl transition duration-300',
        isOpen ? 'translate-x-0 opacity-100' : 'pointer-events-none translate-x-[calc(100%+1rem)] opacity-0',
      )}
    >
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-100/55">Materia enfocada</p>
            <h2 className="mt-2 text-2xl font-black leading-tight text-white">{selectedSubject.nombre}</h2>
            <p className="mt-2 text-xs font-bold uppercase tracking-widest text-white/38">{selectedSubject.codigo} · {selectedSubject.periodo}</p>
          </div>
          <button type="button" onClick={onClose} className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-white/40 transition hover:bg-white/10 hover:text-white">
            <X className="size-4" />
          </button>
        </div>

        <div className={cn('rounded-md border p-3 backdrop-blur', STATUS_STYLES[selectedStatus])}>
          <p className="text-[10px] font-black uppercase tracking-widest text-white/48">Estado</p>
          <p className="mt-1 text-lg font-black text-white">{STATUS_COPY[selectedStatus]}</p>
        </div>

        <button
          type="button"
          disabled={selectedStatus === 'LOCKED'}
          onClick={() => onToggleSubject(selectedSubject)}
          className={cn(
            'inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-md border px-4 text-sm font-black uppercase tracking-wider transition disabled:cursor-not-allowed',
            selectedStatus === 'COMPLETED' && 'border-emerald-200/25 bg-emerald-300/10 text-emerald-50 hover:bg-emerald-300/16',
            selectedStatus === 'UNLOCKED' && 'border-amber-200/25 bg-amber-300/10 text-amber-50 hover:bg-amber-300/16',
            selectedStatus === 'LOCKED' && 'border-white/10 bg-white/5 text-white/28',
          )}
        >
          {selectedStatus === 'COMPLETED' ? <RefreshCw className="size-4" /> : <Check className="size-4" />}
          {selectedStatus === 'COMPLETED' ? 'Quitar marca' : 'Marcar avance'}
        </button>

        <button type="button" onClick={() => onCenterSubject(selectedSubject)} className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-cyan-200/18 bg-cyan-300/8 px-4 text-sm font-black uppercase tracking-wider text-cyan-50 transition hover:bg-cyan-300/13">
          <LocateFixed className="size-4" />
          Centrar
        </button>

        {canOpenSubject ? (
          <Link href={buildSubjectHref({ yearSlug: yearSlugFromNumber(selectedSubject.year), subjectSlug: selectedSubject.slug })} className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-white/10 bg-white/5 px-4 text-sm font-black uppercase tracking-wider text-white/68 transition hover:bg-white/8 hover:text-white">
            Abrir materia
            <ArrowUpRight className="size-4" />
          </Link>
        ) : null}

        <RelationCloud title="Necesita" slugs={selectedSubject.correlativas} empty="No pide materias previas." highlightSlugs={missingSlugs} />
        <RelationCloud title="Abre camino a" slugs={selectedUnlocks.map((subject) => subject.slug)} empty="No abre materias directas." />
      </div>
    </aside>
  );
}

function RelationCloud({
  title,
  slugs,
  empty,
  highlightSlugs = EMPTY_HIGHLIGHT_SLUGS,
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
                  isHighlighted ? 'border-rose-200/28 bg-rose-300/10 text-rose-50' : 'border-white/10 bg-white/5 text-white/68',
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
