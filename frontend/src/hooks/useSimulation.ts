import { create } from 'zustand'

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

  startSimulation: () =>
    set({
      incident: {
        incidentId: 'SF-2026-0142',
        severity: 'medium',
        alertMessage: 'Unusual login activity detected',
      },
      timeline: [{ label: 'Check Email Logs', status: 'current' }],
      evidence: [],
      actionLog: [],
      completed: false,
    }),

  investigateEvidence: (evidenceType: string) =>
    set((state) => {
      const alreadyInTimeline = state.timeline.some((step) => step.label === evidenceType)
      const newEvidence = evidenceLibrary[evidenceType]
      const alreadyRevealed = state.evidence.some((e) => e.id === newEvidence?.id)

      const updatedTimeline = state.timeline.map((step) =>
        step.status === 'current' ? { ...step, status: 'done' as const } : step
      )

      return {
        timeline: alreadyInTimeline
          ? updatedTimeline
          : [...updatedTimeline, { label: evidenceType, status: 'current' as const }],
        evidence:
          newEvidence && !alreadyRevealed ? [...state.evidence, newEvidence] : state.evidence,
        actionLog: [...state.actionLog, { label: evidenceType, type: 'investigate' }],
      }
    }),

  decide: (action: string) =>
    set((state) => {
      const alreadyInTimeline = state.timeline.some((step) => step.label === action)
      const newEvidence = evidenceLibrary[action]
      const alreadyRevealed = state.evidence.some((e) => e.id === newEvidence?.id)

      const updatedTimeline = state.timeline.map((step) =>
        step.status === 'current' ? { ...step, status: 'done' as const } : step
      )

      return {
        timeline: alreadyInTimeline
          ? updatedTimeline
          : [...updatedTimeline, { label: action, status: 'current' as const }],
        evidence:
          newEvidence && !alreadyRevealed ? [...state.evidence, newEvidence] : state.evidence,
        actionLog: [...state.actionLog, { label: action, type: 'decide' as const }],
      }
    }),

  completeSimulation: () => set({ completed: true }),
}))
