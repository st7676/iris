interface TimelineStep {
  label: string
  status: 'done' | 'current' | 'pending'
}

interface EventTimelineProps {
  steps: TimelineStep[]
}

const statusColor = {
  done: 'bg-accent-success shadow-[0_0_8px_rgba(217,164,65,0.7)]',
  current: 'bg-accent-info shadow-[0_0_8px_rgba(79,143,191,0.7)] animate-pulse',
  pending: 'bg-border-highlight',
}

const labelColor = {
  done: 'text-accent-success',
  current: 'text-accent-info',
  pending: 'text-text-secondary',
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
