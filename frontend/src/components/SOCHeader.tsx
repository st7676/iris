interface SOCHeaderProps {
  incidentId: string
  severity: 'low' | 'medium' | 'high'
}

const severityColors = {
  low: 'text-accent-success border-accent-success',
  medium: 'text-accent-warning border-accent-warning',
  high: 'text-accent-danger border-accent-danger',
}

export default function SOCHeader({ incidentId, severity }: SOCHeaderProps) {
  return (
    <header className="flex items-center justify-between border-b border-border-default px-4 py-3">
      <div className="text-accent-success font-bold tracking-wide">
        IRIS
      </div>
      <div className="text-sm text-text-secondary">
        Incident ID: <span className="text-text-primary">{incidentId}</span>
      </div>
      <div className={`text-xs uppercase border px-2 py-1 rounded ${severityColors[severity]}`}>
        {severity}
      </div>
    </header>
  )
}
