interface EvidenceCardProps {
  icon: string
  title: string
  description: string
  revealedAtStep: number
  timestamp: string
}

export default function EvidenceCard({ icon, title, description, revealedAtStep, timestamp }: EvidenceCardProps) {
  return (
    <div className="bg-bg-secondary border border-border-default border-l-4 border-l-accent-warning rounded p-4 hover:border-border-highlight transition-all">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <span className="font-bold text-text-primary flex-1">{title}</span>
      </div>
      <p className="text-sm text-text-primary mb-2">{description}</p>
      <div className="text-xs text-text-secondary">
        Revealed at Step {revealedAtStep} | {timestamp}
      </div>
    </div>
  )
}
