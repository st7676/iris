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
    <div className="page min-h-screen flex items-center justify-center bg-bg-primary px-4">
      <div className="w-full max-w-md p-8 space-y-8 bg-bg-secondary border border-border-default rounded-lg">
        <div className="text-center space-y-3">
          <div className="text-accent-primary text-2xl font-bold tracking-widest">
            ◆ ◆ ◆
          </div>
          <h1 className="font-display text-4xl font-bold tracking-widest" style={{color: '#2dd4bf'}}>
            IRIS
          </h1>
          <p className="text-xs uppercase tracking-widest text-text-muted">
            Cyber Defense Console
          </p>
        </div>

        <form onSubmit={showRegister ? handleRegister : handleLogin} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs uppercase mb-2 block tracking-widest text-text-secondary">
              {showRegister ? 'Email' : 'Username'}
            </label>
            <input
              type={showRegister ? 'email' : 'text'}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={showRegister ? 'user@example.com' : 'username'}
              disabled={loading}
              className="w-full px-4 py-2 bg-bg-primary border border-border-default text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary/30 rounded transition-all disabled:opacity-50"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase mb-2 block tracking-widest text-text-secondary">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              disabled={loading}
              className="w-full px-4 py-2 bg-bg-primary border border-border-default text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary/30 rounded transition-all disabled:opacity-50"
              required
            />
          </div>

          {error && (
            <div className="border border-accent-danger bg-accent-danger/10 text-accent-danger p-3 rounded text-xs uppercase tracking-wide">
              ✗ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 uppercase tracking-widest text-sm font-bold bg-accent-primary text-bg-primary hover:bg-accent-primary/90 rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing…' : showRegister ? 'Create Account' : 'Access System'}
          </button>
        </form>

        <div className="border-t border-border-default pt-4 text-center space-y-3">
          <p className="text-xs uppercase tracking-widest text-text-muted">
            {showRegister ? 'Already have access?' : 'Need an account?'}
          </p>
          <button
            onClick={() => {
              setShowRegister(!showRegister)
              setError('')
            }}
            disabled={loading}
            className="w-full py-2 px-4 uppercase tracking-widest text-xs border border-border-default text-text-secondary hover:text-accent-primary hover:border-accent-primary rounded transition-all disabled:opacity-50"
          >
            {showRegister ? 'Return to Login' : 'Register New Account'}
          </button>
        </div>
      </div>
    </div>
  )
}
