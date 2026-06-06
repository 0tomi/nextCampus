export type SubjectLinkDTO = {
  id: string
  tipo: string
  label: string
  url: string
  orden: number
}

export const SUBJECT_LINK_TYPES = [
  { value: 'drive', label: 'Google Drive' },
  { value: 'playlist', label: 'Playlist' },
  { value: 'discord', label: 'Discord' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'otro', label: 'Otro' },
] as const
