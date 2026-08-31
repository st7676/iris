import { create } from 'zustand'
import { API_BASE, MAX_HINTS_PER_INCIDENT } from '../lib/constants'
import { getLanguageHeader } from '../lib/language'
import { DEFAULT_SCENARIO_ID, SCENARIOS, type EvidenceDetails } from '../lib/scenarios'

const STORAGE_KEY = 'iris_user_id'
const TOKEN_STORAGE_KEY = 'iris_access_token'

function getStoredUserId(): string | null {
  return localStorage.getItem(STORAGE_KEY)
}

function storeUserId(id: string): void {
  localStorage.setItem(STORAGE_KEY, id)
}

function clearStoredUserId(): void {
  localStorage.removeItem(STORAGE_KEY)
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY)
}

function storeToken(token: string): void {
  localStorage.setItem(TOKEN_STORAGE_KEY, token)
}

function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY)
}

// Every endpoint except /users/register and /users/login requires this
// (see backend/app/deps.py's get_current_user_id) -- exported so pages that
// fetch() directly (ReportPage, HistoryPage, InstructorDashboardPage, ...)
// can attach it without duplicating the localStorage read.
export function getAuthHeaders(): Record<string, string> {
  const token = getStoredToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// The WebSocket handshake can't carry an Authorization header, so it needs
// a token in the URL instead -- but the normal access token is valid for a
// day, far longer than a handshake needs to sit exposed in a URL (server
// logs, browser history). Exchange it for a short-lived, single-purpose
// ticket right before connecting (see backend/app/core/security.py's
// create_ws_ticket / POST /api/users/ws-ticket).
export async function getWsTicket(): Promise<string> {
  const res = await fetch(`${API_BASE}/users/ws-ticket`, {
    method: 'POST',
    headers: getAuthHeaders(),
  })
  if (!res.ok) throw new Error(`Failed to get WS ticket: ${res.status}`)
  const data = await res.json()
  return data.ws_ticket
}

async function loginUser(username: string, password: string) {
  const res = await fetch(`${API_BASE}/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.detail || `Login failed: ${res.status}`)
  }
  return res.json()
}

async function registerUser(username: string, password: string, email?: string) {
  const timestamp = Date.now()
  const res = await fetch(`${API_BASE}/users/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: username || `user_${timestamp}`,
      email: email || `${username || `user_${timestamp}`}@guest.irisapp.io`,
      password: password || 'SecurePassword123!',
    }),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.detail || `Register failed: ${res.status}`)
  }
  return res.json()
}

async function startScenario(userId: string, scenarioId: string) {
  const res = await fetch(`${API_BASE}/scenarios/${scenarioId}/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ scenario_id: scenarioId, user_id: userId }),
  })
  if (!res.ok) throw new Error(`Start scenario failed: ${res.status}`)
  return res.json()
}

// Resolves a UI label ("Check HR Status") to the machine-readable
// evidence_type/decision value the backend expects, per the current
// scenario's config (see lib/scenarios.ts). Falls back to the label
// itself if not found, so a typo shows up as a clear 4xx from the API
// rather than silently vanishing.
function resolveEvidenceType(scenarioId: string, label: string): string {
  const action = SCENARIOS[scenarioId]?.investigativeActions.find((a) => a.label === label)
  return action?.evidenceType ?? label
}

function resolveDecision(scenarioId: string, label: string): string {
  const action = SCENARIOS[scenarioId]?.responseActions.find((a) => a.label === label)
  return action?.decision ?? label
}

async function apiInvestigate(incidentId: string, scenarioId: string, label: string) {
  const evidenceType = resolveEvidenceType(scenarioId, label)
  const res = await fetch(`${API_BASE}/incidents/${incidentId}/investigate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders(), ...getLanguageHeader() },
    body: JSON.stringify({ evidence_type: evidenceType }),
  })
  if (!res.ok) throw new Error(`Investigate failed: ${res.status}`)
  return res.json()
}

