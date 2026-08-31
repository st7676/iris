import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Spinner from '../components/common/Spinner'
import { useSimulationStore } from '../hooks/useSimulation'
import { DEFAULT_SCENARIO_ID, getScenario } from '../lib/scenarios'

// The mission-briefing screen between "choose an incident" (HomePage)
// and the live simulation -- lays out the narrative and what the
// analyst needs to figure out, escape-room style, before the clock
// starts (see SOCHeader's Timer, which only appears once the
// simulation actually begins).
export default function BriefingPage() {
  const navigate = useNavigate()
  const { scenarioId = DEFAULT_SCENARIO_ID } = useParams<{ scenarioId: string }>()
  const startSimulation = useSimulationStore((state) => state.startSimulation)
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const scenario = getScenario(scenarioId)

  const handleBegin = async () => {
    setLoading(true)
    setError(null)
    try {
      await startSimulation(scenario.id)
      navigate('/simulation', { state: { scenarioId: scenario.id } })
    } catch (err) {
      setError(err instanceof Error ? err.message : t('briefing.failedToStart'))
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary text-text-primary p-8 flex items-center justify-center">
        <Spinner label={t('briefing.establishingConnection')} />
      </div>
    )
  }

  return (
    <div className="page min-h-screen bg-bg-primary text-text-primary px-4 py-12">
      <div className="mx-auto max-w-2xl border border-border-default bg-bg-secondary rounded-lg p-8 space-y-6">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-widest text-accent-primary">
            {t('briefing.missionBriefing')}
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold">
            {scenario.title}
          </h1>
          <p className="text-xs uppercase tracking-wide text-text-muted">
            {t('briefing.difficulty', { difficulty: scenario.difficulty })}
          </p>
        </div>

        <p className="text-base leading-relaxed text-text-secondary">
          {scenario.narrative}
        </p>

        <div className="border-t border-border-default pt-6 space-y-4">
          <h2 className="text-xs uppercase tracking-widest text-accent-primary">
            {t('briefing.yourObjectives')}
          </h2>
          <ul className="space-y-3">
            {scenario.objectives.map((objective, index) => (
              <li key={objective} className="flex items-start gap-3 text-sm text-text-secondary">
                <span className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border border-accent-primary text-[10px] font-bold text-accent-primary">
                  {index + 1}
                </span>
                {objective}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-text-muted italic">
          {t('briefing.disclaimer')}
        </p>

        {error && (
          <div className="border border-accent-danger bg-accent-danger/10 rounded p-3 text-sm text-accent-danger">
            {error}
          </div>
        )}

        <div className="border-t border-border-default pt-6 flex gap-3">
          <button
            onClick={() => navigate('/')}
            className="border border-border-default text-text-secondary py-2 px-4 rounded uppercase tracking-wide text-xs hover:border-accent-primary hover:text-accent-primary transition-all"
          >
            {t('common.back')}
          </button>
          <button
            onClick={handleBegin}
            className="flex-1 bg-accent-primary text-bg-primary py-2 px-6 rounded uppercase tracking-widest text-sm font-bold hover:bg-accent-primary/90 transition-all"
          >
            {t('briefing.beginSimulation')}
          </button>
        </div>
      </div>
    </div>
  )
}
