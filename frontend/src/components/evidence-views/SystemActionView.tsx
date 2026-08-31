import { IconCheck, IconBlock, IconX } from '../common/icons'
import type { EvidenceDetails } from '../../lib/scenarios'

interface SystemActionViewProps {
  title: string
  details: Extract<EvidenceDetails, { kind: 'system' }>
  onClose: () => void
}

// Response actions (reset password, isolate device, revoke access) aren't
// evidence the analyst found -- they're a confirmation the system is
// giving back. Rendered as a HUD-framed dialog instead of a paper/log
// look, reusing the same corner-bracket + glow language as the floating
// Hint/Complete buttons on the desk scene.
export default function SystemActionView({ title, details, onClose }: SystemActionViewProps) {
  const color = details.status === 'success' ? 'success' : 'danger'
  return (
    <div
      className={`hud-frame relative w-full rounded border-2 bg-bg-secondary p-6 text-center shadow-[0_20px_60px_rgba(0,0,0,0.6)] ${
        color === 'success' ? 'border-accent-success' : 'border-accent-danger'
      }`}
      style={{ ['--hud-color' as string]: color === 'success' ? 'var(--color-accent-success)' : 'var(--color-accent-danger)' }}
    >
      <button
        onClick={onClose}
        className="absolute right-3 top-3 text-text-secondary hover:text-text-primary transition-colors"
        aria-label="Close"
      >
        <IconX />
      </button>

      <div
        className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full ${
          color === 'success' ? 'bg-accent-success/15 text-accent-success' : 'bg-accent-danger/15 text-accent-danger'
        }`}
      >
        {color === 'success' ? <IconCheck size={22} /> : <IconBlock size={22} />}
      </div>

      <p className={`font-display text-sm uppercase tracking-wide ${color === 'success' ? 'text-accent-success' : 'text-accent-danger'}`}>
        {title}
      </p>
      <p className="mt-2 text-sm text-text-primary">{details.summary}</p>

      {details.fields && details.fields.length > 0 && (
        <dl className="mt-4 space-y-1 border-t border-border-default pt-3 text-left text-xs">
          {details.fields.map((f) => (
            <div key={f.label} className="flex gap-2">
              <dt className="w-28 shrink-0 text-text-secondary">{f.label}</dt>
              <dd className="text-text-primary">{f.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  )
}
