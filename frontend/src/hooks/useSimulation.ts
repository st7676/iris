import { create } from 'zustand'

const API_BASE = 'http://localhost:8000/api'

async function registerUser() {
  const timestamp = Date.now()
  const res = await fetch(`${API_BASE}/users/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: `user_${timestamp}`,
      email: `user_${timestamp}@guest.irisapp.io`,
      password: 'SecurePassword123!',
    }),
  })
  if (!res.ok) throw new Error(`Register failed: ${res.status}`)
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ evidence_type: evidenceType }),
  })
  if (!res.ok) throw new Error(`Investigate failed: ${res.status}`)
  return res.json()
}

async function apiDecide(incidentId: string, label: string) {
  const decision = decisionMap[label] ?? label
  const res = await fetch(`${API_BASE}/incidents/${incidentId}/decide`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ decision, notes: '' }),
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
  startSimulation: () => void
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
  userId: null,

  startSimulation: async () => {
    try {
      const user = await registerUser()
      const incident = await startScenario(user.id)
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
        userId: user.id,
      })
    } catch (error) {
      console.error('Failed to start simulation:', error)
      set({
        incident: {
          incidentId: 'SF-2026-ERROR',
          severity: 'medium',
          alertMessage: 'Failed to load incident from server',
        },
        timeline: [{ label: 'Check Email Logs', status: 'current' }],
        evidence: [],
        actionLog: [],
        completed: false,
        userId: null,
      })
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