async function apiDecide(incidentId: string, scenarioId: string, label: string) {
  const decision = resolveDecision(scenarioId, label)
  const res = await fetch(`${API_BASE}/incidents/${incidentId}/decide`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ decision, notes: '' }),
  })
  if (!res.ok) throw new Error(`Decide failed: ${res.status}`)
  return res.json()
}

interface Incident {
  incidentId: string
  scenarioId: string
  // 'critical' is reachable once the breach deadline passes (see
  // backend's branching_logic.py's escalate_if_deadline_passed) -- it
  // used to be missing here even though the backend enum has always had
  // it, so a real critical response would have hit an undefined color
  // lookup in SOCHeader.
  severity: 'low' | 'medium' | 'high' | 'critical'
  alertMessage: string
  startedAt: string
}

interface TimelineStep {
  label: string
  status: 'done' | 'current' | 'pending'
}

interface Evidence {
  id: string
  icon: string
  title: string
  description: string
  revealedAtStep: number
  timestamp: string
  details: EvidenceDetails
}

interface ActionLogEntry {
  label: string
  type: 'investigate' | 'decide'
}

interface SimulationState {
  incident: Incident | null
  timeline: TimelineStep[]
  evidence: Evidence[]
  actionLog: ActionLogEntry[]
  completed: boolean
  userId: string | null
  token: string | null
  // Hints aren't free anymore (backend caps them at MAX_HINTS_PER_INCIDENT
  // and docks score per hint) -- this tracks how many are left so the UI
  // can show/disable accordingly. Reset on every new incident; updated from
  // the server's response after each successful hint, which is always the
  // source of truth.
  hintsRemaining: number
  login: (username: string, password: string, isRegister?: boolean) => Promise<void>
  logout: () => void
  startSimulation: (scenarioId?: string) => Promise<void>
  investigateEvidence: (label: string) => void
  decide: (label: string) => void
  completeSimulation: () => void
  setHintsRemaining: (remaining: number) => void
}

