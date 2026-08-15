import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
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
import { DEFAULT_SCENARIO_ID, getScenario } from '../lib/scenarios'

const mockLogs = [
  { time: '10:30', source: 'auth', type: 'FAILED', details: '5x Failed Login (passwd)' },
  { time: '10:31', source: 'mail', type: 'EMAIL', details: 'Phishing: Re-enter pwd' },
  { time: '10:35', source: 'auth', type: 'LOGIN', details: 'Success from new device' },
  { time: '10:36', source: 'file', type: 'ACCESS', details: '/shared/secrets.xlsx' },
]

// Proactive nudge: if the analyst hasn't taken any action for this long,
// surface a Commander-styled reminder instead of leaving them stuck
// staring at the screen (per the "leave room to choose, but don't let
// them stall" UX goal).
const IDLE_NUDGE_MS = 30_000

export default function SimulationPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { incident, timeline, evidence, actionLog, startSimulation, investigateEvidence, decide, completeSimulation } =
    useSimulationStore()
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Scenario picked on HomePage/BriefingPage, passed via navigation state
  // (see navigate('/simulation', { state: { scenarioId } })). Falls back
  // to the default if this page is reached directly (e.g. a refresh).
  const requestedScenarioId =
    (location.state as { scenarioId?: string } | null)?.scenarioId ?? DEFAULT_SCENARIO_ID

  useEffect(() => {
    // Normally the incident is already started by BriefingPage before we
    // ever get here -- this only fires as a fallback (e.g. landing on
    // /simulation directly via a refresh).
    if (!incident) {
      startSimulation(requestedScenarioId).catch((err) => {
        setToastMessage(`Failed to start simulation: ${err instanceof Error ? err.message : 'Unknown error'}`)
      })
    }
  }, [incident, requestedScenarioId, startSimulation])

  useWebSocket(incident?.incidentId || '')

  // Idle nudge: resets on every investigate/decide action. Purely a UI
  // reminder (styled like a Commander alert) -- it does not make an AI
  // call, so it costs nothing and can't get stuck waiting on the network.
  useEffect(() => {
    if (!incident || incident.incidentId === 'SF-2026-ERROR') return

    // Tracks the "clear the nudge toast" timer too, not just the nudge
    // itself -- otherwise it's never cancelled by this effect's cleanup,
    // and it can fire later and wipe a newer, unrelated toast (e.g. from
    // an investigate/decide action taken shortly after the nudge).
    let dismissTimer: ReturnType<typeof setTimeout> | undefined

    const nudgeTimer = setTimeout(() => {
      setToastMessage('⚠ Commander: No activity detected. The incident is still evolving — investigate further or consult your Mentor.')
      dismissTimer = setTimeout(() => setToastMessage(null), 5000)
    }, IDLE_NUDGE_MS)

    return () => {
      clearTimeout(nudgeTimer)
      if (dismissTimer) clearTimeout(dismissTimer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incident?.incidentId, actionLog.length])

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

  const scenario = getScenario(incident.scenarioId)

  return (
    <div className="page min-h-screen bg-bg-primary text-text-primary">
      <SOCHeader incidentId={incident.incidentId} severity={incident.severity} startedAt={incident.startedAt} />

      <div
        className="hud-frame mx-4 mt-4 border-2 border-accent-danger bg-accent-danger/10 rounded p-5 animate-pulse"
        style={{ ['--hud-color' as string]: 'var(--color-accent-danger)', animationDuration: '2.5s' }}
      >
        <h2 className="text-xs uppercase tracking-[0.3em] text-accent-danger mb-1">
          ⚠ Active Alert — {scenario.title}
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
              {scenario.investigativeActions.map((action) => (
                <ActionButton
                  key={action.label}
                  label={action.label}
                  onClick={() => handleInvestigate(action.label)}
                  disabled={loading}
                />
              ))}
              {scenario.responseActions.map((action) => (
                <ActionButton
                  key={action.label}
                  label={action.label}
                  variant={action.variant ?? 'default'}
                  onClick={() => handleDecide(action.label)}
                  disabled={loading}
                />
              ))}
            </div>
          </div>

          {/* Mentor hint: its own highlighted block, not just one button
              lost among the others -- this is the escape-room "ask for a
              clue" moment and should read as a distinct, inviting action. */}
          <button
            onClick={handleGetHint}
            disabled={loading}
            className="hud-frame w-full border-2 border-accent-info bg-accent-info/10 rounded p-4 text-left hover:bg-accent-info/20 hover:shadow-[0_0_20px_rgba(0,153,255,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ ['--hud-color' as string]: 'var(--color-accent-info)' }}
          >
            <p className="text-sm font-bold uppercase tracking-wide text-accent-info">
              💡 Ask Your Mentor for a Hint
            </p>
            <p className="mt-1 text-xs text-text-secondary">
              Stuck? Get a nudge in the right direction — never the answer itself.
            </p>
          </button>

          <div className="border border-border-default rounded p-4 text-right">
            <ActionButton label="Complete Simulation" onClick={handleComplete} />
          </div>
        </div>
      </div>

      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}
    </div>
  )
}
