interface TimelineStep {
  label: string
  status: 'done' | 'current' | 'pending'
}

interface EventTimelineProps {
  steps: TimelineStep[]
}

const statusColor = {
  done: 'bg-accent-primary shadow-[0_0_8px_rgb(var(--glow-primary)/0.5)]',
  current: 'bg-accent-primary shadow-[0_0_12px_rgb(var(--glow-primary)/0.6)] animate-pulse',
  pending: 'bg-border-default',
}

const labelColor = {
  done: 'text-accent-primary',
  current: 'text-accent-primary',
  pending: 'text-text-muted',
}

export default function EventTimeline({ steps }: EventTimelineProps) {
  return (
    <div className="relative pl-6 space-y-4">
      <div className="absolute left-[7px] top-1 bottom-1 w-0.5 bg-border-highlight" />
      {steps.map((step, index) => (
        <div key={index} className="relative flex items-center gap-2">
          <div className={`absolute -left-6 w-3 h-3 rounded-full ${statusColor[step.status]}`} />
          <span className={`text-xs uppercase font-bold ${labelColor[step.status]}`}>
            {step.label}
          </span>
        </div>
      ))}
    </div>
  )
}
