'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface MascotProps {
  size?: number
  className?: string
  alt?: string
}

const GLOW_COLORS = [
  '#f59e0b', // Amber
  '#f97316', // Orange
  '#a855f7', // Violet
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#ec4899', // Rose
]

/**
 * Campito mantiene los libros estáticos y anima solo al búho al hacer click.
 */
export function Mascot({
  size = 150,
  className = '',
  alt = 'Mascota del Campus Virtual',
}: MascotProps) {
  const svgId = useId().replace(/:/g, '')
  const [isHopping, setIsHopping] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const [glowColor, setGlowColor] = useState('')
  const [showGlow, setShowGlow] = useState(false)

  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const glowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const bodyGradientId = `${svgId}-body-gradient`
  const bellyGradientId = `${svgId}-belly-gradient`
  const capBoardGradientId = `${svgId}-cap-board-gradient`
  const beakGradientId = `${svgId}-beak-gradient`
  const softShadowId = `${svgId}-soft-shadow`

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

    const syncPreference = () => {
      setPrefersReducedMotion(mediaQuery.matches)
    }

    syncPreference()
    mediaQuery.addEventListener('change', syncPreference)

    return () => {
      mediaQuery.removeEventListener('change', syncPreference)

      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current)
      }
      if (glowTimerRef.current) {
        clearTimeout(glowTimerRef.current)
      }
    }
  }, [])

  const triggerHop = () => {
    // Vibrate device on mobile
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(15)
      } catch (e) {
        // Ignorar errores de vibración
      }
    }

    // Set random glow color
    const randomColor = GLOW_COLORS[Math.floor(Math.random() * GLOW_COLORS.length)]
    setGlowColor(randomColor)
    setShowGlow(true)

    if (glowTimerRef.current) {
      clearTimeout(glowTimerRef.current)
    }
    glowTimerRef.current = setTimeout(() => {
      setShowGlow(false)
    }, 800)

    if (prefersReducedMotion) {
      return
    }

    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current)
    }

    setIsHopping(false)

    requestAnimationFrame(() => {
      setIsHopping(true)

      resetTimerRef.current = setTimeout(() => {
        setIsHopping(false)
      }, 620)
    })
  }

  return (
    <button
      type="button"
      onClick={triggerHop}
      className={`group relative flex cursor-pointer items-center justify-center select-none rounded-full bg-transparent p-0 ${className}`}
      aria-label={alt}
      title="Campito"
    >
      <div
        className={cn(
          'absolute pointer-events-none rounded-full blur-2xl transition-all duration-700 ease-out z-0',
          showGlow ? 'opacity-70 scale-110' : 'opacity-0 scale-90'
        )}
        style={{
          backgroundColor: glowColor || '#f97316',
          width: `${size * 0.75}px`,
          height: `${size * 0.75}px`,
        }}
      />
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 400 400"
        width={size}
        height={size}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
        className="overflow-visible drop-shadow-[0_8px_16px_rgba(249,115,22,0.1)] relative z-10"
      >
        <defs>
          <linearGradient id={bodyGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1E5A8F" />
            <stop offset="100%" stopColor="#002D5A" />
          </linearGradient>

          <linearGradient id={bellyGradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#F8FAFC" />
            <stop offset="100%" stopColor="#E2E8F0" />
          </linearGradient>

          <linearGradient id={capBoardGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3F3F46" />
            <stop offset="100%" stopColor="#111827" />
          </linearGradient>

          <linearGradient id={beakGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#EF4444" />
            <stop offset="100%" stopColor="#B91C1C" />
          </linearGradient>

          <filter id={softShadowId} x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow
              dx="0"
              dy="8"
              stdDeviation="5"
              floodColor="#000000"
              floodOpacity="0.15"
            />
          </filter>
        </defs>

        <style>{`
          .floating-mascot {
            transform-box: fill-box;
            transform-origin: center bottom;
            animation: mascot-breath 4.2s infinite ease-in-out;
            will-change: transform;
          }

          .floating-mascot.is-hopping {
            animation: mascot-hop 560ms cubic-bezier(0.22, 1, 0.36, 1) both;
          }

          @keyframes mascot-breath {
            0%, 100% {
              transform: translate3d(0px, 0px, 0px) scale3d(1, 1, 1);
            }
            50% {
              transform: translate3d(0px, -2px, 0px) scale3d(0.985, 1.018, 1);
            }
          }

          @keyframes mascot-hop {
            0% {
              transform: translate3d(0px, 0px, 0px) scale3d(1, 1, 1);
            }
            10% {
              transform: translate3d(0px, 3px, 0px) scale3d(1.022, 0.978, 1);
            }
            24% {
              transform: translate3d(0px, -14px, 0px) scale3d(0.992, 1.02, 1);
            }
            38% {
              transform: translate3d(0px, -29px, 0px) scale3d(0.978, 1.042, 1);
            }
            54% {
              transform: translate3d(0px, -34px, 0px) scale3d(0.974, 1.046, 1);
            }
            70% {
              transform: translate3d(0px, -12px, 0px) scale3d(0.993, 1.012, 1);
            }
            84% {
              transform: translate3d(0px, 0px, 0px) scale3d(1.026, 0.972, 1);
            }
            92% {
              transform: translate3d(0px, -4px, 0px) scale3d(0.996, 1.008, 1);
            }
            100% {
              transform: translate3d(0px, 0px, 0px) scale3d(1, 1, 1);
            }
          }

          .blink-eye-left {
            transform-origin: 148px 180px;
            animation: eye-blink 4s infinite ease-in-out, eye-hide 6s infinite ease-in-out;
          }

          .blink-eye-right {
            transform-origin: 252px 180px;
            animation: eye-blink 4s infinite ease-in-out, eye-hide 6s infinite ease-in-out;
          }

          @keyframes eye-blink {
            0%, 88%, 92%, 96%, 100% {
              transform: scaleY(1);
            }
            90%, 94% {
              transform: scaleY(0.08);
            }
          }

          @keyframes eye-hide {
            0%, 42%, 63%, 100% {
              opacity: 1;
            }
            47%, 58% {
              opacity: 0;
            }
          }

          .happy-eye-left {
            transform-origin: 148px 180px;
            opacity: 0;
            animation: eye-show 6s infinite ease-in-out;
          }

          .happy-eye-right {
            transform-origin: 252px 180px;
            opacity: 0;
            animation: eye-show 6s infinite ease-in-out;
          }

          @keyframes eye-show {
            0%, 42%, 63%, 100% {
              opacity: 0;
              transform: scale(0.7);
            }
            47%, 58% {
              opacity: 1;
              transform: scale(1);
            }
          }

          .cheek-blush-left {
            transform-origin: 108px 210px;
            animation: cheek-pulse 6s infinite ease-in-out;
          }

          .cheek-blush-right {
            transform-origin: 292px 210px;
            animation: cheek-pulse 6s infinite ease-in-out;
          }

          @keyframes cheek-pulse {
            0%, 42%, 63%, 100% {
              opacity: 0.25;
              transform: scale(1);
            }
            47%, 58% {
              opacity: 0.75;
              transform: scale(1.3);
            }
          }

          .left-wing {
            transform-origin: 95px 190px;
            animation: wing-flap-left 4s infinite ease-in-out;
          }

          .right-wing {
            transform-origin: 305px 190px;
            animation: wing-flap-right 4s infinite ease-in-out;
          }

          @keyframes wing-flap-left {
            0%, 100% { transform: rotate(0deg); }
            50% { transform: rotate(8deg); }
          }

          @keyframes wing-flap-right {
            0%, 100% { transform: rotate(0deg); }
            50% { transform: rotate(-8deg); }
          }

          .tassel-sway {
            transform-origin: 280px 120px;
            animation: tassel-wiggle 3s infinite ease-in-out;
          }

          @keyframes tassel-wiggle {
            0%, 100% { transform: rotate(0deg); }
            50% { transform: rotate(10deg); }
          }

          @media (prefers-reduced-motion: reduce) {
            .floating-mascot,
            .floating-mascot.is-hopping,
            .blink-eye-left,
            .blink-eye-right,
            .happy-eye-left,
            .happy-eye-right,
            .cheek-blush-left,
            .cheek-blush-right,
            .left-wing,
            .right-wing,
            .tassel-sway {
              animation: none !important;
            }
          }
        `}</style>

        <ellipse cx="200" cy="396" rx="135" ry="4" fill="#000000" opacity="0.25" />

        <g>
          <g>
            <rect x="75" y="372" width="250" height="24" rx="4" fill="#D97706" />
            <rect x="75" y="372" width="250" height="5" rx="2" fill="#FBBF24" />
            <rect x="100" y="377" width="6" height="19" fill="#1E293B" opacity="0.25" />
            <rect x="112" y="377" width="6" height="19" fill="#1E293B" opacity="0.25" />
            <rect x="290" y="377" width="6" height="19" fill="#1E293B" opacity="0.25" />
          </g>

          <g transform="rotate(-1, 200, 361)">
            <rect x="85" y="350" width="230" height="22" rx="3" fill="#002D5A" />
            <rect x="85" y="350" width="230" height="5" rx="1.5" fill="#1E5A8F" />
            <rect x="115" y="355" width="5" height="17" fill="#FFFBEB" opacity="0.2" />
            <rect x="125" y="355" width="5" height="17" fill="#FFFBEB" opacity="0.2" />
            <rect x="275" y="355" width="5" height="17" fill="#FFFBEB" opacity="0.2" />
          </g>

          <g transform="rotate(1.5, 200, 340)">
            <rect x="110" y="330" width="180" height="20" rx="3" fill="#B91C1C" />
            <rect x="110" y="330" width="180" height="4" rx="1" fill="#EF4444" />
            <rect x="165" y="336" width="70" height="9" rx="1.5" fill="#F8FAFC" opacity="0.85" />
            <rect x="135" y="334" width="4" height="16" fill="#FBBF24" />
            <rect x="260" y="334" width="4" height="16" fill="#FBBF24" />
          </g>
        </g>

        <g className={`floating-mascot${isHopping ? ' is-hopping' : ''}`} filter={`url(#${softShadowId})`}>
          <path d="M 110 120 L 70 85 L 140 108 Z" fill={`url(#${bodyGradientId})`} />
          <path d="M 290 120 L 330 85 L 260 108 Z" fill={`url(#${bodyGradientId})`} />

          <g>
            <ellipse cx="155" cy="328" rx="10" ry="6" fill="#CC0000" />
            <ellipse cx="165" cy="328" rx="10" ry="6" fill="#CC0000" />
            <ellipse cx="145" cy="326" rx="9" ry="6" fill="#990000" />
          </g>

          <g>
            <ellipse cx="235" cy="328" rx="10" ry="6" fill="#CC0000" />
            <ellipse cx="245" cy="328" rx="10" ry="6" fill="#CC0000" />
            <ellipse cx="255" cy="326" rx="9" ry="6" fill="#990000" />
          </g>

          <rect x="90" y="110" width="220" height="220" rx="110" ry="110" fill={`url(#${bodyGradientId})`} />
          <ellipse cx="200" cy="245" rx="75" ry="60" fill={`url(#${bellyGradientId})`} />

          <path
            className="left-wing"
            d="M 95 190 C 65 190, 45 230, 75 260 C 90 270, 105 240, 105 210 Z"
            fill={`url(#${bodyGradientId})`}
          />
          <path
            className="right-wing"
            d="M 305 190 C 335 190, 355 230, 325 260 C 310 270, 295 240, 295 210 Z"
            fill={`url(#${bodyGradientId})`}
          />

          <ellipse cx="148" cy="180" rx="42" ry="46" fill="#FFFBEB" opacity="0.95" />
          <ellipse cx="252" cy="180" rx="42" ry="46" fill="#FFFBEB" opacity="0.95" />

          <circle className="cheek-blush-left" cx="108" cy="210" r="10" fill="#F87171" opacity="0.25" />
          <circle className="cheek-blush-right" cx="292" cy="210" r="10" fill="#F87171" opacity="0.25" />

          <polygon points="200,186 212,200 200,212 188,200" fill={`url(#${beakGradientId})`} />

          <path
            d="M 192 212 Q 200 215 208 212"
            fill="none"
            stroke="#990000"
            strokeWidth="3"
            strokeLinecap="round"
          >
            <animate
              attributeName="d"
              dur="6s"
              repeatCount="indefinite"
              values="M 192 212 Q 200 215 208 212;
                      M 192 212 Q 200 215 208 212;
                      M 186 210 Q 200 230 214 210;
                      M 192 212 Q 200 215 208 212"
              keyTimes="0; 0.42; 0.47; 1"
            />
          </path>

          <g className="blink-eye-left">
            <circle cx="148" cy="180" r="26" fill="#0F172A" />
            <circle cx="138" cy="170" r="8" fill="#FFFFFF" />
            <circle cx="158" cy="190" r="4" fill="#FFFFFF" />
          </g>

          <g className="blink-eye-right">
            <circle cx="252" cy="180" r="26" fill="#0F172A" />
            <circle cx="242" cy="170" r="8" fill="#FFFFFF" />
            <circle cx="262" cy="190" r="4" fill="#FFFFFF" />
          </g>

          <path
            className="happy-eye-left"
            d="M 130 185 Q 148 160 166 185"
            fill="none"
            stroke="#0F172A"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <path
            className="happy-eye-right"
            d="M 234 185 Q 252 160 270 185"
            fill="none"
            stroke="#0F172A"
            strokeWidth="6"
            strokeLinecap="round"
          />

          <path d="M 148 92 L 148 112 C 148 126, 252 126, 252 112 L 252 92 Z" fill="#18181B" />
          <path d="M 152 112 C 152 120, 248 120, 248 112" fill="none" stroke="#27272A" strokeWidth="1.5" />
          <polygon
            points="200,55 310,85 200,115 90,85"
            fill={`url(#${capBoardGradientId})`}
            stroke="#27272A"
            strokeWidth="1.5"
          />

          <circle cx="200" cy="85" r="6" fill="#EF4444" />
          <path d="M 200 85 Q 265 92 280 120" fill="none" stroke="#EF4444" strokeWidth="3" strokeLinecap="round" />
          <path className="tassel-sway" d="M 280 120 L 275 145 C 275 150, 285 150, 285 145 Z" fill="#B91C1C" />
        </g>
      </svg>
    </button>
  )
}
