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

  describe('investigateEvidence', () => {
    beforeEach(() => {
      useSimulationStore.setState({
        incident: {
          incidentId: 'INC-42',
          scenarioId: 'silent_login_v1',
          severity: 'medium',
          alertMessage: 'Unusual login activity detected',
          startedAt: '2026-08-31T00:00:00Z',
        },
        timeline: [{ label: 'Check Email Logs', status: 'current' }],
        evidence: [],
        actionLog: [],
      })
    })

    it('throws when there is no incident in progress', async () => {
      useSimulationStore.setState({ incident: null })
      await expect(useSimulationStore.getState().investigateEvidence('Check Email Logs')).rejects.toThrow(
        'No incident in progress'
      )
    })

    it('sends the evidence_type resolved from the scenario config, not the raw label', async () => {
      const fetchMock = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ severity: 'medium' }),
      })
      vi.stubGlobal('fetch', fetchMock)

      await useSimulationStore.getState().investigateEvidence('Check Email Logs')

      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toBe('http://localhost:8000/api/incidents/INC-42/investigate')
      expect(JSON.parse(init.body)).toEqual({ evidence_type: 'email_logs' })
    })

    it('marks the matching timeline step done, records revealed evidence and the action log, and syncs severity', async () => {
      mockFetchOnce({ severity: 'high' })

      await useSimulationStore.getState().investigateEvidence('Check Email Logs')

      const state = useSimulationStore.getState()
      expect(state.incident?.severity).toBe('high')
      expect(state.timeline).toEqual([{ label: 'Check Email Logs', status: 'done' }])
      expect(state.evidence).toHaveLength(1)
      expect(state.evidence[0].id).toBe('email')
      expect(state.actionLog).toEqual([{ label: 'Check Email Logs', type: 'investigate' }])
    })

    it('adds a new current step for a different action than the one currently in progress', async () => {
      mockFetchOnce({ severity: 'medium' })

      await useSimulationStore.getState().investigateEvidence('Check Auth Logs')

      expect(useSimulationStore.getState().timeline).toEqual([
        { label: 'Check Email Logs', status: 'done' },
        { label: 'Check Auth Logs', status: 'current' },
      ])
    })

    it('does not duplicate evidence already revealed by an earlier investigate call', async () => {
      mockFetchOnce({ severity: 'medium' })
      await useSimulationStore.getState().investigateEvidence('Check Email Logs')

      mockFetchOnce({ severity: 'medium' })
      await useSimulationStore.getState().investigateEvidence('Check Email Logs')

      expect(useSimulationStore.getState().evidence).toHaveLength(1)
    })

    it('rejects and leaves state untouched when the API call fails', async () => {
      mockFetchOnce({}, { ok: false, status: 500 })

      await expect(useSimulationStore.getState().investigateEvidence('Check Email Logs')).rejects.toThrow(
        'Investigate failed: 500'
      )
      expect(useSimulationStore.getState().actionLog).toEqual([])
    })
  })

  describe('decide', () => {
    beforeEach(() => {
      useSimulationStore.setState({
        incident: {
          incidentId: 'INC-42',
          scenarioId: 'silent_login_v1',
          severity: 'high',
          alertMessage: 'Unusual login activity detected',
          startedAt: '2026-08-31T00:00:00Z',
        },
        timeline: [{ label: 'Reset Password + MFA', status: 'current' }],
        evidence: [],
        actionLog: [],
      })
    })

    it('throws when there is no incident in progress', async () => {
      useSimulationStore.setState({ incident: null })
      await expect(useSimulationStore.getState().decide('Reset Password + MFA')).rejects.toThrow(
        'No incident in progress'
      )
    })

    it('sends the decision resolved from the scenario config and records the action log', async () => {
      const fetchMock = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ severity: 'high' }),
      })
      vi.stubGlobal('fetch', fetchMock)

      await useSimulationStore.getState().decide('Reset Password + MFA')

      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toBe('http://localhost:8000/api/incidents/INC-42/decide')
      expect(JSON.parse(init.body)).toEqual({ decision: 'reset_password_mfa', notes: '' })
      expect(useSimulationStore.getState().actionLog).toEqual([
        { label: 'Reset Password + MFA', type: 'decide' },
      ])
    })

    it('rejects and leaves state untouched when the API call fails', async () => {
      mockFetchOnce({}, { ok: false, status: 500 })

      await expect(useSimulationStore.getState().decide('Reset Password + MFA')).rejects.toThrow(
        'Decide failed: 500'
      )
      expect(useSimulationStore.getState().actionLog).toEqual([])
    })
  })
})
