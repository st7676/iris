import { useEffect, useState } from 'react'
import { IconClock } from './icons'

interface TimerProps {
  startedAt: string
}

// The Design System's own philosophy calls for "making critical decisions
// under time pressure" (escape-room vibe), but no element on screen actually
// conveyed elapsed time. This ticks up from when the incident was created,
// styled like the rest of the glowing/monospace terminal UI.
export default function Timer({ startedAt }: TimerProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  useEffect(() => {
    const startedAtMs = new Date(startedAt).getTime()

    const tick = () => {
      const seconds = Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000))
      setElapsedSeconds(seconds)
    }

    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [startedAt])

  const minutes = Math.floor(elapsedSeconds / 60)
  const seconds = elapsedSeconds % 60
  const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  // Past 5 minutes on this scenario, nudge the color toward urgency.
  const isUrgent = elapsedSeconds >= 300
  const colorClass = isUrgent
    ? 'text-accent-danger border-accent-danger shadow-[0_0_10px_rgb(var(--glow-danger)/0.4)] animate-pulse'
    : 'text-accent-info border-accent-info shadow-[0_0_8px_rgb(var(--glow-info)/0.3)]'

  return (
    <div
      className={`flex items-center gap-1.5 font-mono text-xs uppercase tracking-wide border px-2 py-1 rounded ${colorClass}`}
      title="Time elapsed since incident was reported"
    >
      <IconClock className="shrink-0" />
      {display}
    </div>
  )
}
