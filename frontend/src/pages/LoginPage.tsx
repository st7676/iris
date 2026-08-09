import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSimulationStore } from '../hooks/useSimulation'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, logout } = useSimulationStore()
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
    <div className="page min-h-screen flex items-center justify-center bg-bg-primary retro-scan retro-flicker relative">
      <button
        onClick={() => {
          logout()
          navigate('/login')
        }}
        className="absolute top-4 right-4 text-xs text-text-secondary border-2 border-accent-info px-3 py-1 hover:border-accent-danger hover:text-accent-danger hover:shadow-[0_0_10px_rgba(255,56,96,0.5)] transition-all uppercase tracking-widest"
        style={{ textShadow: '0 0 8px rgba(0,212,255,0.5)' }}
      >
        [LOGOUT]
      </button>

      <div className="w-full max-w-md retro-scan p-8 text-center space-y-8 relative" style={{
        border: '3px solid #00ff88',
        backgroundColor: 'rgba(10, 14, 39, 0.95)',
        boxShadow: '0 0 30px #00ff88, inset 0 0 30px rgba(0,255,136,0.05)',
      }}>
        {/* HUD Corner Brackets */}
        <div className="absolute top-2 left-2 w-6 h-6" style={{
          borderTop: '2px solid #00ff88',
          borderLeft: '2px solid #00ff88',
        }} />
        <div className="absolute top-2 right-2 w-6 h-6" style={{
          borderTop: '2px solid #00ff88',
          borderRight: '2px solid #00ff88',
        }} />
        <div className="absolute bottom-2 left-2 w-6 h-6" style={{
          borderBottom: '2px solid #00ff88',
          borderLeft: '2px solid #00ff88',
        }} />
        <div className="absolute bottom-2 right-2 w-6 h-6" style={{
          borderBottom: '2px solid #00ff88',
          borderRight: '2px solid #00ff88',
        }} />

        <div>
          <h1 className="text-4xl font-bold tracking-widest retro-glow" style={{
            fontFamily: "'Courier New', monospace",
            letterSpacing: '0.2em',
          }}>
            ▌IRIS▌
          </h1>
          <p className="text-xs text-text-secondary mt-3 uppercase tracking-widest" style={{
            fontFamily: "'Courier New', monospace",
            textShadow: '0 0 8px rgba(0,212,255,0.3)',
          }}>
            AI-Powered Cyber Training
          </p>
          <div className="mt-4 h-px bg-gradient-to-r from-transparent via-accent-success to-transparent" />
        </div>

        <form onSubmit={showRegister ? handleRegister : handleLogin} className="space-y-5">
          <div className="text-left">
            <label className="text-xs text-accent-info uppercase mb-2 block tracking-widest" style={{
              textShadow: '0 0 8px rgba(0,212,255,0.5)',
              fontFamily: "'Courier New', monospace",
            }}>
              ► Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="agent_codename"
              disabled={loading}
              className="w-full px-4 py-2 text-text-primary placeholder-text-secondary/50 focus:outline-none disabled:opacity-50 uppercase tracking-wide"
              style={{
                backgroundColor: 'rgba(15, 19, 53, 0.8)',
                border: '2px solid #00ff88',
                boxShadow: 'inset 0 0 10px rgba(0,255,136,0.1)',
                fontFamily: "'Courier New', monospace",
                color: '#00ff88',
                textShadow: '0 0 5px rgba(0,255,136,0.5)',
              }}
              required
            />
          </div>

          <div className="text-left">
            <label className="text-xs text-accent-info uppercase mb-2 block tracking-widest" style={{
              textShadow: '0 0 8px rgba(0,212,255,0.5)',
              fontFamily: "'Courier New', monospace",
            }}>
              ► Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••••••"
              disabled={loading}
              className="w-full px-4 py-2 text-text-primary placeholder-text-secondary/50 focus:outline-none disabled:opacity-50"
              style={{
                backgroundColor: 'rgba(15, 19, 53, 0.8)',
                border: '2px solid #00ff88',
                boxShadow: 'inset 0 0 10px rgba(0,255,136,0.1)',
                fontFamily: "'Courier New', monospace",
                color: '#00ff88',
                textShadow: '0 0 5px rgba(0,255,136,0.5)',
              }}
              required
            />
          </div>

          {error && (
            <div className="p-3 uppercase text-xs tracking-widest" style={{
              backgroundColor: 'rgba(255, 56, 96, 0.1)',
              border: '2px solid #ff3860',
              color: '#ff3860',
              fontFamily: "'Courier New', monospace",
              textShadow: '0 0 8px rgba(255,56,96,0.5)',
            }}>
              ✗ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 uppercase tracking-widest text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              border: '2px solid #00ff88',
              color: '#00ff88',
              backgroundColor: 'rgba(0,255,136,0.05)',
              fontFamily: "'Courier New', monospace",
              textShadow: '0 0 10px #00ff88',
              boxShadow: loading
                ? '0 0 15px #ff6b35'
                : '0 0 20px #00ff88, inset 0 0 20px rgba(0,255,136,0.1)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 0 30px #00ff88, inset 0 0 30px rgba(0,255,136,0.2)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 0 20px #00ff88, inset 0 0 20px rgba(0,255,136,0.1)'
            }}
          >
            {loading ? '[ PROCESSING... ]' : showRegister ? '[ CREATE ACCOUNT ]' : '[ ACCESS SYSTEM ]'}
          </button>
        </form>

        <div className="h-px bg-gradient-to-r from-transparent via-accent-success to-transparent" />

        <div>
          <p className="text-xs text-text-secondary mb-4 uppercase tracking-widest" style={{
            fontFamily: "'Courier New', monospace",
            textShadow: '0 0 5px rgba(0,212,255,0.3)',
          }}>
            {showRegister ? '> Already have access?' : '> Need credentials?'}
          </p>
          <button
            onClick={() => {
              setShowRegister(!showRegister)
              setError('')
            }}
            disabled={loading}
            className="w-full py-2 px-4 uppercase tracking-widest text-xs transition-all disabled:opacity-50"
            style={{
              border: '2px solid #00d4ff',
              color: '#00d4ff',
              backgroundColor: 'transparent',
              fontFamily: "'Courier New', monospace",
              textShadow: '0 0 8px rgba(0,212,255,0.5)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 0 20px #00d4ff'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            {showRegister ? '[ RETURN TO LOGIN ]' : '[ REGISTER NEW AGENT ]'}
          </button>
        </div>
      </div>
    </div>
  )
}
