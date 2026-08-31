import { useEffect, useState } from 'react'
import Timer from './common/Timer'

interface SOCHeaderProps {
  incidentId: string
  severity: 'low' | 'medium' | 'high'
  startedAt: string
  // Bumped by SimulationPage whenever severity ranks up (see its
  // severityRef effect) -- a plain prop change wouldn't be enough to
  // replay a CSS animation on a *repeat* escalation (e.g. medium -> high
  // right after low -> medium), since severity itself would already be
  // "high" both times the flash should fire.
  severityFlashKey?: number
}

const severityColors = {
  low: 'text-accent-success border-accent-success',
  medium: 'text-accent-warning border-accent-warning',
  high: 'text-accent-danger border-accent-danger',
}

export default function SOCHeader({ incidentId, severity, startedAt, severityFlashKey }: SOCHeaderProps) {
  const [flashing, setFlashing] = useState(false)

  useEffect(() => {
    if (!severityFlashKey) return
    setFlashing(true)
    const timer = setTimeout(() => setFlashing(false), 550)
    return () => clearTimeout(timer)
  }, [severityFlashKey])

  return (
    <header className="flex items-center justify-between border-b border-border-default px-4 py-3">
      <div className="text-accent-success font-bold tracking-wide">
        IRIS
      </div>
      <div className="text-sm text-text-secondary">
        Incident ID: <span className="text-text-primary">{incidentId}</span>
      </div>
      <div className="flex items-center gap-2">
        <Timer startedAt={startedAt} />
        <div
          className={`text-xs uppercase border px-2 py-1 rounded ${severityColors[severity]} ${flashing ? 'severity-escalate' : ''}`}
        >
          {severity}
        </div>
      </div>
    </header>
  )
}
