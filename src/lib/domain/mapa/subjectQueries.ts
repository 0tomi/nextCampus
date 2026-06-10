import { subjectsData } from './correlativasData';
import { MAPA_YEARS, YEAR_LABELS, type MapaYear } from './mapaConstants';
import type { SubjectNode, SubjectStatus } from './types';

const subjectBySlug = new Map(subjectsData.map((subject) => [subject.slug, subject]));

export type SubjectStatusFilter = 'ALL' | SubjectStatus;
export type SubjectYearFilter = 'ALL' | MapaYear;
export type SubjectsByYear = Record<MapaYear, SubjectNode[]>;
export type YearSummary = {
  year: MapaYear;
  title: string;
  done: number;
  ready: number;
  total: number;
  subjects: SubjectNode[];
};

export function getSubjectBySlug(slug: string): SubjectNode | undefined {
  return subjectBySlug.get(slug);
}

export function getSubjectName(slug: string): string {
  return getSubjectBySlug(slug)?.nombre ?? 'Materia';
}

export function getUnlocks(slug: string): SubjectNode[] {
  return subjectsData.filter((subject) => subject.correlativas.includes(slug));
}

export function getMissingCorrelatives(subject: SubjectNode, completed: readonly string[]): string[] {
  const completedSet = new Set(completed);
  return subject.correlativas.filter((slug) => !completedSet.has(slug));
}

export function removeSubjectAndDependents(slugToRemove: string, currentCompleted: readonly string[]): string[] {
  let nextCompleted = currentCompleted.filter((slug) => slug !== slugToRemove);
  const dependents = subjectsData.filter(
    (subject) => subject.correlativas.includes(slugToRemove) && nextCompleted.includes(subject.slug),
  );

  for (const dependent of dependents) {
    nextCompleted = removeSubjectAndDependents(dependent.slug, nextCompleted);
  }

  return nextCompleted;
}

export function getSubjectsByYear(year: number): SubjectNode[] {
  return subjectsData.filter((subject) => subject.year === year);
}

export function getSubjectSlugsByYear(year: number): string[] {
  return getSubjectsByYear(year).map((subject) => subject.slug);
}

export function filterSubjects({
  searchTerm,
  statusFilter,
  yearFilter,
  subjectStatuses,
}: {
  searchTerm: string;
  statusFilter: SubjectStatusFilter;
  yearFilter?: SubjectYearFilter;
  subjectStatuses: Record<string, SubjectStatus>;
}): SubjectNode[] {
  const normalizedSearch = searchTerm.trim().toLowerCase();

  return subjectsData.filter((subject) => {
    const matchesSearch =
      normalizedSearch.length === 0 ||
      subject.nombre.toLowerCase().includes(normalizedSearch) ||
      subject.codigo.toLowerCase().includes(normalizedSearch);
    const matchesStatus =
      statusFilter === 'ALL' || subjectStatuses[subject.slug] === statusFilter;
    const matchesYear =
      yearFilter === undefined || yearFilter === 'ALL' || subject.year === yearFilter;

    return matchesSearch && matchesStatus && matchesYear;
  });
}

export function getSuggestedSubjects(
  subjectStatuses: Record<string, SubjectStatus>,
  limit: number,
): SubjectNode[] {
  return subjectsData
    .filter((subject) => subjectStatuses[subject.slug] === 'UNLOCKED')
    .sort((a, b) => getUnlocks(b.slug).length - getUnlocks(a.slug).length)
    .slice(0, limit);
}

export function resolveSubjectSlugs(slugs: readonly string[]): SubjectNode[] {
  return slugs
    .map((slug) => subjectBySlug.get(slug))
    .filter((subject): subject is SubjectNode => Boolean(subject));
}

export function groupSubjectsByYear(subjects: readonly SubjectNode[]): SubjectsByYear {
  const grouped: SubjectsByYear = { 1: [], 2: [], 3: [], 4: [], 5: [] };
  for (const subject of subjects) grouped[subject.year as MapaYear].push(subject);
  return grouped;
}

export function getYearSummaries(
  subjectStatuses: Record<string, SubjectStatus>,
): YearSummary[] {
  return MAPA_YEARS.map((year) => {
    const subjects = getSubjectsByYear(year);
    return {
      year,
      title: YEAR_LABELS[year],
      done: subjects.filter((subject) => subjectStatuses[subject.slug] === 'COMPLETED').length,
      ready: subjects.filter((subject) => subjectStatuses[subject.slug] === 'UNLOCKED').length,
      total: subjects.length,
      subjects,
    };
  });
}

export function canOpenSubjectPage(availableSlugs: ReadonlySet<string>, slug: string): boolean {
  return availableSlugs.size === 0 || availableSlugs.has(slug);
}
