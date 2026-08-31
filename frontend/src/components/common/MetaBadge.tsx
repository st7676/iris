import type { ReactNode } from 'react'

// Inspired by https://escaperoom.autoright10.com/'s inline icon+label pills
// ("⏱ כשעה", "🖥 מכל מכשיר"). Small reusable stat badge -- icon is a line-art
// SVG component (see components/common/icons.tsx), not a raw emoji, so it
// stays monochrome/console-styled instead of rendering as a full-color OS
// pictogram.
interface MetaBadgeProps {
  icon: ReactNode
  label: string
}

export default function MetaBadge({ icon, label }: MetaBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded border border-border-default px-2 py-1 text-[11px] uppercase tracking-wide text-text-secondary">
      <span aria-hidden="true" className="inline-flex">{icon}</span>
      {label}
    </span>
  )
}
