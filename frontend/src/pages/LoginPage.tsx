import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSimulationStore } from '../hooks/useSimulation'
import ScreenBezel from '../components/common/ScreenBezel'
import { IconAlert } from '../components/common/icons'
import { playSuccess, playError } from '../lib/sound'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useSimulationStore()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showRegister, setShowRegister] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!username || !password) {
      setError('Agent codename and passphrase are required')
      playError()
      return
    }
    setLoading(true)

    try {
      await login(username, password)
      playSuccess()
      navigate('/')
    } catch (err) {
      playError()
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!username || !password) {
      setError('Agent codename and passphrase are required')
      playError()
      return
    }
    setLoading(true)

    try {
      await login(username, password, true)
      playSuccess()
      navigate('/')
    } catch (err) {
      playError()
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page min-h-screen flex items-center justify-center bg-bg-primary px-4">
      <ScreenBezel glow="info" className="w-full max-w-md">
        <div className="p-8 pt-10 space-y-6">
          <div className="text-center">
            <span className="stamp border-accent-danger text-accent-danger text-glow-danger text-[10px]">
              Restricted Access
            </span>
            <h1 className="font-display briefing-glow mt-3 text-3xl tracking-widest">
              IRIS
            </h1>
            <p className="mt-2 text-xs uppercase tracking-widest opacity-70">
              Case File Access Terminal
            </p>
          </div>

          <form
            onSubmit={showRegister ? handleRegister : handleLogin}
            noValidate
            className="space-y-4"
          >
            <div className="text-left">
              <label className="text-xs uppercase mb-1 block tracking-widest opacity-80">
                Agent Codename
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="agent_codename"
                disabled={loading}
                className="w-full px-3 py-2 border-2 border-border-default bg-bg-tertiary text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-success disabled:opacity-50"
                required
              />
            </div>

            <div className="text-left">
              <label className="text-xs uppercase mb-1 block tracking-widest opacity-80">
                Passphrase
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••••••"
                disabled={loading}
                className="w-full px-3 py-2 border-2 border-border-default bg-bg-tertiary text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-success disabled:opacity-50"
                required
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 border-2 border-accent-danger bg-accent-danger/10 text-accent-danger p-3 text-xs uppercase tracking-wide">
                <IconAlert className="shrink-0" />
                {error}
              </div>
            )}

            {/* Primary submit action -- uses the palette's success/amber
                accent (matching BriefingPage's "Begin Simulation" CTA), not
                danger/red: red is reserved elsewhere in this app for
                destructive actions (e.g. ActionButton's danger variant),
                so a primary "log in" button shouldn't read as one. */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 uppercase tracking-widest text-sm font-bold border-2 border-accent-success text-accent-success hover:bg-accent-success/10 hover:shadow-[0_0_20px_rgb(var(--glow-success)/0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing…' : showRegister ? 'Create Account' : 'Access System'}
            </button>
          </form>

          <div className="border-t border-border-default pt-4 text-center">
            <p className="text-xs uppercase tracking-widest opacity-70 mb-3">
              {showRegister ? 'Already have access?' : 'Need credentials?'}
            </p>
            <button
              onClick={() => {
                setShowRegister(!showRegister)
                setError('')
              }}
              disabled={loading}
              className="w-full py-2 px-4 uppercase tracking-widest text-xs border-2 border-accent-info text-accent-info hover:bg-accent-info/10 transition-all disabled:opacity-50"
            >
              {showRegister ? 'Return to Login' : 'Register New Agent'}
            </button>
          </div>
        </div>
      </ScreenBezel>
    </div>
  )
}
