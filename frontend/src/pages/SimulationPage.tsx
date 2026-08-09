import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SOCHeader from '../components/SOCHeader'
import EventTimeline from '../components/EventTimeline'
import LogViewer from '../components/LogViewer'
import EvidenceCard from '../components/EvidenceCard'
import ActionButton from '../components/ActionButton'
import Toast from '../components/common/Toast'
import Spinner from '../components/common/Spinner'
import { useSimulationStore } from '../hooks/useSimulation'
import { useWebSocket } from '../hooks/useWebSocket'
import { API_BASE } from '../lib/constants'

const mockLogs = [
  { time: '10:30', source: 'auth', type: 'FAILED', details: '5x Failed Login (passwd)' },
  { time: '10:31', source: 'mail', type: 'EMAIL', details: 'Phishing: Re-enter pwd' },
  { time: '10:35', source: 'auth', type: 'LOGIN', details: 'Success from new device' },
  { time: '10:36', source: 'file', type: 'ACCESS', details: '/shared/secrets.xlsx' },
]

export default function SimulationPage() {
  const navigate = useNavigate()
  const { incident, timeline, evidence, startSimulation, investigateEvidence, decide, completeSimulation } =
    useSimulationStore()
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!incident) {
      startSimulation('silent_login_v1').catch((err) => {
        setToastMessage(`Failed to start simulation: ${err instanceof Error ? err.message : 'Unknown error'}`)
      })
    }
  }, [incident, startSimulation])

  useWebSocket(incident?.incidentId || '')

  const handleInvestigate = async (label: string) => {
    try {
      setLoading(true)
      await investigateEvidence(label)
      setToastMessage(`${label}: investigation complete`)
      setTimeout(() => setToastMessage(null), 3000)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Investigation failed'
      setToastMessage(`Failed: ${errorMsg}`)
      setTimeout(() => setToastMessage(null), 4000)
    } finally {
      setLoading(false)
    }
  }

  const handleDecide = async (label: string) => {
    try {
      setLoading(true)
      await decide(label)
      setToastMessage(`${label}: action taken`)
      setTimeout(() => setToastMessage(null), 3000)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Decision failed'
      setToastMessage(`Failed: ${errorMsg}`)
      setTimeout(() => setToastMessage(null), 4000)
    } finally {
      setLoading(false)
    }
  }

  const handleComplete = async () => {
    completeSimulation()
    navigate('/report')
  }

  const handleGetHint = async () => {
    if (!incident) return
    try {
      const res = await fetch(`${API_BASE}/incidents/${incident.incidentId}/hint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_question: 'איזו פעולה כדאי לי לעשות הבא?' }),
      })
      if (!res.ok) throw new Error('Failed to get hint')
      const data = await res.json()
      setToastMessage(`💡 AI Mentor: ${data.hint}`)
      setTimeout(() => setToastMessage(null), 5000)
    } catch (error) {
      console.error('Failed to get hint:', error)
      setToastMessage('לא הצלחתי לקבל רמז - בדוק שהחיבור לשרת פועל')
      setTimeout(() => setToastMessage(null), 3000)
    }
  }

  if (!incident) {
    return (
      <div className="min-h-screen bg-bg-primary text-text-primary p-8 flex items-center justify-center">
        <Spinner label="Loading incident..." />
      </div>
    )
  }

  return (
    <div className="page min-h-screen bg-bg-primary text-text-primary">
      <SOCHeader incidentId={incident.incidentId} severity={incident.severity} startedAt={incident.startedAt} />

      <div
        className="hud-frame mx-4 mt-4 border-2 border-accent-danger bg-accent-danger/10 rounded p-5 animate-pulse"
        style={{ ['--hud-color' as string]: 'var(--color-accent-danger)', animationDuration: '2.5s' }}
      >
        <h2 className="text-xs uppercase tracking-[0.3em] text-accent-danger mb-1">
          ⚠ Active Alert
        </h2>
        <p className="briefing-glow text-xl sm:text-2xl font-bold text-text-primary">
          {incident.alertMessage}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4">
        <div className="md:col-span-2 space-y-4">
          <div className="border border-border-default rounded p-4">
            <h2 className="text-sm uppercase text-text-secondary mb-2">Event Timeline</h2>
            <EventTimeline steps={timeline} />
          </div>

          <div className="hud-frame border border-border-default rounded p-4">
            <h2 className="text-sm uppercase text-text-secondary mb-2">Evidence</h2>
            <div className="space-y-2">
              {evidence.length === 0 && (
                <p className="text-xs text-text-secondary">No evidence revealed yet. Investigate to find clues.</p>
              )}
              {evidence.map((item) => (
                <EvidenceCard
                  key={item.id}
                  icon={item.icon}
                  title={item.title}
                  description={item.description}
                  revealedAtStep={item.revealedAtStep}
                  timestamp={item.timestamp}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="md:col-span-3 space-y-4">
          <div className="border border-border-default rounded p-4">
            <h2 className="text-sm uppercase text-text-secondary mb-2">Logs</h2>
            <LogViewer logs={mockLogs} />
          </div>

          <div className="border border-border-default rounded p-4">
            <h2 className="text-sm uppercase text-text-secondary mb-2">Actions</h2>
            <div className="flex flex-wrap gap-2">
              <ActionButton label="Check Email Logs" onClick={() => handleInvestigate('Check Email Logs')} disabled={loading} />
              <ActionButton label="Check Auth Logs" onClick={() => handleInvestigate('Check Auth Logs')} disabled={loading} />
              <ActionButton label="Reset Password + MFA" onClick={() => handleDecide('Reset Password + MFA')} disabled={loading} />
              <ActionButton label="Isolate Device" variant="danger" onClick={() => handleDecide('Isolate Device')} disabled={loading} />
              <ActionButton label="💡 Get Hint" onClick={handleGetHint} variant="secondary" disabled={loading} />
            </div>
          </div>

          <div className="border border-border-default rounded p-4 text-right">
            <ActionButton label="Complete Simulation" onClick={handleComplete} />
          </div>
        </div>
      </div>

      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}
    </div>
  )
}
