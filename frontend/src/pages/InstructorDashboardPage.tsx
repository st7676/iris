import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Spinner from '../components/common/Spinner'
import ScreenBezel from '../components/common/ScreenBezel'

interface DashboardData {
  total_sessions: number
  average_score: number | null
  by_scenario: Record<
    string,
    {
      sessions: number
      average_score: number
    }
  >
}

export default function InstructorDashboardPage() {
  const navigate = useNavigate()
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/instructor/dashboard')
        if (!res.ok) throw new Error(`Failed: ${res.status}`)
        const data = await res.json()
        setDashboard(data)
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to load dashboard'
        console.error('Failed to fetch dashboard:', err)
        setError(errorMsg)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboard()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary text-text-primary p-8 flex items-center justify-center">
        <Spinner label="Loading dashboard..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="page min-h-screen bg-bg-primary text-text-primary p-6 max-w-4xl mx-auto">
        <button
          onClick={() => navigate('/')}
          className="mb-4 text-text-secondary hover:text-text-primary text-sm"
        >
          ← Back
        </button>
        <div className="border border-accent-danger rounded p-4 bg-accent-danger/10">
          <h2 className="text-sm font-semibold text-accent-danger mb-2">Failed to Load Dashboard</h2>
          <p className="text-sm text-text-primary">{error}</p>
        </div>
      </div>
    )
  }

  if (!dashboard) {
    return (
      <div className="page min-h-screen bg-bg-primary text-text-primary p-6 max-w-4xl mx-auto">
        <button
          onClick={() => navigate('/')}
          className="mb-4 text-text-secondary hover:text-text-primary text-sm"
        >
          ← Back
        </button>
        <div className="border border-border-default rounded p-4">
          <p className="text-sm text-text-secondary">No data available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page min-h-screen bg-bg-primary text-text-primary p-6">
      <div className="max-w-6xl mx-auto">
        <button
          onClick={() => navigate('/')}
          className="mb-6 text-text-secondary hover:text-text-primary text-sm"
        >
          ← Back
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-widest text-accent-success mb-2">
            Instructor Dashboard
          </h1>
          <p className="text-sm text-text-secondary">Track student progress and performance</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="border border-border-default rounded p-6">
            <div className="text-sm text-text-secondary uppercase mb-2">Total Sessions</div>
            <div className="text-4xl font-bold text-accent-success">{dashboard.total_sessions}</div>
          </div>

          <div className="border border-border-default rounded p-6">
            <div className="text-sm text-text-secondary uppercase mb-2">Average Score</div>
            <div className="text-4xl font-bold text-accent-success">
              {dashboard.average_score !== null ? `${dashboard.average_score.toFixed(1)}%` : '—'}
            </div>
          </div>
        </div>

        {/* Scenario Breakdown */}
        <div>
          <h2 className="text-lg font-semibold text-text-primary mb-4 uppercase tracking-wide">
            Performance by Scenario
          </h2>

          {Object.keys(dashboard.by_scenario).length === 0 ? (
            <p className="text-sm text-text-secondary">No session data yet</p>
          ) : (
            <ScreenBezel glow="info">
              <div className="overflow-x-auto p-2">
                <table className="w-full text-sm">
                  <thead className="border-b border-border-default">
                    <tr>
                      <th className="text-left py-2 px-3 text-text-secondary">Scenario</th>
                      <th className="text-right py-2 px-3 text-text-secondary">Sessions</th>
                      <th className="text-right py-2 px-3 text-text-secondary">Average Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(dashboard.by_scenario).map(([scenarioId, stats]) => (
                      <tr key={scenarioId} className="border-b border-border-default hover:bg-bg-secondary/50">
                        <td className="py-3 px-3 text-text-primary font-medium">
                          {scenarioId === 'silent_login_v1'
                            ? 'Operation Silent Login'
                            : scenarioId === 'insider_threat_v1'
                              ? 'Insider Threat'
                              : scenarioId}
                        </td>
                        <td className="py-3 px-3 text-right text-text-primary">{stats.sessions}</td>
                        <td className="py-3 px-3 text-right">
                          <span className={`font-semibold ${
                            stats.average_score >= 80
                              ? 'text-accent-success'
                              : stats.average_score >= 60
                                ? 'text-accent-warning'
                                : 'text-accent-danger'
                          }`}>
                            {stats.average_score.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ScreenBezel>
          )}
        </div>
      </div>
    </div>
  )
}
