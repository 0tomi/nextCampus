export type SubjectStatus = 'COMPLETED' | 'UNLOCKED' | 'LOCKED';

export interface SubjectNode {
  slug: string;
  nombre: string;
  year: number; // 1 to 5
  correlativas: string[]; // List of subject slugs required to unlock this subject
}

export interface MapaState {
  completed: string[]; // List of completed subject slugs
}
