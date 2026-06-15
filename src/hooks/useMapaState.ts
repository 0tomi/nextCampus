'use client';

import { useMemo, useState } from 'react';
import type { MapaYear } from '@/lib/domain/mapa/mapaConstants';
import {
  filterSubjects,
  getMissingCorrelatives,
  getSuggestedSubjects,
  getUnlocks,
  getYearSummaries,
  groupSubjectsByYear,
  resolveSubjectSlugs,
  type SubjectsByYear,
  type SubjectStatusFilter,
  type SubjectYearFilter,
  type YearSummary,
} from '@/lib/domain/mapa/subjectQueries';
import type { SubjectNode, SubjectStatus } from '@/lib/domain/mapa/types';
import { useMapaProgress } from './useMapaProgress';
import { useSubjectSelection } from './useSubjectSelection';
import { useSuggestedYear } from './useSuggestedYear';

export type StatusFilter = SubjectStatusFilter;
export type YearFilter = SubjectYearFilter;

export type MapaDerivedState = {
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
  suggestedYearToComplete: Exclude<MapaYear, 1> | null;
  yearSummaries: YearSummary[];
};

export type MapaActions = {
  autocompleteYear: (year: number) => void;
  onSearchTermChange: (value: string) => void;
  onSelectSubject: (slug: string) => void;
  onStatusFilterChange: (filter: StatusFilter) => void;
  onToggleSubject: (subject: SubjectNode) => void;
  onYearFilterChange: (filter: YearFilter) => void;
};

export type MapaFilters = {
  searchTerm: string;
  statusFilter: StatusFilter;
  yearFilter: YearFilter;
};

type DeriveMapaStateInput = {
  availableSubjectSlugs: readonly string[];
  completed: readonly string[];
  searchTerm: string;
  selectedSubject: SubjectNode;
  statusFilter: StatusFilter;
  subjectStatuses: Record<string, SubjectStatus>;
  suggestedSubjectsLimit: number;
  suggestedYearToComplete: Exclude<MapaYear, 1> | null;
  yearFilter: YearFilter;
};

export function deriveMapaState({
  availableSubjectSlugs,
  completed,
  searchTerm,
  selectedSubject,
  statusFilter,
  subjectStatuses,
  suggestedSubjectsLimit,
  suggestedYearToComplete,
  yearFilter,
}: DeriveMapaStateInput): MapaDerivedState {
  const filteredSubjects = filterSubjects({
    searchTerm,
    statusFilter,
    yearFilter,
    subjectStatuses,
  });
  const selectedMissing = getMissingCorrelatives(selectedSubject, completed);
  const selectedUnlocks = getUnlocks(selectedSubject.slug);

  return {
    availableSlugs: new Set(availableSubjectSlugs),
    filteredSubjects,
    selectedDirectUnlocks: selectedUnlocks.slice(0, 4),
    selectedMissing,
    selectedMissingSubjects: resolveSubjectSlugs(selectedMissing).slice(0, 5),
    selectedStatus: subjectStatuses[selectedSubject.slug] ?? 'UNLOCKED',
    selectedSubject,
    selectedUnlocks,
    subjectsByYear: groupSubjectsByYear(filteredSubjects),
    suggestedSubjects: getSuggestedSubjects(subjectStatuses, suggestedSubjectsLimit),
    suggestedYearToComplete,
    yearSummaries: getYearSummaries(subjectStatuses),
  };
}

const EMPTY_AVAILABLE_SUBJECT_SLUGS: readonly string[] = [];

export function useMapaState({
  availableSubjectSlugs = EMPTY_AVAILABLE_SUBJECT_SLUGS,
  suggestedSubjectsLimit,
}: {
  availableSubjectSlugs?: readonly string[];
  suggestedSubjectsLimit: number;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [yearFilter, setYearFilter] = useState<YearFilter>('ALL');
  const progress = useMapaProgress();
  const selection = useSubjectSelection(progress);
  const suggestedYearToComplete = useSuggestedYear(progress.completed);

  const derived = useMemo(
    () =>
      deriveMapaState({
        availableSubjectSlugs,
        completed: progress.completed,
        searchTerm,
        selectedSubject: selection.selectedSubject,
        statusFilter,
        subjectStatuses: progress.subjectStatuses,
        suggestedSubjectsLimit,
        suggestedYearToComplete,
        yearFilter,
      }),
    [
      availableSubjectSlugs,
      progress.completed,
      progress.subjectStatuses,
      searchTerm,
      selection.selectedSubject,
      statusFilter,
      suggestedSubjectsLimit,
      suggestedYearToComplete,
      yearFilter,
    ],
  );

  const actions: MapaActions = {
    autocompleteYear: progress.autocompleteYear,
    onSearchTermChange: setSearchTerm,
    onSelectSubject: selection.selectSubject,
    onStatusFilterChange: setStatusFilter,
    onToggleSubject: selection.toggleSubject,
    onYearFilterChange: setYearFilter,
  };

  const filters: MapaFilters = {
    searchTerm,
    statusFilter,
    yearFilter,
  };

  return {
    actions,
    derived,
    filters,
    progress,
    selection,
  };
}
