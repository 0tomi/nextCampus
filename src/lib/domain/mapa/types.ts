export type SubjectStatus = 'COMPLETED' | 'UNLOCKED' | 'LOCKED';

export type SubjectPeriod = 'Anual' | 'Primer cuatrimestre' | 'Segundo cuatrimestre';

export interface SubjectNode {
  slug: string;
  nombre: string;
  year: number;
  codigo: string;
  horas: number;
  periodo: SubjectPeriod;
  correlativas: string[];
  paraRendir?: string[];
  optativaActual?: string;
}

export interface MapaState {
  completed: string[];
}
