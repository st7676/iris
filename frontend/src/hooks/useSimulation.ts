import { create } from 'zustand'
import { API_BASE } from '../lib/constants'
import { DEFAULT_SCENARIO_ID, SCENARIOS } from '../lib/scenarios'

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

async function startScenario(userId: string, scenarioId: string) {
  const res = await fetch(`${API_BASE}/scenarios/${scenarioId}/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ evidence_type: evidenceType }),
  })
  if (!res.ok) throw new Error(`Investigate failed: ${res.status}`)
  return res.json()
}

async function apiDecide(incidentId: string, scenarioId: string, label: string) {
  const decision = resolveDecision(scenarioId, label)
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
  scenarioId: string
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
  startSimulation: (scenarioId?: string) => void
  investigateEvidence: (label: string) => void
  decide: (label: string) => void
  completeSimulation: () => void
}

export const useSimulationStore = create<SimulationState>((set) => ({
  incident: null,
  timeline: [],
  evidence: [],
  actionLog: [],
  completed: false,
  userId: null,

  startSimulation: async (scenarioId: string = DEFAULT_SCENARIO_ID) => {
    const firstAction = SCENARIOS[scenarioId]?.investigativeActions[0]?.label ?? ''
    try {
      const user = await registerUser()
      const incident = await startScenario(user.id, scenarioId)
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
        userId: user.id,
      })
    } catch (error) {
      console.error('Failed to start simulation:', error)
      set({
        incident: {
          incidentId: 'SF-2026-ERROR',
          scenarioId,
          severity: 'medium',
          alertMessage: 'Failed to load incident from server',
          startedAt: new Date().toISOString(),
        },
        timeline: firstAction ? [{ label: firstAction, status: 'current' }] : [],
        evidence: [],
        actionLog: [],
        completed: false,
        userId: null,
      })
    }
  },

  investigateEvidence: async (label: string) => {
    const state = useSimulationStore.getState()
    if (!state.incident) return

    try {
      await apiInvestigate(state.incident.incidentId, state.incident.scenarioId, label)

      const alreadyInTimeline = state.timeline.some((step) => step.label === label)
      const newEvidence = SCENARIOS[state.incident.scenarioId]?.evidenceLibrary[label]
      const alreadyRevealed = state.evidence.some((e) => e.id === newEvidence?.id)

      const updatedTimeline = state.timeline.map((step) =>
        step.status === 'current' ? { ...step, status: 'done' as const } : step
      )

      set({
        timeline: alreadyInTimeline
          ? updatedTimeline
          : [...updatedTimeline, { label, status: 'current' as const }],
        evidence:
          newEvidence && !alreadyRevealed ? [...state.evidence, newEvidence] : state.evidence,
        actionLog: [...state.actionLog, { label, type: 'investigate' }],
      })
    } catch (error) {
      console.error('Failed to investigate:', error)
    }
  },

  decide: async (label: string) => {
    const state = useSimulationStore.getState()
    if (!state.incident) return

    try {
      await apiDecide(state.incident.incidentId, state.incident.scenarioId, label)

      const alreadyInTimeline = state.timeline.some((step) => step.label === label)
      const newEvidence = SCENARIOS[state.incident.scenarioId]?.evidenceLibrary[label]
      const alreadyRevealed = state.evidence.some((e) => e.id === newEvidence?.id)

      const updatedTimeline = state.timeline.map((step) =>
        step.status === 'current' ? { ...step, status: 'done' as const } : step
      )

      set({
        timeline: alreadyInTimeline
          ? updatedTimeline
          : [...updatedTimeline, { label, status: 'current' as const }],
        evidence:
          newEvidence && !alreadyRevealed ? [...state.evidence, newEvidence] : state.evidence,
        actionLog: [...state.actionLog, { label, type: 'decide' as const }],
      })
    } catch (error) {
      console.error('Failed to decide:', error)
    }
  },

  completeSimulation: () => set({ completed: true }),
}))
