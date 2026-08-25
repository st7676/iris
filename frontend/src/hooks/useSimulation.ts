import { create } from 'zustand'

const API_BASE = 'http://localhost:8000/api'
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

async function startScenario(userId: string, scenarioId: string = 'silent_login_v1') {
  const res = await fetch(`${API_BASE}/scenarios/${scenarioId}/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ scenario_id: scenarioId, user_id: userId }),
  })
  if (!res.ok) throw new Error(`Start scenario failed: ${res.status}`)
  return res.json()
}

// Maps the UI's display labels to the machine-readable values the backend
// expects (see backend/app/simulation/evidence.py and the scenario's
// ideal_reasoning_chain in backend/app/db/init_db.py).
const evidenceTypeMap: Record<string, string> = {
  'Check Email Logs': 'email_logs',
  'Check Auth Logs': 'auth_logs',
}

const decisionMap: Record<string, string> = {
  'Reset Password + MFA': 'reset_password_mfa',
  'Isolate Device': 'isolate_device',
}

async function apiInvestigate(incidentId: string, label: string) {
  const evidenceType = evidenceTypeMap[label] ?? label
  const res = await fetch(`${API_BASE}/incidents/${incidentId}/investigate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ evidence_type: evidenceType }),
  })
  if (!res.ok) throw new Error(`Investigate failed: ${res.status}`)
  return res.json()
}

async function apiDecide(incidentId: string, label: string) {
  const decision = decisionMap[label] ?? label
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
  severity: 'low' | 'medium' | 'high'
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
}

const evidenceLibrary: Record<string, Evidence> = {
  'Check Email Logs': {
    id: 'email',
    icon: '📧',
    title: 'Email Logs',
    description: 'Phishing email from suspicious@phishing.site',
    revealedAtStep: 1,
    timestamp: '2026-01-15 10:30',
  },
  'Check Auth Logs': {
    id: 'auth',
    icon: '🔐',
    title: 'Authentication Logs',
    description: '5x failed login attempts, then success from new device',
    revealedAtStep: 2,
    timestamp: '2026-01-15 10:35',
  },
  'Reset Password + MFA': {
    id: 'reset',
    icon: '🔑',
    title: 'Password Reset',
    description: 'Password reset and MFA enabled for affected account',
    revealedAtStep: 3,
    timestamp: '2026-01-15 10:40',
  },
  'Isolate Device': {
    id: 'isolate',
    icon: '🚫',
    title: 'Device Isolated',
    description: 'Unrecognized device disconnected from network',
    revealedAtStep: 4,
    timestamp: '2026-01-15 10:42',
  },
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
  login: (username: string, password: string, isRegister?: boolean) => Promise<void>
  logout: () => void
  startSimulation: (scenarioId?: string) => Promise<void>
  investigateEvidence: (evidenceType: string) => void
  decide: (action: string) => void
  completeSimulation: () => void
}

export const useSimulationStore = create<SimulationState>((set) => ({
  incident: null,
  timeline: [],
  evidence: [],
  actionLog: [],
  completed: false,
  userId: getStoredUserId(),
  token: getStoredToken(),

  login: async (username: string, password: string, isRegister = false) => {
    try {
      const data = isRegister
        ? await registerUser(username, password)
        : await loginUser(username, password)
      storeUserId(data.user.id)
      storeToken(data.access_token)
      set({ userId: data.user.id, token: data.access_token })
    } catch (error) {
      throw error
    }
  },

  logout: () => {
    clearStoredUserId()
    clearStoredToken()
    set({ userId: null, token: null })
  },

  startSimulation: async (scenarioId = 'silent_login_v1') => {
    try {
      const state = useSimulationStore.getState()
      if (!state.userId) {
        throw new Error('User must be logged in to start simulation')
      }
      const incident = await startScenario(state.userId, scenarioId)
      set({
        incident: {
          incidentId: incident.incident_id,
          severity: incident.severity,
          alertMessage: incident.alert_message,
          startedAt: incident.timestamp,
        },
        timeline: [{ label: 'Check Email Logs', status: 'current' }],
        evidence: [],
        actionLog: [],
        completed: false,
      })
    } catch (error) {
      console.error('Failed to start simulation:', error)
      set({
        incident: {
          incidentId: 'SF-2026-ERROR',
          severity: 'medium',
          alertMessage: error instanceof Error ? error.message : 'Failed to load incident from server',
          startedAt: new Date().toISOString(),
        },
        timeline: [{ label: 'Check Email Logs', status: 'current' }],
        evidence: [],
        actionLog: [],
        completed: false,
      })
      throw error
    }
  },

  investigateEvidence: async (evidenceType: string) => {
    const state = useSimulationStore.getState()
    if (!state.incident) throw new Error('No incident in progress')

    try {
      await apiInvestigate(state.incident.incidentId, evidenceType)

      const alreadyInTimeline = state.timeline.some((step) => step.label === evidenceType)
      const newEvidence = evidenceLibrary[evidenceType]
      const alreadyRevealed = state.evidence.some((e) => e.id === newEvidence?.id)

      const updatedTimeline = state.timeline.map((step) =>
        step.status === 'current' ? { ...step, status: 'done' as const } : step
      )

      set({
        timeline: alreadyInTimeline
          ? updatedTimeline
          : [...updatedTimeline, { label: evidenceType, status: 'current' as const }],
        evidence:
          newEvidence && !alreadyRevealed ? [...state.evidence, newEvidence] : state.evidence,
        actionLog: [...state.actionLog, { label: evidenceType, type: 'investigate' }],
      })
    } catch (error) {
      console.error('Failed to investigate:', error)
      throw error
    }
  },

  decide: async (action: string) => {
    const state = useSimulationStore.getState()
    if (!state.incident) throw new Error('No incident in progress')

    try {
      await apiDecide(state.incident.incidentId, action)

      const alreadyInTimeline = state.timeline.some((step) => step.label === action)
      const newEvidence = evidenceLibrary[action]
      const alreadyRevealed = state.evidence.some((e) => e.id === newEvidence?.id)

      const updatedTimeline = state.timeline.map((step) =>
        step.status === 'current' ? { ...step, status: 'done' as const } : step
      )

      set({
        timeline: alreadyInTimeline
          ? updatedTimeline
          : [...updatedTimeline, { label: action, status: 'current' as const }],
        evidence:
          newEvidence && !alreadyRevealed ? [...state.evidence, newEvidence] : state.evidence,
        actionLog: [...state.actionLog, { label: action, type: 'decide' as const }],
      })
    } catch (error) {
      console.error('Failed to decide:', error)
      throw error
    }
  },

  completeSimulation: () => set({ completed: true }),
}))
