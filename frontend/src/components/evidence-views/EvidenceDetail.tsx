import EmailView from './EmailView'
import LogView from './LogView'
import RecordView from './RecordView'
import SystemActionView from './SystemActionView'
import type { EvidenceDetails } from '../../lib/scenarios'

interface EvidenceItem {
  title: string
  details: EvidenceDetails
}

interface EvidenceDetailProps {
  item: EvidenceItem
  onClose: () => void
}

// Overlay + dispatcher: picks the dedicated view by evidence kind instead
// of every type sharing the generic Modal chrome. Each view owns its own
// window/paper/dialog chrome (and close button), so this only supplies the
// backdrop and click-outside-to-close.
export default function EvidenceDetail({ item, onClose }: EvidenceDetailProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="max-h-[85vh] w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        {item.details.kind === 'email' && <EmailView details={item.details} onClose={onClose} />}
        {item.details.kind === 'log' && <LogView details={item.details} onClose={onClose} />}
        {item.details.kind === 'record' && <RecordView details={item.details} onClose={onClose} />}
        {item.details.kind === 'system' && <SystemActionView title={item.title} details={item.details} onClose={onClose} />}
      </div>
    </div>
  )
}
