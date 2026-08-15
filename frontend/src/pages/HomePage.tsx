import { useNavigate } from 'react-router-dom'
import MetaBadge from '../components/common/MetaBadge'
import { useSimulationStore } from '../hooks/useSimulation'
import { SCENARIOS } from '../lib/scenarios'

export default function HomePage() {
  const navigate = useNavigate()
  const { logout } = useSimulationStore()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // Scenario choice goes to the briefing screen first, not straight into
  // the simulation -- startSimulation() is only called once the analyst
  // confirms they're ready there (see BriefingPage).
  const goToBriefing = (scenarioId: string) => {
    navigate(`/briefing/${scenarioId}`)
  }

  return (
    <div className="page min-h-screen bg-bg-primary p-4">
      <button
        onClick={handleLogout}
        className="absolute top-4 right-4 text-xs text-text-secondary border border-border-default px-3 py-1 hover:border-accent-danger hover:text-accent-danger transition-colors"
      >
        Logout
      </button>

      <div className="max-w-4xl mx-auto flex flex-col items-center py-12 text-center">
        <p className="text-xs uppercase tracking-[0.4em] text-accent-danger mb-4 animate-pulse">
          // Incoming Transmission
        </p>

        <h1 className="briefing-glow text-5xl sm:text-6xl font-bold tracking-widest text-accent-success">
          IRIS
        </h1>

        <p className="mt-4 max-w-xl text-lg text-text-primary leading-relaxed">
          A live breach is unfolding. You're the analyst on shift tonight —
          <span className="text-accent-danger"> every decision changes what happens next.</span>
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
              onClick={() => goToBriefing(scenario.id)}
              className="hud-frame border-2 border-accent-success bg-accent-success/5 p-5 text-left hover:bg-accent-success/15 hover:shadow-[0_0_30px_rgba(0,255,65,0.4)] transition-all"
            >
              <p className="text-base font-bold uppercase tracking-wide text-accent-success">
                ▶ {scenario.title}
              </p>
              <p className="mt-2 text-xs text-text-secondary leading-relaxed">{scenario.tagline}</p>
            </button>
          ))}
        </div>

        <div className="mt-4 flex w-full max-w-2xl gap-4">
          <button
            onClick={() => navigate('/history')}
            className="flex-1 border border-border-default text-text-secondary py-2 px-4 uppercase tracking-wide text-sm hover:border-border-highlight transition-all"
          >
            My History
          </button>
          <button
            onClick={() => navigate('/instructor-dashboard')}
            className="flex-1 border border-accent-warning text-accent-warning py-2 px-4 uppercase tracking-wide text-sm hover:bg-accent-warning/10 transition-all"
          >
            Instructor Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
