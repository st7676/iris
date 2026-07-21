import { useNavigate } from 'react-router-dom'

export default function HomePage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary">
      <div className="w-full max-w-md border border-border-default rounded-md p-8 text-center space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-widest text-accent-success">
            IRIS
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            AI-Powered Cyber Training
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => navigate('/simulation')}
            className="w-full border border-accent-success text-accent-success py-2 px-4 uppercase tracking-wide text-sm hover:bg-accent-success/10 hover:shadow-[0_0_10px_rgba(0,255,65,0.3)] transition-all"
          >
            Start New Simulation
          </button>
          <button className="w-full border border-border-default text-text-secondary py-2 px-4 uppercase tracking-wide text-sm hover:border-border-highlight transition-all">
            My History
          </button>
        </div>

        <div className="border-t border-border-default pt-4 text-left">
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
    </div>
  )
}
