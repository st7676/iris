import { useEffect } from 'react'
import { useSimulationStore } from './useSimulation'

export function useWebSocket(incidentId: string) {
  useEffect(() => {
    const ws = new WebSocket(`ws://localhost:8000/ws/incidents/${incidentId}`)

    ws.onmessage = (event) => {
      const update = JSON.parse(event.data)
      if (update.type === 'event_update') {
        useSimulationStore.setState((state) => ({
          actionLog: [...state.actionLog, update],
        }))
      }
    }

    return () => ws.close()
  }, [incidentId])
}
