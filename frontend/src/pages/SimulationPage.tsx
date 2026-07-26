import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SOCHeader from '../components/SOCHeader'
import EventTimeline from '../components/EventTimeline'
import LogViewer from '../components/LogViewer'
import EvidenceCard from '../components/EvidenceCard'
import ActionButton from '../components/ActionButton'
import Toast from '../components/common/Toast'
import { useSimulationStore } from '../hooks/useSimulation'

const mockLogs = [
  { time: '10:30', source: 'auth', type: 'FAILED', details: '5x Failed Login (passwd)' },
  { time: '10:31', source: 'mail', type: 'EMAIL', details: 'Phishing: Re-enter pwd' },
  { time: '10:35', source: 'auth', type: 'LOGIN', details: 'Success from new device' },
  { time: '10:36', source: 'file', type: 'ACCESS', details: '/shared/secrets.xlsx' },
]

export default function SimulationPage() {
  const navigate = useNavigate()
  const { incident, timeline, evidence, startSimulation, investigateEvidence } = useSimulationStore()
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!incident) {
      startSimulation()
    }
  }, [incident, startSimulation])

  const handleAction = (label: string) => {
    investigateEvidence(label)
    setToastMessage(`${label}: investigation complete`)
    setTimeout(() => setToastMessage(null), 3000)
  }

  if (!incident) {
    return <div className="min-h-screen bg-bg-primary text-text-primary p-8">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <SOCHeader incidentId={incident.incidentId} severity={incident.severity} />

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4">
        <div className="md:col-span-2 space-y-4">
          <div className="border border-border-default rounded p-4">
            <h2 className="text-sm uppercase text-text-secondary mb-2">Alert</h2>
            <p className="text-sm">{incident.alertMessage}</p>
          </div>

          <div className="border border-border-default rounded p-4">
            <h2 className="text-sm uppercase text-text-secondary mb-2">Event Timeline</h2>
            <EventTimeline steps={timeline} />
          </div>

          <div className="border border-border-default rounded p-4">
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
              <ActionButton label="Check Email Logs" onClick={() => handleAction('Check Email Logs')} />
              <ActionButton label="Check Auth Logs" onClick={() => handleAction('Check Auth Logs')} />
              <ActionButton label="Reset Password + MFA" onClick={() => handleAction('Reset Password + MFA')} />
              <ActionButton label="Isolate Device" variant="danger" onClick={() => handleAction('Isolate Device')} />
            </div>
          </div>

          <div className="border border-border-default rounded p-4 text-right">
            <ActionButton label="Complete Simulation" onClick={() => navigate('/report')} />
          </div>
        </div>
      </div>

      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}
    </div>
  )
}
