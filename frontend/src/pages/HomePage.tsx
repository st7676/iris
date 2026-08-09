import { useNavigate, useSearchParams } from 'react-router-dom'
import { useSimulationStore } from '../hooks/useSimulation'

const SCENARIOS = [
  {
    id: 'silent_login_v1',
    name: 'Operation Silent Login',
    description: 'Detect phishing attack and unauthorized access',
    severity: 'Medium',
  },
  {
    id: 'insider_threat_v1',
    name: 'Insider Threat',
    description: 'Investigate suspicious data exfiltration patterns',
    severity: 'High',
  },
]

export default function HomePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { logout, startSimulation } = useSimulationStore()
  const selectedScenarioId = searchParams.get('scenario')

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleStartSimulation = async (scenarioId: string) => {
    try {
      await startSimulation(scenarioId)
      navigate('/simulation')
    } catch (err) {
      console.error('Failed to start simulation:', err)
    }
  }

  return (
    <div className="page min-h-screen bg-bg-primary p-4">
      <button
        onClick={handleLogout}
        className="absolute top-4 right-4 text-xs text-text-secondary border border-border-default px-3 py-1 hover:border-accent-error hover:text-accent-error transition-colors"
      >
        Logout
      </button>

      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-widest text-accent-success mb-2">
            IRIS
          </h1>
          <p className="text-sm text-text-secondary">
            AI-Powered Cyber Training
          </p>
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-semibold text-text-primary mb-4 uppercase tracking-wide">
            Select Scenario
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SCENARIOS.map((scenario) => (
              <button
                key={scenario.id}
                onClick={() => handleStartSimulation(scenario.id)}
                className={`border rounded-md p-6 text-left transition-all ${
                  selectedScenarioId === scenario.id
                    ? 'border-accent-success bg-accent-success/10 shadow-[0_0_10px_rgba(0,255,65,0.3)]'
                    : 'border-border-default hover:border-accent-success/50'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-text-primary">{scenario.name}</h3>
                  <span className={`text-xs px-2 py-1 rounded ${
                    scenario.severity === 'High'
                      ? 'bg-accent-error/20 text-accent-error'
                      : 'bg-accent-warning/20 text-accent-warning'
                  }`}>
                    {scenario.severity}
                  </span>
                </div>
                <p className="text-sm text-text-secondary">{scenario.description}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-4">
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
