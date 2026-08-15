import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Scoreboard from '../components/Scoreboard'
import PostMortemComparison from '../components/PostMortemComparison'
import Spinner from '../components/common/Spinner'
import { useSimulationStore } from '../hooks/useSimulation'
import { API_BASE } from '../lib/constants'

async function completeIncident(incidentId: string) {
  const res = await fetch(`${API_BASE}/incidents/${incidentId}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) throw new Error(`Complete failed: ${res.status}`)
  return res.json()
}

export default function ReportPage() {
  const navigate = useNavigate()
  const startSimulation = useSimulationStore((state) => state.startSimulation)
  const incident = useSimulationStore((state) => state.incident)
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchReport = async () => {
    if (!incident) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await completeIncident(incident.incidentId)
      setReport(result)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to generate report'
      console.error('Failed to fetch report:', err)
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReport()
  }, [incident])

  const handleNextSimulation = () => {
    // Continue in the same scenario the analyst just completed, instead
    // of silently defaulting to silent_login_v1 regardless of what was
    // played (harmless when there was only one scenario, a real bug now
    // that there are two).
    startSimulation(incident?.scenarioId)
    navigate('/simulation')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary text-text-primary p-8 flex items-center justify-center">
        <Spinner label="Generating report..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="page min-h-screen bg-bg-primary text-text-primary p-6 max-w-4xl mx-auto space-y-6">
        <div className="border border-accent-error rounded p-4 bg-accent-error/10">
          <h2 className="text-sm font-semibold text-accent-error mb-2">Failed to Generate Report</h2>
          <p className="text-sm text-text-primary mb-4">{error}</p>
          <button
            onClick={fetchReport}
            disabled={loading}
            className="border border-accent-error text-accent-error px-4 py-2 text-xs uppercase tracking-wide hover:bg-accent-error/10 transition-all disabled:opacity-50"
          >
            {loading ? 'Retrying...' : 'Retry'}
          </button>
        </div>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="page min-h-screen bg-bg-primary text-text-primary p-6 max-w-4xl mx-auto space-y-6">
        <div className="border border-border-default rounded p-4">
          <p className="text-sm text-text-secondary">No report data available.</p>
        </div>
      </div>
    )
  }

  const idealChain: { step: number; action: string }[] = report.ideal_chain ?? []
  const yourChain: { step: number; action: string }[] = report.your_chain ?? []
  const stepCount = Math.max(idealChain.length, yourChain.length)
  const comparisonSteps = Array.from({ length: stepCount }, (_, i) => {
    const idealAction = idealChain[i]?.action
    const yourAction = yourChain[i]?.action
    const status: 'correct' | 'wrong' | 'missing' =
      yourAction && yourAction === idealAction ? 'correct' : yourAction ? 'wrong' : 'missing'
    return {
      step: i + 1,
      ideal: idealAction ?? '(none)',
      yours: yourAction ?? '(Not Done)',
      status,
    }
  })

  return (
    <div className="page min-h-screen bg-bg-primary text-text-primary p-6 max-w-4xl mx-auto space-y-6">
      <Scoreboard
        finalScore={report.score}
        breakdown={[
          { label: 'Detection', value: report.categories?.detection_score },
          { label: 'Decision', value: report.categories?.decision_score },
          { label: 'Response', value: report.categories?.response_score },
        ]}
      />

      <PostMortemComparison steps={comparisonSteps} />

      <div className="border border-border-default rounded p-4">
        <h2 className="text-sm uppercase text-text-secondary mb-2">Feedback</h2>
        <p className="text-sm leading-relaxed">{report.feedback}</p>
      </div>

      <div className="flex justify-center gap-3">
        <button
          onClick={handleNextSimulation}
          className="border border-accent-success text-accent-success px-4 py-2 text-xs uppercase tracking-wide hover:bg-accent-success/10 transition-all"
        >
          Next Simulation
        </button>
        <button
          onClick={() => navigate('/')}
          className="border border-border-default text-text-secondary px-4 py-2 text-xs uppercase tracking-wide hover:border-border-highlight transition-all"
        >
          Home
        </button>
      </div>
    </div>
  )
}
