import { LinkFavicon } from '@/components/ui/LinkFavicon'

export type YearLinkDTO = {
  id: string
  label: string
  url: string
  orden: number
}

// Solo permitimos enlaces http(s): evita vectores como `javascript:` en el href.
function isSafeUrl(url: string): boolean {
  return /^https?:\/\//i.test(url.trim())
}

export function YearResourceLinks({ links }: { links: readonly YearLinkDTO[] }) {
  const safeLinks = links.filter((link) => isSafeUrl(link.url))
  if (safeLinks.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      {safeLinks.map((link) => (
        <a
          key={link.id}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex cursor-pointer items-center gap-2 rounded border border-white/10 bg-surface-1 px-4 py-2 text-sm font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white"
        >
          <LinkFavicon url={link.url} className="size-5 rounded-sm" />
          {link.label}
        </a>
      ))}
    </div>
  )
}
