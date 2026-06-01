import { useMemo } from 'react';
import { MAPA_YEARS, type MapaYear } from '@/lib/domain/mapa/mapaConstants';
import { getSubjectsByYear } from '@/lib/domain/mapa/subjectQueries';

function getSuggestedYearToComplete(completed: readonly string[]): Exclude<MapaYear, 1> | null {
  const completedSet = new Set(completed);

  for (const year of MAPA_YEARS) {
    const yearSubjects = getSubjectsByYear(year);
    const yearIsCompleted = yearSubjects.every((subject) => completedSet.has(subject.slug));

    if (!yearIsCompleted) {
      if (year === 1) return null;
      return year;
    }
  }

  return null;
}

export function useSuggestedYear(completed: readonly string[]) {
  return useMemo(() => getSuggestedYearToComplete(completed), [completed]);
}
