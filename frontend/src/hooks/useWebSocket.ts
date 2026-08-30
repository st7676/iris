import { useEffect } from 'react'
import { useSimulationStore, getWsTicket } from './useSimulation'
import { WS_BASE } from '../lib/constants'

export function useWebSocket(incidentId: string) {
  useEffect(() => {
    let cancelled = false
    let ws: WebSocket | null = null

    // Browsers can't set an Authorization header on a WebSocket handshake,
    // so a short-lived ticket travels as a query param instead (see
    // backend/app/main.py's incident_websocket).
    getWsTicket()
      .then((ticket) => {
        if (cancelled) return
        ws = new WebSocket(`${WS_BASE}/incidents/${incidentId}?token=${encodeURIComponent(ticket)}`)
        ws.onmessage = (event) => {
          const update = JSON.parse(event.data)
          if (update.type === 'event_update') {
            useSimulationStore.setState((state) => ({
              actionLog: [...state.actionLog, update],
            }))
          }
        }
      })
      .catch((error) => {
        console.error('Failed to open incident WebSocket:', error)
      })

    return () => {
      cancelled = true
      ws?.close()
    }
  }, [incidentId])
}
