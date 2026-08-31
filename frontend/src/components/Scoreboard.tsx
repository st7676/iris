import { useEffect, useState } from 'react'
import ScreenBezel from './common/ScreenBezel'
import ScoreMeter from './common/ScoreMeter'
import { IconBlock, IconCheck } from './common/icons'

interface ScoreboardProps {
  finalScore: number
  breakdown: { label: string; value: number }[]
  // Narrative outcome from the API (see backend's complete_incident) --
  // optional so older/mocked report shapes without it still render the
  // score card exactly as before, just without the banner.
  outcome?: 'contained' | 'contained_with_damage' | 'breach_successful'
  resolved?: boolean
}

const OUTCOME_COPY: Record<NonNullable<ScoreboardProps['outcome']>, { label: string; detail: string }> = {
  contained: {
    label: 'Breach Contained',
    detail: 'You identified and stopped the attacker before real damage was done.',
  },
  contained_with_damage: {
    label: 'Breach Contained — Damage Done',
    detail: 'The attacker was stopped, but not before causing damage that a faster response could have prevented.',
  },
  breach_successful: {
    label: 'Breach Not Contained',
    detail: 'The attacker completed their objective. This incident was not resolved in time.',
  },
}

export default function Scoreboard({ finalScore, breakdown, outcome, resolved }: ScoreboardProps) {
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 10)
    return () => clearTimeout(timer)
  }, [])

  const outcomeCopy = outcome ? OUTCOME_COPY[outcome] : null

  return (
    <div className="space-y-4">
      {outcomeCopy && (
        <ScreenBezel glow={resolved ? 'success' : 'danger'}>
          <div
            className={`flex items-center gap-3 p-4 ${resolved ? 'text-accent-success' : 'text-accent-danger'}`}
          >
            {resolved ? <IconCheck size={22} /> : <IconBlock size={22} />}
            <div>
              <div className="text-sm font-bold uppercase tracking-widest">{outcomeCopy.label}</div>
              <div className="text-xs text-text-secondary mt-0.5">{outcomeCopy.detail}</div>
            </div>
          </div>
        </ScreenBezel>
      )}

      <ScreenBezel glow={resolved === false ? 'danger' : 'success'} className="hud-frame">
        <div className="flex flex-col items-center gap-3 p-6 text-center">
          <h1 className="text-lg uppercase tracking-widest text-text-secondary">
            Simulation Complete
          </h1>
          <ScoreMeter value={finalScore} label="Final Score" />
        </div>
      </ScreenBezel>

      <ScreenBezel glow="info">
        <div className="p-4 space-y-3">
          <h2 className="text-sm uppercase text-text-secondary">Performance Breakdown</h2>
          {breakdown.map((item) => (
            <div key={item.label}>
              <div className="flex justify-between text-xs mb-1">
                <span className="uppercase text-text-secondary">{item.label}</span>
                <span className="text-accent-success">{item.value}%</span>
              </div>
              <div className="h-2 bg-bg-tertiary rounded overflow-hidden">
                <div
                  className="h-full bg-accent-success transition-[width] duration-700 ease-out"
                  style={{ width: animated ? `${item.value}%` : '0%' }}
                />
              </div>
            </div>
          ))}
        </div>
      </ScreenBezel>
    </div>
  )
}
