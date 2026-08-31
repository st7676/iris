import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
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

export default function Scoreboard({ finalScore, breakdown, outcome, resolved }: ScoreboardProps) {
  const { t } = useTranslation()
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 10)
    return () => clearTimeout(timer)
  }, [])

  const outcomeCopy = outcome
    ? { label: t(`scoreboard.outcome.${outcome}.label`), detail: t(`scoreboard.outcome.${outcome}.detail`) }
    : null

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
            {t('scoreboard.simulationComplete')}
          </h1>
          <ScoreMeter value={finalScore} label={t('scoreboard.finalScore')} />
        </div>
      </ScreenBezel>

      <ScreenBezel glow="info">
        <div className="p-4 space-y-3">
          <h2 className="text-sm uppercase text-text-secondary">{t('scoreboard.performanceBreakdown')}</h2>
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
