import { useEffect, useState } from 'react'
import { IconVolume, IconVolumeMute } from './icons'
import { isSoundEnabled, setSoundEnabled, playClick } from '../../lib/sound'

// Inspired by https://escaperoom.autoright10.com/'s top ticker bar
// ("מבצע חירום" / "שידור חי" with pulsing live-broadcast dots). Global,
// rendered once above every page, to keep the "live incident" tension
// present even on non-simulation pages like Home/History.
function PulseDot({ colorClass }: { colorClass: string }) {
  return (
    <span className="relative flex h-2 w-2">
      <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${colorClass}`} />
      <span className={`relative inline-flex h-2 w-2 rounded-full ${colorClass}`} />
    </span>
  )
}

// Global mute toggle for the synthesized console SFX (see lib/sound.ts).
// Lives here rather than a dedicated corner widget because this bar is
// already rendered once, above every page.
function SoundToggle() {
  const [enabled, setEnabled] = useState(isSoundEnabled)

  useEffect(() => {
    const handler = (e: Event) => setEnabled((e as CustomEvent<boolean>).detail)
    window.addEventListener('iris-sound-changed', handler)
    return () => window.removeEventListener('iris-sound-changed', handler)
  }, [])

  const toggle = () => {
    const next = !enabled
    setSoundEnabled(next)
    if (next) playClick()
  }

  return (
    <button
      onClick={toggle}
      title={enabled ? 'Mute console sounds' : 'Unmute console sounds'}
      aria-label={enabled ? 'Mute console sounds' : 'Unmute console sounds'}
      className="text-text-secondary hover:text-text-primary transition-colors"
    >
      {enabled ? <IconVolume size={13} /> : <IconVolumeMute size={13} />}
    </button>
  )
}

export default function LiveStatusBar() {
  return (
    <div className="flex w-full items-center justify-between border-b border-border-default bg-bg-secondary px-4 py-1.5 text-[11px] uppercase tracking-wider">
      <div className="flex items-center gap-2 text-accent-danger">
        <PulseDot colorClass="bg-accent-danger" />
        Live Simulation
      </div>
      <div className="hidden text-text-secondary sm:block">// IRIS Cyber Defense Console</div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-accent-success">
          <PulseDot colorClass="bg-accent-success" />
          System Online
        </div>
        <SoundToggle />
      </div>
    </div>
  )
}
