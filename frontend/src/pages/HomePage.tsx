import { useNavigate } from 'react-router-dom'
import MetaBadge from '../components/common/MetaBadge'

export default function HomePage() {
  const navigate = useNavigate()

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

      <div className="mt-10 w-full max-w-sm space-y-3">
        <button
          onClick={() => navigate('/simulation')}
          className="w-full border-2 border-accent-success bg-accent-success/10 text-accent-success py-4 px-6 uppercase tracking-widest text-base font-bold hover:bg-accent-success/20 hover:shadow-[0_0_30px_rgba(0,255,65,0.5)] transition-all"
        >
          ▶ Start New Simulation
        </button>
        <button
          onClick={() => navigate('/history')}
          className="w-full border border-border-default text-text-secondary py-2 px-4 uppercase tracking-wide text-sm hover:border-border-highlight transition-all"
        >
          My History
        </button>
      </div>

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
