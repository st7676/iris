import type { ReactNode } from 'react'
import ScreenBezel from '../common/ScreenBezel'

interface AppWindowChromeProps {
  title: string
  onClose: () => void
  children: ReactNode
}

// Shared "screen app" frame for the email and log views -- both are things
// the analyst is reading on a monitor, so they get a dark OS-window chrome
// (traffic-light dots + a title bar) inside the shared device bezel,
// instead of the paper/cork look used for physical documents (RecordView)
// or the system dialog (SystemActionView).
export default function AppWindowChrome({ title, onClose, children }: AppWindowChromeProps) {
  return (
    <ScreenBezel className="w-full" glow="info">
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
      <div className="max-h-[70vh] overflow-y-auto bg-bg-secondary">{children}</div>
    </ScreenBezel>
  )
}
