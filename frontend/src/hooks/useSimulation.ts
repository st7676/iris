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

interface SimulationState {
  incident: Incident | null
  timeline: TimelineStep[]
  startSimulation: () => void
  investigateEvidence: (evidenceType: string) => void
}

export const useSimulationStore = create<SimulationState>((set) => ({
  incident: null,
  timeline: [],

  startSimulation: () =>
    set({
      incident: {
        incidentId: 'SF-2026-0142',
        severity: 'medium',
        alertMessage: 'Unusual login activity detected',
      },
      timeline: [
        { label: 'Check Email Logs', status: 'current' },
      ],
    }),

  investigateEvidence: (evidenceType: string) =>
    set((state) => ({
      timeline: [
        ...state.timeline.map((step) =>
          step.status === 'current' ? { ...step, status: 'done' as const } : step
        ),
        { label: evidenceType, status: 'current' as const },
      ],
    })),
}))
