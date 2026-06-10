import { useState } from 'react';
import { subjectsData } from '@/lib/domain/mapa/correlativasData';
import {
  getMissingCorrelatives,
  getUnlocks,
} from '@/lib/domain/mapa/subjectQueries';
import type { SubjectNode, SubjectStatus } from '@/lib/domain/mapa/types';
import type { useMapaProgress } from './useMapaProgress';

type MapaProgress = Pick<
  ReturnType<typeof useMapaProgress>,
  'completed' | 'subjectStatuses' | 'toggleSubject'
>;

export function getSubjectDetails(
  slug: string | null,
  subjectStatuses: Record<string, SubjectStatus>,
  completed: readonly string[],
) {
  if (!slug) return null;
  const subject = subjectsData.find((item) => item.slug === slug);
  if (!subject) return null;

  return {
    subject,
    status: subjectStatuses[subject.slug] ?? 'UNLOCKED',
    unlocks: getUnlocks(subject.slug),
    missing: getMissingCorrelatives(subject, completed),
  };
}

export function useSubjectSelection(progress: MapaProgress) {
  const [selectedSlug, setSelectedSlug] = useState(subjectsData[0]?.slug ?? '');
  const selectedSubject =
    subjectsData.find((subject) => subject.slug === selectedSlug) ?? subjectsData[0]!;
  const selectedStatus = progress.subjectStatuses[selectedSubject.slug] ?? 'UNLOCKED';
  const selectedUnlocks = getUnlocks(selectedSubject.slug);
  const selectedMissing = getMissingCorrelatives(selectedSubject, progress.completed);

  const selectSubject = (slug: string) => {
    setSelectedSlug(slug);
  };

  const toggleSubject = (subject: SubjectNode) => {
    setSelectedSlug(subject.slug);
    if (progress.subjectStatuses[subject.slug] === 'LOCKED') return;
    progress.toggleSubject(subject);
  };

  const resetSelection = () => {
    setSelectedSlug(subjectsData[0]?.slug ?? '');
  };

  return {
    selectedSlug,
    selectedSubject,
    selectedStatus,
    selectedUnlocks,
    selectedMissing,
    selectSubject,
    toggleSubject,
    resetSelection,
  };
}
