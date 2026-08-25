import { useEffect } from 'react'
import { useSimulationStore, getStoredToken } from './useSimulation'
import { WS_BASE } from '../lib/constants'

export function useWebSocket(incidentId: string) {
  useEffect(() => {
    // Browsers can't set an Authorization header on a WebSocket handshake,
    // so the token travels as a query param instead (see
    // backend/app/main.py's incident_websocket).
    const token = getStoredToken()
    const ws = new WebSocket(`${WS_BASE}/incidents/${incidentId}?token=${encodeURIComponent(token ?? '')}`)

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
