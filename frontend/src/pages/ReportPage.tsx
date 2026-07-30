import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Scoreboard from '../components/Scoreboard'
import PostMortemComparison from '../components/PostMortemComparison'
import Spinner from '../components/common/Spinner'
import { useSimulationStore } from '../hooks/useSimulation'

async function completeIncident(incidentId: string) {
  const res = await fetch(`http://localhost:8000/api/incidents/${incidentId}/complete`, {
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

  useEffect(() => {
    const fetchReport = async () => {
      if (!incident) {
        setLoading(false)
        return
      }

      try {
        const result = await completeIncident(incident.incidentId)
        setReport(result)
      } catch (error) {
        console.error('Failed to fetch report:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchReport()
  }, [incident])

  const handleNextSimulation = () => {
    startSimulation()
    navigate('/simulation')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary text-text-primary p-8 flex items-center justify-center">
        <Spinner label="Generating report..." />
      </div>
    )
  }

  if (!report) {
    return (
      <div className="page min-h-screen bg-bg-primary text-text-primary p-6 max-w-4xl mx-auto space-y-6">
        <div className="border border-border-danger rounded p-4 bg-border-danger/10">
          <p className="text-sm text-text-primary">Failed to load report. Please try again.</p>
        </div>
      </div>
    )
  }

  const mockSteps = [
    { step: 1, ideal: 'Check Email Logs', yours: 'Check Email Logs', status: 'correct' as const },
    { step: 2, ideal: 'Check Auth Logs', yours: 'Check File Access', status: 'wrong' as const },
    { step: 3, ideal: 'Check Endpoint Logs', yours: 'Check Auth Logs', status: 'wrong' as const },
    { step: 4, ideal: 'Reset Password + MFA', yours: 'Reset Password + MFA', status: 'correct' as const },
    { step: 5, ideal: 'Isolate Device', yours: '(Not Done)', status: 'missing' as const },
  ]

  return (
    <div className="page min-h-screen bg-bg-primary text-text-primary p-6 max-w-4xl mx-auto space-y-6">
      <Scoreboard
        finalScore={report.final_score}
        breakdown={[
          { label: 'Detection', value: report.detection },
          { label: 'Decision', value: report.decision },
          { label: 'Response', value: report.response },
        ]}
      />

      <PostMortemComparison steps={mockSteps} />

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
