// Inspired by https://escaperoom.autoright10.com/'s inline icon+label pills
// ("⏱ כשעה", "🖥 מכל מכשיר"). Small reusable stat badge.
interface MetaBadgeProps {
  icon: string
  label: string
}

export default function MetaBadge({ icon, label }: MetaBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded border border-border-default px-2 py-1 text-[11px] uppercase tracking-wide text-text-secondary">
      <span aria-hidden="true">{icon}</span>
      {label}
    </span>
  )
}
