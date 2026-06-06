import type { ComponentType } from 'react'
import { CirclePlay, Link as LinkIcon } from 'lucide-react'
import { GoogleDriveIcon } from '@/components/ui/GoogleDriveIcon'
import { DiscordIcon } from '@/components/ui/DiscordIcon'
import { TelegramIcon } from '@/components/ui/TelegramIcon'

type IconEntry = { icon: ComponentType<{ className?: string }>; color?: string }

const REGISTRY: Record<string, IconEntry> = {
  drive:    { icon: GoogleDriveIcon },
  playlist: { icon: CirclePlay, color: 'text-red-400' },
  discord:  { icon: DiscordIcon, color: 'text-indigo-400' },
  telegram: { icon: TelegramIcon, color: 'text-sky-400' },
}

const FALLBACK: IconEntry = { icon: LinkIcon }

export function getLinkIcon(tipo: string): IconEntry {
  return REGISTRY[tipo] ?? FALLBACK
}
