import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { subjectsData } from '@/lib/domain/mapa/correlativasData';
import { calculateSubjectStatuses } from '@/lib/domain/mapa/unlockLogic';
import type { SubjectNode } from '@/lib/domain/mapa/types';
import { getSubjectSlugsByYear, removeSubjectAndDependents } from '@/lib/domain/mapa/subjectQueries';
import { getMapaProgressSnapshot, subscribeMapaProgress, writeMapaProgress } from '@/lib/mapaProgress';

const subscribeHydration = () => () => undefined;
const getHydratedSnapshot = () => true;
const getServerHydratedSnapshot = () => false;
const getServerProgressSnapshot = () => [] as string[];

export function useMapaProgress() {
  const completed = useSyncExternalStore(
    subscribeMapaProgress,
    getMapaProgressSnapshot,
    getServerProgressSnapshot,
  );
  const isHydrated = useSyncExternalStore(
    subscribeHydration,
    getHydratedSnapshot,
    getServerHydratedSnapshot,
  );
  const subjectStatuses = useMemo(() => calculateSubjectStatuses(completed), [completed]);

  const toggleSubject = useCallback(
    (subject: SubjectNode) => {
      const currentStatus = subjectStatuses[subject.slug];

      if (currentStatus === 'LOCKED') return;

      if (currentStatus === 'COMPLETED') {
        writeMapaProgress(removeSubjectAndDependents(subject.slug, completed));
        return;
      }

      writeMapaProgress(Array.from(new Set([...completed, subject.slug])));
    },
    [completed, subjectStatuses],
  );

  const autocompleteYear = useCallback(
    (year: number) => {
      const yearSlugs = getSubjectSlugsByYear(year);
      writeMapaProgress(Array.from(new Set([...completed, ...yearSlugs])));
    },
    [completed],
  );

  const reset = useCallback(() => {
    writeMapaProgress([]);
  }, []);

  const completedSet = useMemo(() => new Set(completed), [completed]);
  const completedCount = completed.length;
  const totalSubjects = subjectsData.length;
  const unlockedCount = Object.values(subjectStatuses).filter((status) => status === 'UNLOCKED').length;
  const lockedCount = totalSubjects - completedCount - unlockedCount;
  const progressPercentage = Math.round((completedCount / totalSubjects) * 100);

  return {
    completed,
    completedSet,
    completedCount,
    unlockedCount,
    lockedCount,
    totalSubjects,
    progressPercentage,
    isHydrated,
    subjectStatuses,
    toggleSubject,
    autocompleteYear,
    reset,
  };
}
