import { IconUser, IconX } from '../common/icons'
import type { EvidenceDetails } from '../../lib/scenarios'

interface RecordViewProps {
  details: Extract<EvidenceDetails, { kind: 'record' }>
  onClose: () => void
}

// A printed personnel file rather than an on-screen app -- paper stock,
// a rotated confidential-style stamp (reusing the same .stamp look as
// the case-folder cards), and a corner photo placeholder like a real HR
// record or ID document would have.
export default function RecordView({ details, onClose }: RecordViewProps) {
  return (
    <div className="relative w-full rounded bg-paper p-6 text-paper-text shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
      <button
        onClick={onClose}
        className="absolute right-3 top-3 text-paper-text/60 hover:text-paper-text transition-colors"
        aria-label="Close"
      >
        <IconX />
      </button>

      <div className="mb-4 flex items-start justify-between gap-4 border-b-2 border-paper-text/20 pb-3">
        <div>
          <p className="font-display text-sm uppercase tracking-wide">SecureFlow Technologies</p>
          <p className="text-xs text-paper-text/60">Personnel Record</p>
        </div>
        <div className="flex h-16 w-14 shrink-0 items-center justify-center rounded border-2 border-paper-text/30 bg-black/10">
          <IconUser size={28} />
        </div>
      </div>

      <span className="stamp mb-4 inline-block text-paper-danger">{details.stamp}</span>

      <dl className="space-y-2 text-sm">
        {details.fields.map((f) => (
          <div key={f.label} className="flex gap-2 border-b border-black/10 py-1">
            <dt className="w-40 shrink-0 text-paper-text/60">{f.label}</dt>
            <dd className="font-bold">{f.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
