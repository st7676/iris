import type { ReactNode } from 'react'

interface AppWindowChromeProps {
  title: string
  onClose: () => void
  children: ReactNode
}

// Shared "screen app" frame for the email and log views -- both are things
// the analyst is reading on a monitor, so they get a dark OS-window chrome
// (traffic-light dots + a title bar) instead of the paper/cork look used
// for physical documents (RecordView) or the system dialog (SystemActionView).
export default function AppWindowChrome({ title, onClose, children }: AppWindowChromeProps) {
  return (
    <div className="w-full overflow-hidden rounded-lg border border-border-highlight bg-bg-secondary shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
      <div className="flex items-center gap-2 border-b border-border-default bg-bg-tertiary px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-accent-danger/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-accent-warning/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-accent-success/70" />
        <span className="ml-2 flex-1 truncate text-center text-xs text-text-secondary">{title}</span>
        <button
          onClick={onClose}
          className="text-text-secondary hover:text-text-primary transition-colors"
          aria-label="Close"
        >
          ✕
        </button>
      </div>
      <div className="max-h-[70vh] overflow-y-auto">{children}</div>
    </div>
  )
}
