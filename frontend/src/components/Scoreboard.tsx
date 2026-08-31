import { useEffect, useState } from 'react'
import ScreenBezel from './common/ScreenBezel'
import ScoreMeter from './common/ScoreMeter'

interface ScoreboardProps {
  finalScore: number
  breakdown: { label: string; value: number }[]
}

export default function Scoreboard({ finalScore, breakdown }: ScoreboardProps) {
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 10)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="space-y-4">
      <ScreenBezel glow="success" className="hud-frame">
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
