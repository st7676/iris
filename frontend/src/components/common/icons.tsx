// Minimal line-icon set, standing in for the raw emoji (⏱🤖🎯✓✗⛔✕💡👤⚠)
// that used to dot the UI. Emoji render as full-color pictograms with a
// font-dependent style the OS controls -- they clash with the illustrated,
// monochrome-console look the rest of the app (ScreenBezel, DeskScene,
// JetBrains Mono everywhere) is going for. These are plain stroke-based
// SVGs that inherit `currentColor`, so they pick up whatever text color
// (and text-glow-*) the call site already sets.
//
// Sized via the `size` prop (defaults to 14, matching the app's small
// uppercase-label text scale) rather than Tailwind width/height classes,
// since these are almost always inline with text.

interface IconProps {
  size?: number
  className?: string
}

export function IconClock({ size = 14, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M12 7v5l3.5 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function IconBot({ size = 14, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect x="4" y="8" width="16" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M12 8V4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="3" r="1.4" fill="currentColor" />
      <circle cx="8.5" cy="13.5" r="1.4" fill="currentColor" />
      <circle cx="15.5" cy="13.5" r="1.4" fill="currentColor" />
      <path d="M2 12h2M20 12h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function IconTarget({ size = 14, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" />
    </svg>
  )
}

export function IconCheck({ size = 14, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M4 12.5l5 5L20 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function IconX({ size = 14, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M5 5l14 14M19 5L5 19" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  )
}

export function IconBlock({ size = 14, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function IconAlert({ size = 14, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M12 3l10 18H2L12 3z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M12 10v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="17.3" r="1.1" fill="currentColor" />
    </svg>
  )
}

export function IconBulb({ size = 14, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M9 18h6M10 21h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M12 3a6 6 0 00-3.5 10.9c.6.45 1 1.2 1 2.1h5c0-.9.4-1.65 1-2.1A6 6 0 0012 3z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function IconVolume({ size = 14, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M4 9v6h4l5 4V5L8 9H4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M16.5 8.5a5 5 0 010 7M19 6a8.5 8.5 0 010 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function IconVolumeMute({ size = 14, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M4 9v6h4l5 4V5L8 9H4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function IconUser({ size = 14, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
      <path d="M4 20c0-4 3.5-6 8-6s8 2 8 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
