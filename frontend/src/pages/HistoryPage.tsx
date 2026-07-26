import { useNavigate } from 'react-router-dom'

const mockHistory = [
  { id: 'SF-2026-0142', scenario: 'Operation Silent Login', date: '2026-01-15', score: 89, severity: 'medium' },
  { id: 'SF-2026-0098', scenario: 'Operation Silent Login', date: '2026-01-10', score: 72, severity: 'high' },
  { id: 'SF-2026-0051', scenario: 'Operation Silent Login', date: '2026-01-05', score: 95, severity: 'low' },
]

const severityColor = {
  low: 'text-accent-success',
  medium: 'text-accent-warning',
  high: 'text-accent-danger',
}

export default function HistoryPage() {
  const navigate = useNavigate()

  return (
    <div className="page min-h-screen bg-bg-primary text-text-primary p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg uppercase tracking-widest text-accent-success font-bold">
          Simulation History
        </h1>
        <button
          onClick={() => navigate('/')}
          className="text-xs uppercase text-text-secondary hover:text-text-primary transition-colors"
        >
          ← Back to Home
        </button>
      </div>

      <div className="border border-border-default rounded divide-y divide-border-default">
        {mockHistory.map((session) => (
          <div
            key={session.id}
            className="flex items-center justify-between p-4 hover:bg-bg-tertiary transition-colors cursor-pointer"
            onClick={() => navigate('/report')}
          >
            <div>
              <p className="text-sm font-bold">{session.scenario}</p>
              <p className="text-xs text-text-secondary">{session.id} | {session.date}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-accent-success">{session.score}%</p>
              <p className={`text-xs uppercase ${severityColor[session.severity as keyof typeof severityColor]}`}>
                {session.severity}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
