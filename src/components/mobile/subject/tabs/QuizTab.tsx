import Link from 'next/link'
import { Sparkles, ArrowRight } from 'lucide-react'
import { getYearColorClasses } from '@/lib/yearColors'

export function QuizTab({
  subjectSlug,
  subjectName,
  yearSlug,
}: {
  subjectSlug: string
  subjectName: string
  yearSlug: string
}) {
  const colors = getYearColorClasses(yearSlug)
  return (
    <div className="px-[18px] flex flex-col gap-3">
      <div className="bg-[#1a1a1a] border border-white/5 rounded-xl p-5 flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <span className={['flex items-center justify-center w-11 h-11 shrink-0 rounded-md bg-gradient-to-br', colors.badgeClassName].join(' ')}>
            <Sparkles size={18} strokeWidth={2.4} />
          </span>
          <div>
            <h3 className="text-base font-black text-white leading-tight">
              Quiz de {subjectName}
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-white/55">
              Practicá con bancos de preguntas en modo práctica (con explicaciones) o examen.
            </p>
          </div>
        </div>
        <Link
          href={`/materia/${subjectSlug}/quiz`}
          className={['flex items-center justify-center gap-2 h-11 rounded-md text-sm font-bold text-black cursor-pointer bg-gradient-to-r', colors.badgeClassName].join(' ')}
        >
          Empezar quiz
          <ArrowRight size={16} strokeWidth={2.5} />
        </Link>
      </div>
    </div>
  )
}
