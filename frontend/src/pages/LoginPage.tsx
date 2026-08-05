import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSimulationStore } from '../hooks/useSimulation'

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
    setLoading(true)

    try {
      await login(username, password)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(username, password, true)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page min-h-screen flex items-center justify-center bg-bg-primary">
      <div className="w-full max-w-md border border-border-default rounded-md p-8 text-center space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-widest text-accent-success">
            IRIS
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            AI-Powered Cyber Training
          </p>
        </div>

        <form onSubmit={showRegister ? handleRegister : handleLogin} className="space-y-4">
          <div className="text-left">
            <label className="text-xs text-text-secondary uppercase mb-1 block">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="your_username"
              disabled={loading}
              className="w-full bg-bg-secondary border border-border-default px-3 py-2 text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-accent-success disabled:opacity-50"
              required
            />
          </div>

          <div className="text-left">
            <label className="text-xs text-text-secondary uppercase mb-1 block">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
              className="w-full bg-bg-secondary border border-border-default px-3 py-2 text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-accent-success disabled:opacity-50"
              required
            />
          </div>

          {error && (
            <div className="p-3 bg-accent-error/10 border border-accent-error text-accent-error text-sm rounded">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full border border-accent-success text-accent-success py-2 px-4 uppercase tracking-wide text-sm hover:bg-accent-success/10 hover:shadow-[0_0_10px_rgba(0,255,65,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Loading...' : showRegister ? 'Create Account' : 'Log In'}
          </button>
        </form>

        <div className="border-t border-border-default pt-4">
          <p className="text-xs text-text-secondary mb-3">
            {showRegister ? 'Already have an account?' : 'No account yet?'}
          </p>
          <button
            onClick={() => {
              setShowRegister(!showRegister)
              setError('')
            }}
            disabled={loading}
            className="w-full border border-border-default text-text-secondary py-2 px-4 uppercase tracking-wide text-sm hover:border-border-highlight transition-all disabled:opacity-50"
          >
            {showRegister ? 'Back to Login' : 'Create Account'}
          </button>
        </div>
      </div>
    </div>
  )
}
