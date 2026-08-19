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
        className="absolute top-4 right-4 text-xs text-text-secondary border border-border-default px-3 py-2 rounded hover:border-accent-primary hover:text-accent-primary transition-all"
      >
        Logout
      </button>

      <div className="max-w-4xl mx-auto flex flex-col items-center py-16 text-center space-y-8">
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-widest text-accent-primary">
            ▸ Active Incident
          </p>
          <h1 className="font-display text-5xl sm:text-6xl font-bold tracking-widest">
            IRIS
          </h1>
          <p className="text-lg text-text-secondary leading-relaxed max-w-xl mx-auto">
            A live breach is unfolding. You're the analyst on shift tonight —
            <span className="text-accent-danger"> every decision changes what happens next.</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <MetaBadge icon="⏱" label="~15 min" />
          <MetaBadge icon="🤖" label="AI-Powered" />
          <MetaBadge icon="🎯" label="SOC Training" />
        </div>

        <div className="w-full max-w-2xl space-y-4">
          <p className="text-xs uppercase tracking-widest text-text-muted">
            Select an Incident
          </p>
          <div className="grid w-full gap-4 sm:grid-cols-2">
            {Object.values(SCENARIOS).map((scenario) => (
              <button
                key={scenario.id}
                onClick={() => goToBriefing(scenario.id)}
                className="bg-bg-secondary border border-border-default rounded-lg p-5 text-left hover:border-accent-primary hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(0,0,0,0.4)] transition-all"
              >
                <div className="text-accent-primary text-xs uppercase tracking-widest mb-2">
                  Case File
                </div>
                <p className="font-display text-lg font-semibold text-text-primary">
                  {scenario.title}
                </p>
                <p className="mt-2 text-xs text-text-muted leading-relaxed">{scenario.tagline}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="w-full max-w-2xl flex gap-3 pt-4">
          <button
            onClick={() => navigate('/history')}
            className="flex-1 border border-border-default text-text-secondary py-2 px-4 rounded uppercase tracking-wide text-xs hover:border-accent-primary hover:text-accent-primary transition-all"
          >
            My History
          </button>
          <button
            onClick={() => navigate('/instructor-dashboard')}
            className="flex-1 border border-border-default text-text-secondary py-2 px-4 rounded uppercase tracking-wide text-xs hover:border-accent-primary hover:text-accent-primary transition-all"
          >
            Instructor Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
