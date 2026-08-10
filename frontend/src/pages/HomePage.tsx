import { useNavigate } from 'react-router-dom'
import MetaBadge from '../components/common/MetaBadge'
import { SCENARIOS } from '../lib/scenarios'

export default function HomePage() {
  const navigate = useNavigate()

  const startScenario = (scenarioId: string) => {
    navigate('/simulation', { state: { scenarioId } })
  }

  return (
    <div className="page min-h-screen flex flex-col items-center justify-center bg-bg-primary px-4 py-16 text-center">
      <p className="text-xs uppercase tracking-[0.4em] text-accent-danger mb-4 animate-pulse">
        // Incoming Transmission
      </p>

      <h1 className="briefing-glow text-6xl sm:text-7xl font-bold tracking-widest text-accent-success">
        IRIS
      </h1>

      <p className="mt-4 max-w-xl text-lg sm:text-xl text-text-primary leading-relaxed">
        A live breach is unfolding. You're the analyst on shift tonight —
        <span className="text-accent-danger"> every decision changes what happens next.</span>
      </p>
      <p className="mt-2 text-sm text-text-secondary uppercase tracking-wide">
        AI-Powered SOC Incident Simulation
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <MetaBadge icon="⏱" label="~15 min" />
        <MetaBadge icon="🤖" label="AI-Powered" />
        <MetaBadge icon="🎯" label="SOC Training" />
      </div>

      <p className="mt-10 text-xs uppercase tracking-widest text-text-secondary">
        Choose Your Incident
      </p>
      <div className="mt-3 grid w-full max-w-2xl gap-4 sm:grid-cols-2">
        {Object.values(SCENARIOS).map((scenario) => (
          <button
            key={scenario.id}
            onClick={() => startScenario(scenario.id)}
            className="hud-frame border-2 border-accent-success bg-accent-success/5 p-5 text-left hover:bg-accent-success/15 hover:shadow-[0_0_30px_rgba(0,255,65,0.4)] transition-all"
          >
            <p className="text-base font-bold uppercase tracking-wide text-accent-success">
              ▶ {scenario.title}
            </p>
            <p className="mt-2 text-xs text-text-secondary leading-relaxed">{scenario.tagline}</p>
          </button>
        ))}
      </div>

      <button
        onClick={() => navigate('/history')}
        className="mt-4 w-full max-w-2xl border border-border-default text-text-secondary py-2 px-4 uppercase tracking-wide text-sm hover:border-border-highlight transition-all"
      >
        My History
      </button>

      <div className="hud-frame mt-10 w-full max-w-sm border border-border-default rounded p-4 text-left">
        <p className="text-xs text-text-secondary uppercase mb-1">
          Latest Simulation
        </p>
        <p className="text-sm text-text-primary">
          Operation Silent Login
        </p>
        <p className="text-xs text-text-secondary">
          Score: 89% | Severity: Medium
        </p>
      </div>
    </div>
  )
}
