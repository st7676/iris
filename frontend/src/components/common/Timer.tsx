import { useEffect, useRef, useState } from 'react'
import { IconClock } from './icons'
import { playAlert, playError } from '../../lib/sound'

interface TimerProps {
  startedAt: string
}

const URGENT_AT_SECONDS = 300 // 5 min
const CRITICAL_AT_SECONDS = 480 // 8 min
// Must match backend's BREACH_DEADLINE_SECONDS (branching_logic.py) -- past
// this, the attacker has finished regardless of what gets investigated
// next, so the timer stops being a pressure cue and starts reporting a
// fact that already happened.
const DEADLINE_AT_SECONDS = 600 // 10 min

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

  const isPastDeadline = elapsedSeconds >= DEADLINE_AT_SECONDS
  const isCritical = elapsedSeconds >= CRITICAL_AT_SECONDS
  const isUrgent = elapsedSeconds >= URGENT_AT_SECONDS

  useEffect(() => {
    const tier = isPastDeadline ? 3 : isCritical ? 2 : isUrgent ? 1 : 0
    if (tier > announcedTierRef.current) {
      // The deadline crossing is a harder, more final tone than the
      // pressure-building alert used for the urgent/critical tiers --
      // matches the danger tone used elsewhere for failures, not warnings.
      tier === 3 ? playError() : playAlert()
    }
    announcedTierRef.current = tier
  }, [isPastDeadline, isCritical, isUrgent])

  const minutes = Math.floor(elapsedSeconds / 60)
  const seconds = elapsedSeconds % 60
  const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  const colorClass = isPastDeadline
    ? 'text-bg-primary bg-accent-danger border-accent-danger timer-critical'
    : isCritical
      ? 'text-accent-danger border-accent-danger timer-critical'
      : isUrgent
        ? 'text-accent-danger border-accent-danger shadow-[0_0_10px_rgb(var(--glow-danger)/0.4)] animate-pulse'
        : 'text-accent-info border-accent-info shadow-[0_0_8px_rgb(var(--glow-info)/0.3)]'

  return (
    <div
      className={`flex items-center gap-1.5 font-mono text-xs uppercase tracking-wide border px-2 py-1 rounded ${colorClass}`}
      title={
        isPastDeadline
          ? 'Breach deadline passed -- the attacker has completed their objective'
          : 'Time elapsed since incident was reported'
      }
    >
      <IconClock className="shrink-0" />
      {isPastDeadline ? 'BREACH' : display}
    </div>
  )
}
