import AppWindowChrome from './AppWindowChrome'
import { IconAlert } from '../common/icons'
import type { EvidenceDetails } from '../../lib/scenarios'

interface EmailViewProps {
  details: Extract<EvidenceDetails, { kind: 'email' }>
  onClose: () => void
}

// Reads like a real webmail message view -- header block of
// From/To/Subject/Date, then the body, with the phishing link and the
// spam-filter note called out the way an actual mail client would flag
// them, rather than plain description text in a generic card.
export default function EmailView({ details, onClose }: EmailViewProps) {
  return (
    <AppWindowChrome title="mail.secureflow-tech.io" onClose={onClose}>
      <div className="bg-paper p-5 text-paper-text">
        <div className="mb-3 space-y-1 border-b border-black/15 pb-3 text-sm">
          <div className="flex gap-2">
            <span className="w-16 shrink-0 text-paper-text/60">From</span>
            <span>
              {details.fromName} <span className="text-paper-text/60">&lt;{details.from}&gt;</span>
            </span>
          </div>
          <div className="flex gap-2">
            <span className="w-16 shrink-0 text-paper-text/60">To</span>
            <span>{details.to}</span>
          </div>
          <div className="flex gap-2">
            <span className="w-16 shrink-0 text-paper-text/60">Date</span>
            <span>{details.sentAt}</span>
          </div>
          <div className="flex gap-2 font-bold">
            <span className="w-16 shrink-0 font-normal text-paper-text/60">Subject</span>
            <span>{details.subject}</span>
          </div>
        </div>

        <p className="mb-4 whitespace-pre-line text-sm leading-relaxed">{details.body}</p>

        <a
          className="mb-4 inline-block cursor-not-allowed break-all rounded border border-paper-danger/40 bg-paper-danger/10 px-3 py-2 text-xs text-paper-danger underline decoration-dotted"
          title="Do not click -- shown for investigation only"
        >
          {details.suspiciousLink}
        </a>

        <div className="flex items-start gap-2 rounded border border-paper-danger/40 bg-paper-danger/10 p-2 text-xs text-paper-danger">
          <IconAlert className="mt-0.5 shrink-0" />
          <span>{details.flagNote}</span>
        </div>
      </div>
    </AppWindowChrome>
  )
}
