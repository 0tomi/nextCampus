'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  CheckCircle2, 
  Lock, 
  Unlock, 
  RefreshCw, 
  Search, 
  Award, 
  Info,
  ArrowRight,
  BookOpen
} from 'lucide-react';
import { subjectsData } from '@/lib/domain/mapa/correlativasData';
import { calculateSubjectStatuses } from '@/lib/domain/mapa/unlockLogic';
import type { SubjectStatus } from '@/lib/domain/mapa/types';
import { cn } from '@/lib/utils';

export function MapaCorrelativas() {
  const [completed, setCompleted] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [hoveredSubject, setHoveredSubject] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // Cargar progreso del localStorage en el cliente para evitar mismatch de RSC
  useEffect(() => {
    const saved = localStorage.getItem('nextcampus_progreso_materias');
    if (saved) {
      try {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCompleted(JSON.parse(saved));
      } catch (e) {
        console.error('Error parsing progress', e);
      }
    }
    setIsHydrated(true);
  }, []);

  // Guardar progreso
  const saveProgress = (newCompleted: string[]) => {
    setCompleted(newCompleted);
    localStorage.setItem('nextcampus_progreso_materias', JSON.stringify(newCompleted));
  };

  // Toggle estado de materia (aprobar / desaprobar)
  const handleToggleSubject = (slug: string, currentStatus: SubjectStatus) => {
    if (currentStatus === 'LOCKED') return; // Bloqueada, no se puede interactuar

    let newCompleted: string[];
    if (currentStatus === 'COMPLETED') {
      // Si la desmarcamos, también tenemos que desmarcar recursivamente todas las que la requerían como correlativa
      newCompleted = removeSubjectAndDependents(slug, completed);
    } else {
      // Marcar como completada
      newCompleted = [...completed, slug];
    }
    
    saveProgress(newCompleted);
  };

  // Función recursiva para desmarcar materias que dependen de la que se desmarcó
  const removeSubjectAndDependents = (slugToRemove: string, currentCompleted: string[]): string[] => {
    let nextCompleted = currentCompleted.filter(s => s !== slugToRemove);
    
    // Buscar materias que tengan a slugToRemove en sus correlativas
    const dependents = subjectsData.filter(s => 
      s.correlativas.includes(slugToRemove) && nextCompleted.includes(s.slug)
    );

    for (const dep of dependents) {
      nextCompleted = removeSubjectAndDependents(dep.slug, nextCompleted);
    }

    return nextCompleted;
  };

  const handleReset = () => {
    if (window.confirm('¿Estás seguro de que querés reiniciar todo tu progreso? Esta acción no se puede deshacer.')) {
      saveProgress([]);
    }
  };

  const handleAutocompleteFirstYear = () => {
    const firstYearSlugs = subjectsData.filter(s => s.year === 1).map(s => s.slug);
    const newCompleted = Array.from(new Set([...completed, ...firstYearSlugs]));
    saveProgress(newCompleted);
  };

  // Calcular estados dinámicos
  const subjectStatuses = calculateSubjectStatuses(completed);

  // Filtrar materias por búsqueda
  const filteredSubjects = subjectsData.filter(s => 
    s.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Estadísticas
  const totalSubjects = subjectsData.length;
  const completedCount = completed.length;
  const progressPercentage = totalSubjects > 0 ? Math.round((completedCount / totalSubjects) * 100) : 0;

  // Encontrar dependencias directas para resaltar en el hover
  const getSubjectRelations = (slug: string) => {
    const subject = subjectsData.find(s => s.slug === slug);
    if (!subject) return { requires: [], unlocks: [] };

    const requires = subject.correlativas;
    const unlocks = subjectsData
      .filter(s => s.correlativas.includes(slug))
      .map(s => s.slug);

    return { requires, unlocks };
  };

  const hoveredRelations = hoveredSubject ? getSubjectRelations(hoveredSubject) : { requires: [], unlocks: [] };

  if (!isHydrated) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center space-y-4">
          <RefreshCw className="h-8 w-8 animate-spin text-amber-500 mx-auto" />
          <p className="text-white/40 text-sm font-semibold tracking-wider">CARGANDO MAPA CURRICULAR...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header & Stats Card */}
      <div className="relative overflow-hidden rounded bg-surface-1 p-6 border border-white/5 shadow-2xl">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-48 w-48 rounded-full bg-amber-500/10 blur-3xl" />
        
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-400" />
              <span className="text-xs font-black uppercase tracking-[0.2em] text-amber-400">HERRAMIENTA ACADÉMICA</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white md:text-4xl">
              Mapa de Correlatividades
            </h1>
            <p className="text-sm text-white/60 max-w-2xl leading-relaxed">
              Hacé clic sobre las materias que tengas aprobadas para registrar tu progreso. Las correlativas habilitadas se desbloquearán automáticamente en tiempo real.
            </p>
          </div>

          <div className="bg-surface-2 p-5 rounded border border-white/5 min-w-[240px] space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-white/50 uppercase tracking-widest">
              <span>PROGRESO TOTAL</span>
              <span className="text-amber-400 font-extrabold">{progressPercentage}%</span>
            </div>
            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-500 ease-out" 
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-white/70">
              <span>{completedCount} de {totalSubjects} materias</span>
              <span className="font-semibold text-white/40">Lic. en Sistemas</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="mt-8 flex flex-wrap gap-4 items-center justify-between border-t border-white/5 pt-6">
          <div className="relative w-full max-w-md">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-white/30">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder="Buscar materia por nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder-white/30 transition-all focus:border-amber-500/50 focus:bg-white/10 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleAutocompleteFirstYear}
              className="rounded bg-white/5 border border-white/10 px-4 py-2 text-xs font-bold text-white/80 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
            >
              🚀 Aprobar todo 1º Año
            </button>
            <button
              onClick={handleReset}
              disabled={completed.length === 0}
              className="inline-flex items-center gap-2 rounded border border-red-500/20 bg-red-500/5 px-4 py-2 text-xs font-bold text-red-400/90 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-30 disabled:hover:bg-red-500/5 disabled:cursor-not-allowed cursor-pointer"
            >
              <RefreshCw className="h-3 w-3" />
              Reiniciar Progreso
            </button>
          </div>
        </div>
      </div>

      {/* Grid of Years */}
      <div className="stagger-children grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-5">
        {[1, 2, 3, 4, 5].map((yearNum) => {
          const yearSubjects = filteredSubjects.filter(s => s.year === yearNum);
          
          return (
            <div key={yearNum} className="flex flex-col space-y-4 bg-surface-2/40 p-4 rounded border border-white/5">
              <div className="border-b border-white/5 pb-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">FCYT · UADER</p>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/10 text-amber-400 text-xs font-black">
                    {yearNum}
                  </span>
                  {yearNum === 1 && 'Primer Año'}
                  {yearNum === 2 && 'Segundo Año'}
                  {yearNum === 3 && 'Tercer Año'}
                  {yearNum === 4 && 'Cuarto Año'}
                  {yearNum === 5 && 'Quinto Año'}
                </h3>
              </div>

              {yearSubjects.length === 0 ? (
                <div className="text-center py-6 text-xs text-white/20">
                  Ninguna materia coincide con la búsqueda.
                </div>
              ) : (
                <div className="flex-1 flex flex-col gap-3">
                  {yearSubjects.map((subject) => {
                    const status = subjectStatuses[subject.slug];
                    const isHovered = hoveredSubject === subject.slug;
                    const isRelatedPrerequisite = hoveredRelations.requires.includes(subject.slug);
                    const isRelatedUnlock = hoveredRelations.unlocks.includes(subject.slug);

                    return (
                      <div
                        key={subject.slug}
                        onMouseEnter={() => setHoveredSubject(subject.slug)}
                        onMouseLeave={() => setHoveredSubject(null)}
                        onClick={() => handleToggleSubject(subject.slug, status)}
                        className={cn(
                          "group relative p-4 rounded text-left border transition-all duration-300 select-none flex flex-col justify-between min-h-[120px]",
                          // State-specific styling with harmony palettes and glowing borders
                          status === 'COMPLETED' && "bg-emerald-950/20 border-emerald-500/40 hover:border-emerald-400 cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.05)]",
                          status === 'UNLOCKED' && "bg-surface-1 border-white/10 hover:border-amber-500/40 hover:bg-white/5 cursor-pointer",
                          status === 'LOCKED' && "bg-surface-0 border-white/5 opacity-40 cursor-not-allowed",
                          
                          // Hover relations visualization for premium micro-interactions
                          isHovered && "ring-1 ring-amber-500/50 scale-[1.02] shadow-lg z-10",
                          isRelatedPrerequisite && "ring-1 ring-red-500/50 border-red-500/40 scale-[1.01] bg-red-950/5",
                          isRelatedUnlock && "ring-1 ring-blue-500/50 border-blue-500/40 scale-[1.01] bg-blue-950/5"
                        )}
                      >
                        {/* Status Icon Indicator */}
                        <div className="absolute right-3 top-3">
                          {status === 'COMPLETED' && <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400" />}
                          {status === 'UNLOCKED' && <Unlock className="h-4 w-4 text-amber-500/40 group-hover:text-amber-400" />}
                          {status === 'LOCKED' && <Lock className="h-4 w-4 text-white/20" />}
                        </div>

                        {/* Title and details */}
                        <div className="space-y-2 pr-5">
                          <h4 className={cn(
                            "text-sm font-bold leading-snug transition-colors",
                            status === 'COMPLETED' && "text-emerald-300",
                            status === 'UNLOCKED' && "text-white group-hover:text-amber-400",
                            status === 'LOCKED' && "text-white/60"
                          )}>
                            {subject.nombre}
                          </h4>
                          
                          {/* Prerequisite Tags */}
                          {subject.correlativas.length > 0 && (
                            <div className="flex flex-wrap gap-1 items-center text-[10px] text-white/30">
                              <span>Requiere:</span>
                              <span className="font-semibold text-white/50">{subject.correlativas.length} correlativa{subject.correlativas.length > 1 ? 's' : ''}</span>
                            </div>
                          )}
                        </div>

                        {/* Card bottom navigation / actions */}
                        <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-2">
                          <span className={cn(
                            "text-[10px] font-bold uppercase tracking-widest",
                            status === 'COMPLETED' && "text-emerald-400",
                            status === 'UNLOCKED' && "text-amber-500/80",
                            status === 'LOCKED' && "text-white/20"
                          )}>
                            {status === 'COMPLETED' && 'Aprobada'}
                            {status === 'UNLOCKED' && 'Habilitada'}
                            {status === 'LOCKED' && 'Bloqueada'}
                          </span>

                          {status !== 'LOCKED' && (
                            <Link
                              href={`/materia/${subject.slug}`}
                              onClick={(e) => e.stopPropagation()} // Evitar toggle al navegar
                              className="text-[10px] font-bold text-white/30 hover:text-white flex items-center gap-1 group/link"
                            >
                              <BookOpen className="h-3 w-3" />
                              Ver apuntes
                              <ArrowRight className="h-2.5 w-2.5 transition-transform group-hover/link:translate-x-0.5" />
                            </Link>
                          )}
                        </div>

                        {/* Relation helper tooltips */}
                        {isHovered && subject.correlativas.length > 0 && (
                          <div className="absolute bottom-full left-0 right-0 mb-2 p-2 bg-surface-2 border border-white/10 rounded text-[10px] text-white/80 shadow-2xl z-20 space-y-1">
                            <div className="font-black text-red-400/90 uppercase tracking-widest flex items-center gap-1">
                              <span className="h-1 w-1 bg-red-400 rounded-full" />
                              Requisitos obligatorios:
                            </div>
                            <ul className="list-disc list-inside space-y-0.5 pl-1">
                              {subject.correlativas.map(corrSlug => {
                                const name = subjectsData.find(s => s.slug === corrSlug)?.nombre ?? '';
                                return <li key={corrSlug} className="truncate">{name}</li>;
                              })}
                            </ul>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend & Info panel */}
      <div className="bg-surface-1 p-5 rounded border border-white/5 flex flex-col md:flex-row gap-6 items-start justify-between text-xs text-white/50 leading-relaxed max-w-4xl">
        <div className="flex gap-3 items-start">
          <Info className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-white uppercase tracking-wider block">GUÍA RÁPIDA DE USO</span>
            <p>
              Hacé hover sobre cualquier materia para visualizar con quién se conecta: las que se resalten en <span className="text-red-400 font-bold">Rojo</span> son sus correlativas directas necesarias para cursarla. Las que se resalten en <span className="text-blue-400 font-bold">Azul</span> son las materias futuras que vas a destrabar al aprobarla.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 shrink-0 bg-surface-2 p-3 rounded border border-white/5">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-emerald-500/20 border border-emerald-500/50" />
            <span className="text-white/80 font-semibold">Aprobada</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-surface-1 border border-white/15" />
            <span className="text-white/80 font-semibold">Habilitada</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-surface-0 border border-white/5 opacity-55" />
            <span className="text-white/80 font-semibold">Bloqueada</span>
          </div>
        </div>
      </div>
    </div>
  );
}
