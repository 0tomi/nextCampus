'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BookOpen, CheckCircle2 } from 'lucide-react';
import { subjectsData } from '@/lib/domain/mapa/correlativasData';
import { calculateSubjectStatuses } from '@/lib/domain/mapa/unlockLogic';
import type { SubjectNode } from '@/lib/domain/mapa/types';
import {
  MAPA_PROGRESS_UPDATED_EVENT,
  readMapaProgress,
} from '@/lib/mapaProgress';

export function MapaSidebar() {
  const router = useRouter();
  const [completed, setCompleted] = useState<string[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const syncProgress = () => {
      setCompleted(readMapaProgress());
      setIsHydrated(true);
    };

    syncProgress();
    window.addEventListener('storage', syncProgress);
    window.addEventListener(MAPA_PROGRESS_UPDATED_EVENT, syncProgress);

    return () => {
      window.removeEventListener('storage', syncProgress);
      window.removeEventListener(MAPA_PROGRESS_UPDATED_EVENT, syncProgress);
    };
  }, []);

  const subjectStatuses = useMemo(() => calculateSubjectStatuses(completed), [completed]);

  const readySubjects = useMemo(
    () =>
      subjectsData
        .filter((subject) => subjectStatuses[subject.slug] === 'UNLOCKED')
        .sort((a, b) => {
          if (a.year !== b.year) return a.year - b.year;
          return a.nombre.localeCompare(b.nombre);
        }),
    [subjectStatuses],
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex w-full cursor-pointer items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-left text-sm font-bold text-white/78 transition hover:bg-white/8 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          Volver atrás
        </button>

        <section className="rounded-md border border-white/8 bg-black/18 p-3.5">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">
              Lo que ya podés cursar
            </p>
            <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-black text-white/60">
              {readySubjects.length}
            </span>
          </div>

          <div className="mt-3 space-y-2">
            {!isHydrated ? (
              <p className="rounded-md bg-white/5 px-3 py-3 text-xs text-white/45">
                Cargando tu recorrido guardado...
              </p>
            ) : readySubjects.length === 0 ? (
              <p className="rounded-md bg-white/5 px-3 py-3 text-xs leading-5 text-white/45">
                Cuando marques materias, acá vas a ver las próximas opciones disponibles.
              </p>
            ) : (
              readySubjects.map((subject) => (
                <ReadySubjectLink
                  key={subject.slug}
                  subject={subject}
                  href={`/anio-${subject.year}/${subject.slug}`}
                />
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function ReadySubjectLink({
  subject,
  href,
}: {
  subject: SubjectNode;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group flex cursor-pointer items-center gap-3 rounded-md border border-white/8 bg-white/5 px-3 py-2.5 transition hover:border-cyan-300/20 hover:bg-cyan-400/8"
    >
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded bg-cyan-300/14 text-cyan-100">
        <BookOpen className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/58">
          Año {subject.year}
        </span>
        <span className="mt-1 block text-sm font-bold leading-5 text-white">
          {subject.nombre}
        </span>
      </span>
      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-200/70" />
    </Link>
  );
}
