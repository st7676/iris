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

interface SimulationState {
  incident: Incident | null
  timeline: TimelineStep[]
  evidence: Evidence[]
  startSimulation: () => void
  investigateEvidence: (evidenceType: string) => void
}

export const useSimulationStore = create<SimulationState>((set) => ({
  incident: null,
  timeline: [],
  evidence: [],

  startSimulation: () =>
    set({
      incident: {
        incidentId: 'SF-2026-0142',
        severity: 'medium',
        alertMessage: 'Unusual login activity detected',
      },
      timeline: [{ label: 'Check Email Logs', status: 'current' }],
      evidence: [],
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
      }
    }),
}))
