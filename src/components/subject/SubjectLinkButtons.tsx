import { cn } from '@/lib/utils'
import type { SubjectLinkDTO } from '@/lib/subjectLinks'
import { getLinkIcon } from '@/lib/subjectLinkIcons'

// Solo permitimos enlaces http(s): evita vectores como `javascript:` en el href.
function isSafeUrl(url: string): boolean {
  return /^https?:\/\//i.test(url.trim())
}

export function SubjectLinkButtons({
  links,
  variant,
}: {
  links: SubjectLinkDTO[]
  variant: 'desktop' | 'mobile'
}) {
  const safeLinks = links.filter((link) => isSafeUrl(link.url))
  if (safeLinks.length === 0) return null

  return (
    <>
      {safeLinks.map((link) => {
        const { icon: Icon, color } = getLinkIcon(link.tipo)
        return (
          <a
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className={
              variant === 'desktop'
                ? 'inline-flex cursor-pointer items-center gap-2 rounded border border-white/10 bg-surface-1 px-4 py-2 text-sm font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white'
                : 'flex items-center justify-center gap-2 w-full h-11 rounded-md bg-white/[0.04] border border-white/10 text-sm font-bold text-white cursor-pointer hover:bg-white/10 transition-colors'
            }
          >
            <Icon className={cn('size-5', color)} />
            {link.label}
          </a>
        )
      })}
    </>
  )
}
