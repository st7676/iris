import { useNavigate } from 'react-router-dom'
import SOCHeader from '../components/SOCHeader'
import EventTimeline from '../components/EventTimeline'
import LogViewer from '../components/LogViewer'
import EvidenceCard from '../components/EvidenceCard'
import ActionButton from '../components/ActionButton'

const mockTimeline = [
  { label: 'Check Email Logs', status: 'done' as const },
  { label: 'Check Auth Logs', status: 'current' as const },
  { label: 'Decision Pending', status: 'pending' as const },
]

const mockLogs = [
  { time: '10:30', source: 'auth', type: 'FAILED', details: '5x Failed Login (passwd)' },
  { time: '10:31', source: 'mail', type: 'EMAIL', details: 'Phishing: Re-enter pwd' },
  { time: '10:35', source: 'auth', type: 'LOGIN', details: 'Success from new device' },
  { time: '10:36', source: 'file', type: 'ACCESS', details: '/shared/secrets.xlsx' },
]

export default function SimulationPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <SOCHeader incidentId="SF-2026-0142" severity="medium" />

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4">
        <div className="md:col-span-2 space-y-4">
          <div className="border border-border-default rounded p-4">
            <h2 className="text-sm uppercase text-text-secondary mb-2">Alert</h2>
            <p className="text-sm">Unusual login activity detected</p>
          </div>

          <div className="border border-border-default rounded p-4">
            <h2 className="text-sm uppercase text-text-secondary mb-2">Event Timeline</h2>
            <EventTimeline steps={mockTimeline} />
          </div>

          <div className="border border-border-default rounded p-4">
            <h2 className="text-sm uppercase text-text-secondary mb-2">Evidence</h2>
            <div className="space-y-2">
              <EvidenceCard
                icon="📧"
                title="Email Logs"
                description="Phishing email from suspicious@phishing.site"
                revealedAtStep={1}
                timestamp="2026-01-15 10:30"
              />
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
              <ActionButton label="Check Email Logs" />
              <ActionButton label="Check Auth Logs" />
              <ActionButton label="Reset Password + MFA" />
              <ActionButton label="Isolate Device" variant="danger" />
            </div>
          </div>

          <div className="border border-border-default rounded p-4 text-right">
            <ActionButton label="Complete Simulation" onClick={() => navigate('/report')} />
          </div>
        </div>
      </div>
    </div>
  )
}
