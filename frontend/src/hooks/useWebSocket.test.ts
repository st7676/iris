import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useWebSocket } from './useWebSocket'
import { useSimulationStore } from './useSimulation'

vi.mock('./useSimulation', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./useSimulation')>()
  return { ...actual, getWsTicket: vi.fn() }
})

// Minimal stand-in for the browser WebSocket -- jsdom doesn't implement one,
// and the hook only touches the constructor, .onmessage and .close(), so a
// real socket/server isn't needed to exercise its logic.
class MockWebSocket {
  static instances: MockWebSocket[] = []
  url: string
  onmessage: ((event: { data: string }) => void) | null = null
  closed = false

  constructor(url: string) {
    this.url = url
    MockWebSocket.instances.push(this)
  }

  close() {
    this.closed = true
  }
}

describe('useWebSocket', () => {
  beforeEach(async () => {
    MockWebSocket.instances = []
    vi.stubGlobal('WebSocket', MockWebSocket)
    useSimulationStore.setState({ actionLog: [] })
    const { getWsTicket } = await import('./useSimulation')
    vi.mocked(getWsTicket).mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('opens a socket at the incident URL with the fetched ticket as a query param', async () => {
    const { getWsTicket } = await import('./useSimulation')
    vi.mocked(getWsTicket).mockResolvedValue('ticket abc/123')

    renderHook(() => useWebSocket('INC-42'))

    await waitFor(() => expect(MockWebSocket.instances).toHaveLength(1))
    expect(MockWebSocket.instances[0].url).toBe(
      'ws://localhost:8000/ws/incidents/INC-42?token=ticket%20abc%2F123'
    )
  })

  it('appends an event_update message to the action log', async () => {
    const { getWsTicket } = await import('./useSimulation')
    vi.mocked(getWsTicket).mockResolvedValue('ticket-1')

    renderHook(() => useWebSocket('INC-42'))
    await waitFor(() => expect(MockWebSocket.instances).toHaveLength(1))

    const update = { type: 'event_update', message: 'New evidence flagged.', timestamp: 'now' }
    MockWebSocket.instances[0].onmessage?.({ data: JSON.stringify(update) })

    expect(useSimulationStore.getState().actionLog).toEqual([update])
  })

  it('ignores a non event_update message', async () => {
    const { getWsTicket } = await import('./useSimulation')
    vi.mocked(getWsTicket).mockResolvedValue('ticket-1')

    renderHook(() => useWebSocket('INC-42'))
    await waitFor(() => expect(MockWebSocket.instances).toHaveLength(1))

    MockWebSocket.instances[0].onmessage?.({ data: JSON.stringify({ type: 'ping' }) })

    expect(useSimulationStore.getState().actionLog).toEqual([])
  })

  it('closes the socket on unmount', async () => {
    const { getWsTicket } = await import('./useSimulation')
    vi.mocked(getWsTicket).mockResolvedValue('ticket-1')

    const { unmount } = renderHook(() => useWebSocket('INC-42'))
    await waitFor(() => expect(MockWebSocket.instances).toHaveLength(1))

    unmount()

    expect(MockWebSocket.instances[0].closed).toBe(true)
  })

  it('never opens a socket if the ticket resolves after the component already unmounted', async () => {
    const { getWsTicket } = await import('./useSimulation')
    let resolveTicket: (ticket: string) => void = () => {}
    vi.mocked(getWsTicket).mockReturnValue(
      new Promise((resolve) => {
        resolveTicket = resolve
      })
    )

    const { unmount } = renderHook(() => useWebSocket('INC-42'))
    unmount()
    resolveTicket('ticket-1')
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(MockWebSocket.instances).toHaveLength(0)
  })

  it('logs (and does not throw) when fetching the ticket fails', async () => {
    const { getWsTicket } = await import('./useSimulation')
    vi.mocked(getWsTicket).mockRejectedValue(new Error('network down'))
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    renderHook(() => useWebSocket('INC-42'))

    await waitFor(() => expect(consoleError).toHaveBeenCalled())
    expect(MockWebSocket.instances).toHaveLength(0)
  })
})
