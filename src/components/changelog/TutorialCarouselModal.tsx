'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import type { ChangelogTutorialView } from './types'

interface TutorialCarouselModalProps {
  changelogId: string | null
  title: string
  open: boolean
  onClose: () => void
}

export function TutorialCarouselModal({ changelogId, title, open, onClose }: TutorialCarouselModalProps) {
  const [result, setResult] = useState<{
    changelogId: string
    tutorial: ChangelogTutorialView | null
    error: string
  } | null>(null)
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (!open || !changelogId) return

    fetch(`/api/changelog/tutorial/${encodeURIComponent(changelogId)}`)
      .then(async (response) => {
        if (!response.ok) throw new Error('No encontramos el tutorial.')
        return (await response.json()) as ChangelogTutorialView
      })
      .then((data) => {
        setIndex(0)
        setResult({ changelogId, tutorial: data, error: '' })
      })
      .catch(() => {
        setIndex(0)
        setResult({
          changelogId,
          tutorial: null,
          error: 'Todavía no hay un tutorial disponible para esta novedad.',
        })
      })
  }, [changelogId, open])

  const loading = Boolean(open && changelogId && result?.changelogId !== changelogId)
  const error = result?.changelogId === changelogId ? result.error : ''
  const tutorial = result?.changelogId === changelogId ? result.tutorial : null
  const steps = tutorial?.steps ?? []
  const currentStep = steps[index]
  const canGoBack = index > 0
  const canGoNext = index < steps.length - 1

  return (
    <Modal open={open} onClose={onClose} title={title} className="max-w-3xl" contentClassName="p-0">
      <div className="space-y-5 p-5 sm:p-6">
        {loading ? (
          <div className="space-y-4">
            <div className="aspect-video animate-pulse bg-white/[0.06]" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-white/[0.06]" />
          </div>
        ) : error ? (
          <div className="rounded border border-white/10 bg-white/[0.03] px-4 py-6 text-sm leading-6 text-white/55">
            {error}
          </div>
        ) : currentStep ? (
          <>
            <div className="overflow-hidden rounded-none border border-white/8 bg-surface-0">
              <Image
                src={currentStep.image}
                alt=""
                width={1120}
                height={630}
                className="aspect-video w-full object-cover"
              />
            </div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40">
                  Paso {index + 1} de {steps.length}
                </p>
                <p className="text-sm leading-6 text-white/64">{currentStep.description}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIndex((value) => Math.max(0, value - 1))}
                  disabled={!canGoBack}
                  className="inline-flex size-10 cursor-pointer items-center justify-center rounded border border-white/10 text-white/60 transition-colors hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Paso anterior"
                >
                  <ArrowLeft className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIndex((value) => Math.min(steps.length - 1, value + 1))}
                  disabled={!canGoNext}
                  className="inline-flex size-10 cursor-pointer items-center justify-center rounded border border-white/10 text-white/60 transition-colors hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Paso siguiente"
                >
                  <ArrowRight className="size-4" />
                </button>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </Modal>
  )
}
