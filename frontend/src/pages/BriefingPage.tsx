import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Spinner from '../components/common/Spinner'
import { useSimulationStore } from '../hooks/useSimulation'
import { DEFAULT_SCENARIO_ID, SCENARIOS } from '../lib/scenarios'

// The mission-briefing screen between "choose an incident" (HomePage)
// and the live simulation -- lays out the narrative and what the
// analyst needs to figure out, escape-room style, before the clock
// starts (see SOCHeader's Timer, which only appears once the
// simulation actually begins).
export default function BriefingPage() {
  const navigate = useNavigate()
  const { scenarioId = DEFAULT_SCENARIO_ID } = useParams<{ scenarioId: string }>()
  const startSimulation = useSimulationStore((state) => state.startSimulation)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const scenario = SCENARIOS[scenarioId] ?? SCENARIOS[DEFAULT_SCENARIO_ID]

  const handleBegin = async () => {
    setLoading(true)
    setError(null)
    try {
      await startSimulation(scenario.id)
      navigate('/simulation', { state: { scenarioId: scenario.id } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start simulation')
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary text-text-primary p-8 flex items-center justify-center">
        <Spinner label="Establishing secure connection..." />
      </div>
    )
  }

  return (
    <div className="page min-h-screen bg-bg-primary text-text-primary px-4 py-12">
      <div className="hud-frame mx-auto max-w-2xl border-2 border-accent-warning bg-accent-warning/5 rounded p-8">
        <p className="text-xs uppercase tracking-[0.4em] text-accent-warning mb-2">
          // Mission Briefing
        </p>
        <h1 className="briefing-glow text-3xl sm:text-4xl font-bold text-text-primary">
          {scenario.title}
        </h1>
        <p className="mt-1 text-xs uppercase tracking-wide text-text-secondary">
          Difficulty: {scenario.difficulty}
        </p>

        <p className="mt-6 text-base leading-relaxed text-text-primary">
          {scenario.narrative}
        </p>

        <div className="mt-8 border-t border-border-default pt-6">
          <h2 className="text-xs uppercase tracking-widest text-accent-success mb-3">
            Your Objectives
          </h2>
          <ul className="space-y-2">
            {scenario.objectives.map((objective, index) => (
              <li key={objective} className="flex items-start gap-3 text-sm text-text-primary">
                <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-sm border border-accent-success text-[10px] font-bold text-accent-success">
                  {index + 1}
                </span>
                {objective}
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-6 text-xs text-text-secondary italic">
          You choose what to investigate and in what order — your decisions determine how
          the incident evolves and how severe it gets. There's no single right path, but
          some choices cost you more time than others.
        </p>

        {error && (
          <div className="mt-4 border border-accent-danger bg-accent-danger/10 rounded p-3 text-sm text-accent-danger">
            {error}
          </div>
        )}

        <div className="mt-8 flex gap-3">
          <button
            onClick={() => navigate('/')}
            className="border border-border-default text-text-secondary py-3 px-4 uppercase tracking-wide text-sm hover:border-border-highlight transition-all"
          >
            ← Back
          </button>
          <button
            onClick={handleBegin}
            className="flex-1 border-2 border-accent-success bg-accent-success/10 text-accent-success py-3 px-6 uppercase tracking-widest text-sm font-bold hover:bg-accent-success/20 hover:shadow-[0_0_30px_rgba(217,164,65,0.5)] transition-all"
          >
            ▶ Begin Simulation
          </button>
        </div>
      </div>
    </div>
  )
}
