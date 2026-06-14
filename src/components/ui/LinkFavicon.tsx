import Image from 'next/image'
import { Link as LinkIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { faviconUrl } from '@/lib/linkFavicon'

// Muestra el favicon del sitio al que apunta `url`. Si la URL no es válida,
// cae a un icono genérico de enlace. El servicio de favicon de Google siempre
// devuelve una imagen (un globo por defecto), así que no hace falta manejar 404.
export function LinkFavicon({ url, className }: { url: string; className?: string }) {
  const src = faviconUrl(url)
  if (!src) return <LinkIcon className={className} aria-hidden="true" />

  return (
    <Image
      src={src}
      alt=""
      aria-hidden="true"
      width={20}
      height={20}
      unoptimized
      className={cn('object-contain', className)}
    />
  )
}
