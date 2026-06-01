'use client';

import { useRef, useState } from 'react';
import type { PointerEvent, WheelEvent } from 'react';
import type { SubjectNode } from '@/lib/domain/mapa/types';
import {
  clamp,
  getNodePosition,
  MAPA_INITIAL_CAMERA,
  MAPA_MAX_SCALE,
  MAPA_MIN_SCALE,
  MAPA_NODE_HEIGHT,
  MAPA_NODE_WIDTH,
  MAPA_WORLD_WIDTH,
  type MapaCamera,
} from '@/lib/domain/mapa/visualLayout';

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  camera: MapaCamera;
};

export function useMapaViewport(worldHeight: number) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const [camera, setCamera] = useState<MapaCamera>(MAPA_INITIAL_CAMERA);
  const [isDragging, setIsDragging] = useState(false);

  const getBoundedPosition = (x: number, y: number, scale: number, width: number, height: number) => {
    const paddingX = Math.min(180, width / 3);
    const paddingY = Math.min(180, height / 3);
    const minX = paddingX - MAPA_WORLD_WIDTH * scale;
    const maxX = width - paddingX;
    const minY = paddingY - worldHeight * scale;
    const maxY = height - paddingY;

    return {
      x: clamp(x, minX, maxX),
      y: clamp(y, minY, maxY),
    };
  };

  const moveCameraToSubject = (subject: SubjectNode) => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const rect = viewport.getBoundingClientRect();
    const position = getNodePosition(subject);
    const scale = Math.max(camera.scale, 0.78);
    const targetX = rect.width / 2 - (position.x + MAPA_NODE_WIDTH / 2) * scale;
    const targetY = rect.height / 2 - (position.y + MAPA_NODE_HEIGHT / 2) * scale;
    const bounded = getBoundedPosition(targetX, targetY, scale, rect.width, rect.height);

    setCamera({ scale, x: bounded.x, y: bounded.y });
  };

  const zoomAt = (nextScale: number, originX?: number, originY?: number) => {
    const viewport = viewportRef.current;
    const rect = viewport?.getBoundingClientRect();
    const targetScale = clamp(nextScale, MAPA_MIN_SCALE, MAPA_MAX_SCALE);
    const anchorX = originX ?? (rect?.width ?? 0) / 2;
    const anchorY = originY ?? (rect?.height ?? 0) / 2;

    setCamera((current) => {
      const worldX = (anchorX - current.x) / current.scale;
      const worldY = (anchorY - current.y) / current.scale;
      const targetX = anchorX - worldX * targetScale;
      const targetY = anchorY - worldY * targetScale;

      if (!rect) return { scale: targetScale, x: targetX, y: targetY };

      const bounded = getBoundedPosition(targetX, targetY, targetScale, rect.width, rect.height);
      return { scale: targetScale, x: bounded.x, y: bounded.y };
    });
  };

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const delta = event.deltaY > 0 ? -0.08 : 0.08;

    zoomAt(camera.scale + delta, event.clientX - rect.left, event.clientY - rect.top);
  };

  const startDragging = (event: PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;

    if (target.closest('[data-map-node], [data-map-control], a, button')) return;

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      camera,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
  };

  const dragCamera = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;

    if (!drag || drag.pointerId !== event.pointerId) return;

    const viewport = viewportRef.current;
    if (!viewport) return;

    const rect = viewport.getBoundingClientRect();
    const targetX = drag.camera.x + event.clientX - drag.startX;
    const targetY = drag.camera.y + event.clientY - drag.startY;
    const bounded = getBoundedPosition(targetX, targetY, drag.camera.scale, rect.width, rect.height);

    setCamera({ ...drag.camera, x: bounded.x, y: bounded.y });
  };

  const stopDragging = (event: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
      setIsDragging(false);
    }
  };

  return {
    camera,
    isDragging,
    viewportRef,
    dragCamera,
    moveCameraToSubject,
    resetCamera: () => setCamera(MAPA_INITIAL_CAMERA),
    startDragging,
    stopDragging,
    zoomAt,
    handleWheel,
  };
}
