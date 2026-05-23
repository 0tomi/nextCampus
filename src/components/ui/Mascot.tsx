'use client'

import Image from 'next/image'

interface MascotProps {
  size?: number
  className?: string
  alt?: string
}

/**
 * Componente Mascot que renderiza la mascota estudiantil del Campus Virtual ("Campito").
 * Al usar el archivo SVG directamente, preserva todas las animaciones CSS internas (flotado, parpadeo, sonrisa).
 */
export function Mascot({ 
  size = 150, 
  className = '', 
  alt = 'Mascota del Campus Virtual' 
}: MascotProps) {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <Image
        src="/mascot.svg"
        width={size}
        height={size}
        alt={alt}
        className="pointer-events-none drop-shadow-[0_8px_16px_rgba(249,115,22,0.1)]"
        priority
      />
    </div>
  )
}
