import AppWindowChrome from './AppWindowChrome'
import type { EvidenceDetails } from '../../lib/scenarios'

interface LogViewProps {
  details: Extract<EvidenceDetails, { kind: 'log' }>
  onClose: () => void
}

const STATUS_COLOR: Record<string, string> = {
  FAILED: 'text-accent-danger',
  SUCCESS: 'text-accent-success',
  ACCESS: 'text-accent-info',
  CONNECT: 'text-accent-info',
  TRANSFER: 'text-accent-warning',
  DISCONNECT: 'text-text-secondary',
}

// Shared by every "*_logs" evidence type (auth, file access, USB) -- a
// dark monospace log stream, same shape a real SIEM/DLP console would
// show, rather than a paragraph description of what the logs contain.
export default function LogView({ details, onClose }: LogViewProps) {
  return (
    <AppWindowChrome title={details.source} onClose={onClose}>
      <div className="bg-[#0c0906] p-4">
        {details.meta && details.meta.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2 border-b border-border-default pb-3">
            {details.meta.map((m) => (
              <span
                key={m.label}
                className="rounded border border-border-default bg-bg-tertiary px-2 py-1 font-mono text-[11px] text-text-secondary"
              >
                <span className="text-text-muted">{m.label}:</span> {m.value}
              </span>
            ))}
          </div>
        )}
        <div className="space-y-1 font-mono text-xs">
          {details.rows.map((row, i) => (
            <div key={i} className="flex gap-3 text-text-secondary">
              <span className="text-text-muted">{row.time}</span>
              <span className={`w-20 shrink-0 font-bold ${STATUS_COLOR[row.status] ?? 'text-text-secondary'}`}>
                {row.status}
              </span>
              <span className="text-text-primary">{row.detail}</span>
            </div>
          ))}
        </div>
      </div>
    </AppWindowChrome>
  )
}