export const useSimulationStore = create<SimulationState>((set) => ({
  incident: null,
  timeline: [],
  evidence: [],
  actionLog: [],
  completed: false,
  userId: getStoredUserId(),
  token: getStoredToken(),
  hintsRemaining: MAX_HINTS_PER_INCIDENT,

  login: async (username: string, password: string, isRegister = false) => {
    const data = isRegister
      ? await registerUser(username, password)
      : await loginUser(username, password)
    // The API contract is {access_token, user: {id, ...}} (see backend's
    // TokenResponse) -- but a stale/mismatched backend or a future API
    // change could send something else. Fail with a message the user can
    // act on instead of a raw "Cannot read properties of undefined" from
    // reaching into data.user.id.
    if (!data?.access_token || !data?.user?.id) {
      throw new Error('Unexpected response from server -- please try again')
    }
    storeUserId(data.user.id)
    storeToken(data.access_token)
    set({ userId: data.user.id, token: data.access_token })
  },

  logout: () => {
    // Best-effort: revoke the token server-side (see backend/app/api/routes/users.py's
    // /logout) so it can't be replayed if it leaked, but don't block clearing
    // the local session on it -- the user should end up logged out locally
    // either way, even if this request fails (offline, Postgres down, etc.).
    fetch(`${API_BASE}/users/logout`, { method: 'POST', headers: getAuthHeaders() }).catch(
      (error) => console.error('Failed to revoke token on logout:', error)
    )
    clearStoredUserId()
    clearStoredToken()
    set({ userId: null, token: null })
  },

  startSimulation: async (scenarioId: string = DEFAULT_SCENARIO_ID) => {
    const firstAction = SCENARIOS[scenarioId]?.investigativeActions[0]?.label ?? ''
    try {
      const state = useSimulationStore.getState()
      if (!state.userId) {
        throw new Error('User must be logged in to start simulation')
      }
      const incident = await startScenario(state.userId, scenarioId)
      set({
        incident: {
          incidentId: incident.incident_id,
          scenarioId,
          severity: incident.severity,
          alertMessage: incident.alert_message,
          startedAt: incident.timestamp,
        },
        timeline: firstAction ? [{ label: firstAction, status: 'current' }] : [],
        evidence: [],
        actionLog: [],
        completed: false,
        hintsRemaining: MAX_HINTS_PER_INCIDENT,
      })
    } catch (error) {
      console.error('Failed to start simulation:', error)
      set({
        incident: {
          incidentId: 'SF-2026-ERROR',
          scenarioId,
          severity: 'medium',
          alertMessage: error instanceof Error ? error.message : 'Failed to load incident from server',
          startedAt: new Date().toISOString(),
        },
        timeline: firstAction ? [{ label: firstAction, status: 'current' }] : [],
        evidence: [],
        actionLog: [],
        completed: false,
        hintsRemaining: MAX_HINTS_PER_INCIDENT,
      })
      throw error
    }
  },

  setHintsRemaining: (remaining: number) => set({ hintsRemaining: remaining }),

  investigateEvidence: async (label: string) => {
    const state = useSimulationStore.getState()
    if (!state.incident) throw new Error('No incident in progress')

    try {
      const updated = await apiInvestigate(state.incident.incidentId, state.incident.scenarioId, label)

      const alreadyInTimeline = state.timeline.some((step) => step.label === label)
      const newEvidence = SCENARIOS[state.incident.scenarioId]?.evidenceLibrary[label]
      const alreadyRevealed = state.evidence.some((e) => e.id === newEvidence?.id)

      const updatedTimeline = state.timeline.map((step) =>
        step.status === 'current' ? { ...step, status: 'done' as const } : step
      )

      // The backend re-evaluates severity on every investigate (branching_logic.py)
      // and returns the current value -- previously ignored here, so the
      // header's severity badge stayed frozen at whatever it was when the
      // incident started, even as the case actively escalated server-side.
      const nextSeverity: Incident['severity'] = updated.severity ?? state.incident.severity

      set({
        incident: { ...state.incident, severity: nextSeverity },
        timeline: alreadyInTimeline
          ? updatedTimeline
          : [...updatedTimeline, { label, status: 'current' as const }],
        evidence:
          newEvidence && !alreadyRevealed ? [...state.evidence, newEvidence] : state.evidence,
        actionLog: [...state.actionLog, { label, type: 'investigate' }],
      })
    } catch (error) {
      console.error('Failed to investigate:', error)
      throw error
    }
  },

  decide: async (label: string) => {
    const state = useSimulationStore.getState()
    if (!state.incident) throw new Error('No incident in progress')

    try {
      const updated = await apiDecide(state.incident.incidentId, state.incident.scenarioId, label)

      const alreadyInTimeline = state.timeline.some((step) => step.label === label)
      const newEvidence = SCENARIOS[state.incident.scenarioId]?.evidenceLibrary[label]
      const alreadyRevealed = state.evidence.some((e) => e.id === newEvidence?.id)

      const updatedTimeline = state.timeline.map((step) =>
        step.status === 'current' ? { ...step, status: 'done' as const } : step
      )

      const nextSeverity: Incident['severity'] = updated.severity ?? state.incident.severity

      set({
        incident: { ...state.incident, severity: nextSeverity },
        timeline: alreadyInTimeline
          ? updatedTimeline
          : [...updatedTimeline, { label, status: 'current' as const }],
        evidence:
          newEvidence && !alreadyRevealed ? [...state.evidence, newEvidence] : state.evidence,
        actionLog: [...state.actionLog, { label, type: 'decide' as const }],
      })
    } catch (error) {
      console.error('Failed to decide:', error)
      throw error
    }
  },

  completeSimulation: () => set({ completed: true }),
}))
