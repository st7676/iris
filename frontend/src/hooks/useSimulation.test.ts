import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getAuthHeaders, getStoredToken, useSimulationStore } from './useSimulation'

function mockFetchOnce(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  const { ok = true, status = 200 } = init
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValueOnce({
      ok,
      status,
      json: async () => body,
    })
  )
}

describe('useSimulation store', () => {
  beforeEach(() => {
    localStorage.clear()
    useSimulationStore.setState({
      incident: null,
      timeline: [],
      evidence: [],
      actionLog: [],
      completed: false,
      userId: null,
      token: null,
    })
    vi.unstubAllGlobals()
  })

  it('login stores the user id and token in localStorage and in state', async () => {
    mockFetchOnce({ user: { id: 'user-1' }, access_token: 'token-abc' })

    await useSimulationStore.getState().login('alice', 'secret')

    expect(localStorage.getItem('iris_user_id')).toBe('user-1')
    expect(localStorage.getItem('iris_access_token')).toBe('token-abc')
    expect(useSimulationStore.getState().userId).toBe('user-1')
    expect(getStoredToken()).toBe('token-abc')
  })

  it('login surfaces the backend error message on failure', async () => {
    mockFetchOnce({ detail: 'Invalid credentials' }, { ok: false, status: 401 })

    await expect(useSimulationStore.getState().login('alice', 'wrong')).rejects.toThrow(
      'Invalid credentials'
    )
    expect(useSimulationStore.getState().userId).toBeNull()
  })

  it('getAuthHeaders is empty when logged out and carries the bearer token when logged in', () => {
    expect(getAuthHeaders()).toEqual({})

    localStorage.setItem('iris_access_token', 'token-xyz')

    expect(getAuthHeaders()).toEqual({ Authorization: 'Bearer token-xyz' })
  })

  it('logout clears local session state even if the revoke request fails', async () => {
    localStorage.setItem('iris_user_id', 'user-1')
    localStorage.setItem('iris_access_token', 'token-abc')
    useSimulationStore.setState({ userId: 'user-1', token: 'token-abc' })
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('network down')))

    useSimulationStore.getState().logout()

    expect(localStorage.getItem('iris_user_id')).toBeNull()
    expect(localStorage.getItem('iris_access_token')).toBeNull()
    expect(useSimulationStore.getState().userId).toBeNull()
    expect(useSimulationStore.getState().token).toBeNull()
  })

  it('startSimulation requires a logged-in user', async () => {
    await expect(useSimulationStore.getState().startSimulation('silent_login_v1')).rejects.toThrow(
      'User must be logged in to start simulation'
    )
    expect(useSimulationStore.getState().incident?.incidentId).toBe('SF-2026-ERROR')
  })

  it('startSimulation populates the incident from the API response', async () => {
    useSimulationStore.setState({ userId: 'user-1' })
    mockFetchOnce({
      incident_id: 'INC-42',
      severity: 'high',
      alert_message: 'Suspicious login detected',
      timestamp: '2026-08-31T00:00:00Z',
    })

    await useSimulationStore.getState().startSimulation('silent_login_v1')

    const { incident } = useSimulationStore.getState()
    expect(incident).toMatchObject({
      incidentId: 'INC-42',
      scenarioId: 'silent_login_v1',
      severity: 'high',
      alertMessage: 'Suspicious login detected',
    })
  })
})
