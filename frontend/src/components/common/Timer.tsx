import { useEffect, useRef, useState } from 'react'
import { IconClock } from './icons'
import { playAlert } from '../../lib/sound'

interface TimerProps {
  startedAt: string
}

const URGENT_AT_SECONDS = 300 // 5 min
const CRITICAL_AT_SECONDS = 480 // 8 min

// The Design System's own philosophy calls for "making critical decisions
// under time pressure" (escape-room vibe), but no element on screen actually
// conveyed elapsed time. This ticks up from when the incident was created,
// styled like the rest of the glowing/monospace terminal UI.
export default function Timer({ startedAt }: TimerProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  // Tracks which pressure tier we already announced, so the alert tone
  // plays once on the crossing (5 min, then again at 8 min) instead of
  // every second the timer happens to render at or above the threshold.
  const announcedTierRef = useRef(0)

  useEffect(() => {
    const startedAtMs = new Date(startedAt).getTime()
    announcedTierRef.current = 0

    const tick = () => {
      const seconds = Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000))
      setElapsedSeconds(seconds)
    }

    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [startedAt])

  const isCritical = elapsedSeconds >= CRITICAL_AT_SECONDS
  const isUrgent = elapsedSeconds >= URGENT_AT_SECONDS

  useEffect(() => {
    const tier = isCritical ? 2 : isUrgent ? 1 : 0
    if (tier > announcedTierRef.current) {
      playAlert()
    }
    announcedTierRef.current = tier
  }, [isCritical, isUrgent])

  const minutes = Math.floor(elapsedSeconds / 60)
  const seconds = elapsedSeconds % 60
  const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  const colorClass = isCritical
    ? 'text-accent-danger border-accent-danger timer-critical'
    : isUrgent
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
