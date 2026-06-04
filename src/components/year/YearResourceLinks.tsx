import { CirclePlay } from 'lucide-react'
import { DiscordIcon } from '@/components/ui/DiscordIcon'
import { GoogleDriveIcon } from '@/components/ui/GoogleDriveIcon'

export type YearResourceLinksData = {
  driveUrl?: string | null
  playlistUrl?: string | null
  discordUrl?: string | null
  discordDescripcion?: string | null
  discordAltUrl?: string | null
  discordAltDescripcion?: string | null
}

export function YearResourceLinks({
  driveUrl,
  playlistUrl,
  discordUrl,
  discordDescripcion,
  discordAltUrl,
  discordAltDescripcion,
}: YearResourceLinksData) {
  if (!driveUrl && !playlistUrl && !discordUrl && !discordAltUrl) return null

  const discordLabel = discordDescripcion?.trim() || 'Discord'
  const discordAltLabel = discordAltDescripcion?.trim() || 'Discord alternativo'

  return (
    <div className="flex flex-wrap items-center gap-2">
      {driveUrl ? (
        <a
          href={driveUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex cursor-pointer items-center gap-2 rounded border border-white/10 bg-surface-1 px-4 py-2 text-sm font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white"
        >
          <GoogleDriveIcon className="size-5" />
          Drive del año
        </a>
      ) : null}

      {playlistUrl ? (
        <a
          href={playlistUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex cursor-pointer items-center gap-2 rounded border border-white/10 bg-surface-1 px-4 py-2 text-sm font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white"
        >
          <CirclePlay className="size-5 text-red-400" />
          Playlist del año
        </a>
      ) : null}

      {discordUrl ? (
        <a
          href={discordUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex cursor-pointer items-center gap-2 rounded border border-white/10 bg-surface-1 px-4 py-2 text-sm font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white"
        >
          <DiscordIcon className="size-5 text-indigo-400" />
          {discordLabel}
        </a>
      ) : null}

      {discordAltUrl ? (
        <a
          href={discordAltUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex cursor-pointer items-center gap-2 rounded border border-white/10 bg-surface-1 px-4 py-2 text-sm font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white"
        >
          <DiscordIcon className="size-5 text-indigo-400" />
          {discordAltLabel}
        </a>
      ) : null}
    </div>
  )
}
