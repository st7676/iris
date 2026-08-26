import type { EvidenceDetails } from '../../lib/scenarios'

interface PhotoLogViewProps {
  photoSrc: string
  details: Extract<EvidenceDetails, { kind: 'log' }>
  onClose: () => void
}

// For evidence that has a generated photoreal close-up: the AI-generated
// image always insists on rendering its own fully-baked dashboard numbers
// (it won't leave a blank pane to overlay real text into), so instead of
// fighting that, this shows the photo as-is and pins a small paper tag --
// same look as the corkboard's pinned-note evidence cards -- with the
// scenario's actual data (real IP, real timestamps) on top, like an
// analyst circled the screen and clipped a note to it.
export default function PhotoLogView({ photoSrc, details, onClose }: PhotoLogViewProps) {
  return (
    <div className="relative w-full">
      <img
        src={photoSrc}
        alt=""
        className="w-full rounded-lg shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
        draggable={false}
      />

      <button
        onClick={onClose}
        className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-text-primary backdrop-blur-sm hover:bg-black/80 transition-colors"
        aria-label="Close"
      >
        ✕
      </button>

      <div className="pinned-note absolute -bottom-4 left-4 w-56 p-3 text-xs sm:left-8">
        <p className="mb-1 font-display text-[11px] uppercase tracking-wide text-paper-danger">{details.source}</p>
        {details.meta?.map((m) => (
          <p key={m.label} className="leading-snug">
            <span className="text-paper-text/60">{m.label}:</span> <span className="font-bold">{m.value}</span>
          </p>
        ))}
        <p className="mt-1.5 border-t border-black/15 pt-1.5 leading-snug">{details.rows[details.rows.length - 1]?.detail}</p>
      </div>
    </div>
  )
}
