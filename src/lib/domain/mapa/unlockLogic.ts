import type { SubjectStatus } from './types';
import { subjectsData } from './correlativasData';

/**
 * Calcula dinámicamente el estado académico de cada materia basándose en
 * la lista de materias ya completadas por el alumno.
 * 
 * Sigue los principios de funciones puras en Clean Architecture.
 * 
 * @param completedSlugs Lista de slugs de las materias aprobadas.
 * @returns Un diccionario de estado por materia (slug -> SubjectStatus).
 */
export function calculateSubjectStatuses(completedSlugs: string[]): Record<string, SubjectStatus> {
  const statuses: Record<string, SubjectStatus> = {};

  for (const subject of subjectsData) {
    if (completedSlugs.includes(subject.slug)) {
      statuses[subject.slug] = 'COMPLETED';
    } else {
      // Si todas las materias correlativas están marcadas como completadas,
      // la materia actual está desbloqueada y disponible para ser cursada.
      const allCorrelativesCompleted = subject.correlativas.every((corrSlug) =>
        completedSlugs.includes(corrSlug)
      );

      statuses[subject.slug] = allCorrelativesCompleted ? 'UNLOCKED' : 'LOCKED';
    }
  }

  return statuses;
}
