import { useEffect, useState } from 'react'

interface ScoreMeterProps {
  value: number // 0-100
  label?: string
  bars?: number
}

// Signal-strength / equalizer style readout for the final score --
// deliberately not a circular ring: a row of HUD-style bars with varied
// heights (like a spectrum analyzer), filling left-to-right and lighting
// up as they cross the animated score threshold. Reads as instrument
// telemetry rather than a generic "percent complete" widget, matching
// the terminal/console aesthetic used across DeskScene and ScreenBezel.
export default function ScoreMeter({ value, label, bars = 20 }: ScoreMeterProps) {
  const [animated, setAnimated] = useState(0)
  const clamped = Math.max(0, Math.min(100, value))

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(clamped), 50)
    return () => clearTimeout(timer)
  }, [clamped])

  const colorClass = clamped >= 80 ? 'text-accent-success' : clamped >= 60 ? 'text-accent-info' : 'text-accent-danger'
  const barColorClass = clamped >= 80 ? 'bg-accent-success' : clamped >= 60 ? 'bg-accent-info' : 'bg-accent-danger'
  const glowColor = clamped >= 80 ? 'rgba(47,191,113,0.75)' : clamped >= 60 ? 'rgba(0,153,255,0.75)' : 'rgba(255,56,96,0.75)'

  const litBars = Math.round((animated / 100) * bars)

  return (
    <div className="flex flex-col items-center gap-3">
      <span className={`text-4xl font-bold font-display ${colorClass}`}>{Math.round(animated)}%</span>
      <div className="flex items-end gap-[3px] h-14">
        {Array.from({ length: bars }).map((_, i) => {
          // Gentle arch so the meter reads like a waveform, not a flat
          // row -- bars near the middle sit taller than the ends.
          const archHeight = 45 + 55 * Math.sin((Math.PI * (i + 0.5)) / bars)
          const lit = i < litBars
          return (
            <div
              key={i}
              className={`w-[7px] rounded-sm transition-colors duration-300 ${lit ? barColorClass : 'bg-white/10'}`}
              style={{
                height: `${archHeight}%`,
                transitionDelay: lit ? `${i * 25}ms` : '0ms',
                boxShadow: lit ? `0 0 6px ${glowColor}` : 'none',
              }}
            />
          )
        })}
      </div>
      {label && <span className="text-[10px] uppercase tracking-widest text-text-secondary">{label}</span>}
    </div>
  )
}
