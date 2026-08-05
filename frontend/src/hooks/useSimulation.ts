import { create } from 'zustand'

const API_BASE = 'http://localhost:8000/api'
const STORAGE_KEY = 'iris_user_id'

function getStoredUserId(): string | null {
  return localStorage.getItem(STORAGE_KEY)
}

function storeUserId(id: string): void {
  localStorage.setItem(STORAGE_KEY, id)
}

function clearStoredUserId(): void {
  localStorage.removeItem(STORAGE_KEY)
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenario_id: scenarioId, user_id: userId }),
  })
  if (!res.ok) throw new Error(`Start scenario failed: ${res.status}`)
  return res.json()
}

async function apiInvestigate(incidentId: string, label: string) {
  const res = await fetch(`${API_BASE}/incidents/${incidentId}/investigate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ decision: label, notes: '' }),
  })
  if (!res.ok) throw new Error(`Investigate failed: ${res.status}`)
  return res.json()
}

async function apiDecide(incidentId: string, label: string) {
  const res = await fetch(`${API_BASE}/incidents/${incidentId}/decide`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ decision: label, notes: '' }),
  })
  if (!res.ok) throw new Error(`Decide failed: ${res.status}`)
  return res.json()
}

interface Incident {
  incidentId: string
  severity: 'low' | 'medium' | 'high'
  alertMessage: string
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

  login: async (username: string, password: string, isRegister = false) => {
    try {
      const user = isRegister
        ? await registerUser(username, password)
        : await loginUser(username, password)
      storeUserId(user.id)
      set({ userId: user.id })
    } catch (error) {
      throw error
    }
  },

  logout: () => {
    clearStoredUserId()
    set({ userId: null })
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
    if (!state.incident) return

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
    }
  },

  decide: async (action: string) => {
    const state = useSimulationStore.getState()
    if (!state.incident) return

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
    }
  },

  completeSimulation: () => set({ completed: true }),
}))
