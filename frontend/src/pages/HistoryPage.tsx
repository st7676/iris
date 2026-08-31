import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Spinner from '../components/common/Spinner'
import ScreenBezel from '../components/common/ScreenBezel'
import { useSimulationStore, getAuthHeaders } from '../hooks/useSimulation'
import { API_BASE } from '../lib/constants'

const severityColor = {
  low: 'text-accent-success',
  medium: 'text-accent-warning',
  high: 'text-accent-danger',
}

interface HistorySession {
  id: string
  scenario: string
  date: string
  score: number
  severity: 'low' | 'medium' | 'high'
}

export default function HistoryPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const userId = useSimulationStore((state) => state.userId)
  const [history, setHistory] = useState<HistorySession[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchHistory = async () => {
      if (!userId) {
        setLoading(false)
        return
      }

      try {
        const res = await fetch(`${API_BASE}/users/${userId}/history`, { headers: getAuthHeaders() })
        if (!res.ok) throw new Error('Failed to fetch history')
        const data = await res.json()

        setHistory(
          data.sessions?.map((s: any) => ({
            id: s.incident_id || 'Unknown',
            scenario: t('history.unknownScenario'),
            date: new Date(s.completed_at).toLocaleDateString(),
            score: Math.round(s.score),
            severity: s.score >= 80 ? 'low' : s.score >= 60 ? 'medium' : 'high',
          })) || []
        )
      } catch (error) {
        console.error('Failed to fetch history:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchHistory()
  }, [userId, t])

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary text-text-primary p-8 flex items-center justify-center">
        <Spinner label={t('history.loadingHistory')} />
      </div>
    )
  }

  return (
    <div className="page min-h-screen bg-bg-primary text-text-primary p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg uppercase tracking-widest text-accent-success font-bold">
          {t('history.title')}
        </h1>
        <button
          onClick={() => navigate('/')}
          className="text-xs uppercase text-text-secondary hover:text-text-primary transition-colors"
        >
          {t('history.backToHome')}
        </button>
      </div>

      {history.length === 0 ? (
        <div className="border border-border-default rounded p-4 text-center">
          <p className="text-sm text-text-secondary">{t('history.noHistory')}</p>
        </div>
      ) : (
        <ScreenBezel glow="info">
          <div className="divide-y divide-border-default">
            {history.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-4 hover:bg-bg-tertiary transition-colors cursor-pointer"
                onClick={() => navigate('/report')}
              >
                <div>
                  <p className="text-sm font-bold">{session.scenario}</p>
                  <p className="text-xs text-text-secondary">{session.id} | {session.date}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-accent-success">{session.score}%</p>
                  <p className={`text-xs uppercase ${severityColor[session.severity]}`}>
                    {session.severity}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScreenBezel>
      )}
    </div>
  )
}
