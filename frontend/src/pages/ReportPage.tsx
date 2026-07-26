import { useNavigate } from 'react-router-dom'
import Scoreboard from '../components/Scoreboard'
import PostMortemComparison from '../components/PostMortemComparison'
import { useSimulationStore } from '../hooks/useSimulation'

const mockReport = {
  finalScore: 89,
  detection: 95,
  decision: 85,
  response: 90,
  steps: [
    { step: 1, ideal: 'Check Email Logs', yours: 'Check Email Logs', status: 'correct' },
    { step: 2, ideal: 'Check Auth Logs', yours: 'Check File Access', status: 'wrong' },
    { step: 3, ideal: 'Check Endpoint Logs', yours: 'Check Auth Logs', status: 'wrong' },
    { step: 4, ideal: 'Reset Password + MFA', yours: 'Reset Password + MFA', status: 'correct' },
    { step: 5, ideal: 'Isolate Device', yours: '(Not Done)', status: 'missing' },
  ] as const,
  feedback:
    'You correctly prioritized the email logs first, which is excellent incident triage. However, you skipped authentication logs before checking file access. Always establish HOW the attacker gained access BEFORE assessing WHAT was compromised.',
}

export default function ReportPage() {
  const navigate = useNavigate()
  const startSimulation = useSimulationStore((state) => state.startSimulation)

  const handleNextSimulation = () => {
    startSimulation()
    navigate('/simulation')
  }

  return (
    <div className="page min-h-screen bg-bg-primary text-text-primary p-6 max-w-4xl mx-auto space-y-6">
      <Scoreboard
        finalScore={mockReport.finalScore}
        breakdown={[
          { label: 'Detection', value: mockReport.detection },
          { label: 'Decision', value: mockReport.decision },
          { label: 'Response', value: mockReport.response },
        ]}
      />

      <PostMortemComparison steps={mockReport.steps} />

      <div className="border border-border-default rounded p-4">
        <h2 className="text-sm uppercase text-text-secondary mb-2">Feedback</h2>
        <p className="text-sm leading-relaxed">{mockReport.feedback}</p>
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
