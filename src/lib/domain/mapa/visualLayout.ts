import { subjectsData } from './correlativasData';
import type { SubjectNode } from './types';

export type MapaCamera = {
  x: number;
  y: number;
  scale: number;
};

export const MAPA_NODE_WIDTH = 326;
export const MAPA_NODE_HEIGHT = 138;
const MAPA_YEAR_GAP = 580;
const MAPA_ROW_GAP = 182;
export const MAPA_START_X = 130;
const MAPA_START_Y = 220;
export const MAPA_WORLD_WIDTH = 3120;
export const MAPA_MIN_SCALE = 0.38;
export const MAPA_MAX_SCALE = 1.36;
export const MAPA_INITIAL_CAMERA: MapaCamera = { x: -40, y: -50, scale: 0.58 };

const ARROW_INSET = 18;

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function getNodePosition(subject: SubjectNode) {
  const subjectsInYear = subjectsData.filter((item) => item.year === subject.year);
  const yearIndex = subject.year - 1;
  const rowIndex = subjectsInYear.findIndex((item) => item.slug === subject.slug);
  const columnDrift = subject.year % 2 === 0 ? 42 : 0;
  const rowDrift = rowIndex % 2 === 0 ? 0 : 20;

  return {
    x: MAPA_START_X + yearIndex * MAPA_YEAR_GAP,
    y: MAPA_START_Y + rowIndex * MAPA_ROW_GAP + columnDrift + rowDrift,
  };
}

export function createPath(from: SubjectNode, to: SubjectNode) {
  const start = getNodePosition(from);
  const end = getNodePosition(to);
  const sx = start.x + MAPA_NODE_WIDTH;
  const sy = start.y + MAPA_NODE_HEIGHT / 2;
  const ex = end.x - ARROW_INSET;
  const ey = end.y + MAPA_NODE_HEIGHT / 2;
  const dx = ex - sx;
  const curve = Math.max(100, dx * 0.48);

  return `M ${sx} ${sy} C ${sx + curve} ${sy}, ${ex - curve} ${ey}, ${ex} ${ey}`;
}

export function getMapaVisualEdges() {
  return subjectsData.flatMap((subject) =>
    subject.correlativas.flatMap((sourceSlug) => {
      const source = subjectsData.find((item) => item.slug === sourceSlug);
      return source ? [{ source, target: subject }] : [];
    }),
  );
}

export function getMapaWorldHeight() {
  return Math.max(...subjectsData.map((subject) => getNodePosition(subject).y)) + MAPA_NODE_HEIGHT + 140;
}
