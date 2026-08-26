import type { ReactNode } from 'react'

interface ScreenBezelProps {
  children: ReactNode
  className?: string
  // Which glow token (see --glow-* in globals.css) rings the bezel --
  // info (blue) for a neutral screen, success (green) for something
  // actively monitored/healthy, danger (red) for an alert state.
  glow?: 'info' | 'success' | 'danger'
}

const GLOW_VAR: Record<NonNullable<ScreenBezelProps['glow']>, string> = {
  info: '--glow-info',
  success: '--glow-success',
  danger: '--glow-danger',
}

// Shared "device chrome" for every digital-screen surface in the app --
// a thick near-black bezel, a rounded CRT-ish corner radius, a faint
// scanline/grain overlay (.crt-noise, see globals.css), and a soft
// glow shadow bleeding off the edge like the screen is actually lit.
// Extracted so this look lives in one place instead of being
// hand-rolled per screen (bezel width, scanline opacity, shadow
// color all drifting independently).
export default function ScreenBezel({ children, className, glow = 'info' }: ScreenBezelProps) {
  const glowVar = GLOW_VAR[glow]
  return (
    <div
      className={`relative overflow-hidden rounded-[14px] border-[6px] border-[#0a0b12] bg-bg-panel ${className ?? ''}`}
      style={{ boxShadow: `0 0 24px 2px rgb(var(${glowVar}) / 0.25), 0 20px 60px rgba(0,0,0,0.6)` }}
    >
      {children}
      <div className="crt-noise pointer-events-none absolute inset-0 opacity-60" aria-hidden />
    </div>
  )
}
