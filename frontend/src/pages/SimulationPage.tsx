import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import SOCHeader from '../components/SOCHeader'
import EventTimeline from '../components/EventTimeline'
import LogViewer from '../components/LogViewer'
import ScreenBezel from '../components/common/ScreenBezel'
import EvidenceCard from '../components/EvidenceCard'
import ActionButton from '../components/ActionButton'
import DeskScene, { type HotspotAction } from '../components/DeskScene'
import EvidenceDetail from '../components/evidence-views/EvidenceDetail'
import Toast from '../components/common/Toast'
import Spinner from '../components/common/Spinner'
import { IconBulb } from '../components/common/icons'
import { useSimulationStore, getAuthHeaders } from '../hooks/useSimulation'
import { useWebSocket } from '../hooks/useWebSocket'
import { API_BASE } from '../lib/constants'
import { DEFAULT_SCENARIO_ID, getScenario } from '../lib/scenarios'
import { playClick, playSuccess, playError, playAlert, playChime } from '../lib/sound'

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
  const [toastVariant, setToastVariant] = useState<'success' | 'danger' | 'warning' | 'info'>('success')
  const [loading, setLoading] = useState(false)
  const [openEvidenceId, setOpenEvidenceId] = useState<string | null>(null)
  const [caseFileOpen, setCaseFileOpen] = useState(false)

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
        setToastVariant('danger')
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
      playAlert()
      setToastVariant('warning')
      setToastMessage('Commander: No activity detected. The incident is still evolving — investigate further or consult your Mentor.')
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
      playSuccess()
      setToastVariant('success')
      setToastMessage(`${label}: investigation complete`)
      setTimeout(() => setToastMessage(null), 3000)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Investigation failed'
      playError()
      setToastVariant('danger')
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
      playSuccess()
      setToastVariant('success')
      setToastMessage(`${label}: action taken`)
      setTimeout(() => setToastMessage(null), 3000)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Decision failed'
      playError()
      setToastVariant('danger')
      setToastMessage(`Failed: ${errorMsg}`)
      setTimeout(() => setToastMessage(null), 4000)
    } finally {
      setLoading(false)
    }
  }

  // Re-clicking an already-revealed hotspot doesn't re-fire the API call
  // (investigate/decide are one-shot per label) -- it just re-opens that
  // evidence, enlarged and centered, like picking the object back up.
  const handleHotspotSelect = async (action: HotspotAction) => {
    playClick()
    const meta = getScenario(incident?.scenarioId).evidenceLibrary[action.label]
    const alreadyRevealed = meta ? evidence.some((e) => e.id === meta.id) : false

    if (alreadyRevealed) {
      if (meta) setOpenEvidenceId(meta.id)
      return
    }

    if (action.kind === 'investigate') {
      await handleInvestigate(action.label)
    } else {
      await handleDecide(action.label)
    }
    if (meta) setOpenEvidenceId(meta.id)
  }

  const handleComplete = async () => {
    playClick()
    completeSimulation()
    navigate('/report')
  }

  const handleGetHint = async () => {
    if (!incident) return
    try {
      const res = await fetch(`${API_BASE}/incidents/${incident.incidentId}/hint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ user_question: 'איזו פעולה כדאי לי לעשות הבא?' }),
      })
      if (!res.ok) throw new Error('Failed to get hint')
      const data = await res.json()
      playChime()
      setToastVariant('info')
      setToastMessage(`AI Mentor: ${data.hint}`)
      setTimeout(() => setToastMessage(null), 5000)
    } catch (error) {
      console.error('Failed to get hint:', error)
      playError()
      setToastVariant('danger')
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

  const isRevealed = (label: string): boolean => {
    const meta = scenario.evidenceLibrary[label]
    return meta ? evidence.some((e) => e.id === meta.id) : false
  }

  const hotspotActions: HotspotAction[] = [
    ...scenario.investigativeActions.map((action) => ({
      slot: action.slot,
      label: action.label,
      kind: 'investigate' as const,
      revealed: isRevealed(action.label),
    })),
    ...scenario.responseActions.map((action) => ({
      slot: action.slot,
      label: action.label,
      kind: 'decide' as const,
      revealed: isRevealed(action.label),
    })),
  ]

  const openEvidenceItem = openEvidenceId ? evidence.find((e) => e.id === openEvidenceId) : undefined

  return (
    <div className="page fixed inset-0 overflow-hidden bg-bg-primary text-text-primary">
      {/* Full-bleed desk scene: locked to the illustration's own
          1535:1024 frame, scaled up to cover the viewport on whichever
          axis needs it (the same result as object-fit: cover), but
          exposed as a real positioned box -- so every hotspot/overlay
          below, tuned in the scene's own percentages, stays aligned
          with the actual illustrated objects at any window shape, and
          everything the analyst needs renders inside the scene instead
          of around it. */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ aspectRatio: '1535 / 1024', minWidth: '100vw', minHeight: '100vh' }}
      >
        <DeskScene actions={hotspotActions} onSelect={handleHotspotSelect} disabled={loading} />
      </div>

      {/* Top HUD strip -- translucent, over the scene, not pushing it down. */}
      <div className="absolute inset-x-0 top-0 z-20 border-b border-border-default/60 bg-bg-primary/70 backdrop-blur-sm">
        <SOCHeader incidentId={incident.incidentId} severity={incident.severity} startedAt={incident.startedAt} />
      </div>

      {/* Incident alert -- anchored to the viewport (not the scene frame):
          the frame's "cover" scaling crops its top/bottom on wide screens,
          so anything pinned near its edge in scene-percentages can land
          off-screen. This still reads as part of the scene since the
          scene now fills the whole viewport behind it. */}
      <div
        className="absolute left-1/2 top-16 z-20 w-[min(90vw,32rem)] -translate-x-1/2 rounded border-2 border-accent-danger bg-bg-primary/85 px-3 py-2 shadow-[0_0_24px_rgb(var(--glow-danger)/0.45)] backdrop-blur-sm"
      >
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-accent-danger status-active" />
          <span className="stamp !border-accent-danger !text-accent-danger !py-0 !px-1.5 text-[9px]">Breaking</span>
          <span className="truncate text-[10px] uppercase tracking-[0.15em] text-text-secondary">{scenario.title}</span>
        </div>
        <p className="font-display briefing-glow mt-1 line-clamp-2 text-xs text-text-primary sm:text-sm">
          {incident.alertMessage}
        </p>
      </div>

      {/* Case file drawer -- Timeline/Evidence/Logs live here instead of
          beside the scene, tucked behind an edge tab so the default view
          is the scene itself. */}
      <button
        onClick={() => setCaseFileOpen((v) => !v)}
        style={{ writingMode: 'vertical-rl' }}
        className="absolute right-0 top-1/2 z-20 -translate-y-1/2 rounded-l border border-r-0 border-border-default bg-bg-primary/85 px-2 py-4 text-[10px] uppercase tracking-wide text-accent-success hover:bg-bg-secondary"
      >
        {caseFileOpen ? 'Close' : 'Case File'}
      </button>

      <div
        className={`absolute inset-y-0 right-0 z-10 w-full max-w-sm overflow-y-auto border-l border-border-default bg-bg-primary/90 p-4 pt-20 backdrop-blur-md transition-transform duration-300 ${
          caseFileOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="mb-4">
          <h2 className="mb-2 text-sm uppercase text-text-secondary">Event Timeline</h2>
          <ScreenBezel glow="info">
            <div className="p-4">
              <EventTimeline steps={timeline} />
            </div>
          </ScreenBezel>
        </div>

        <div className="cork-board mb-4 rounded p-4">
          <h2 className="mb-3 inline-block rounded bg-bg-primary/70 px-2 py-1 font-display text-sm uppercase tracking-wide text-paper">
            Evidence Board
          </h2>
          <div className="space-y-4 pt-1">
            {evidence.length === 0 && (
              <p className="rounded bg-black/30 p-2 text-xs text-paper">No evidence revealed yet. Investigate to find clues.</p>
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

        <div>
          <h2 className="mb-2 text-sm uppercase text-text-secondary">Logs</h2>
          <ScreenBezel glow="success">
            <LogViewer logs={mockLogs} />
          </ScreenBezel>
        </div>
      </div>

      {/* Floating HUD actions, anchored to the scene's corners. */}
      <button
        onClick={handleGetHint}
        disabled={loading}
        className="hud-frame absolute bottom-4 left-4 z-20 max-w-xs rounded border-2 border-accent-info bg-bg-primary/85 p-3 text-left backdrop-blur-sm transition-all hover:bg-accent-info/20 hover:shadow-[0_0_20px_rgb(var(--glow-info)/0.4)] disabled:cursor-not-allowed disabled:opacity-50"
        style={{ ['--hud-color' as string]: 'var(--color-accent-info)' }}
      >
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-accent-info">
          <IconBulb className="shrink-0" />
          Ask Your Mentor for a Hint
        </p>
        <p className="mt-1 text-[11px] text-text-secondary">Stuck? Get a nudge — never the answer itself.</p>
      </button>

      <div className="absolute bottom-4 right-4 z-20">
        <ActionButton label="Complete Simulation" onClick={handleComplete} />
      </div>

      {toastMessage && (
        <Toast message={toastMessage} variant={toastVariant} onClose={() => setToastMessage(null)} />
      )}

      {openEvidenceItem && (
        <EvidenceDetail item={openEvidenceItem} onClose={() => setOpenEvidenceId(null)} />
      )}
    </div>
  )
}
