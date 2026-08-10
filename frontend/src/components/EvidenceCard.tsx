interface EvidenceCardProps {
  icon: string
  title: string
  description: string
  revealedAtStep: number
  timestamp: string
}

export default function EvidenceCard({ icon, title, description, revealedAtStep, timestamp }: EvidenceCardProps) {
  return (
    <div className="pinned-note p-4 pb-5 animate-[cardReveal_0.5s_ease-out] hover:scale-[1.02] hover:z-10 transition-transform">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <span className="font-display font-bold flex-1">{title}</span>
      </div>
      <p className="text-sm mb-2">{description}</p>
      <div className="text-xs opacity-70">
        Revealed at Step {revealedAtStep} | {timestamp}
      </div>
    </div>
  )
}
