import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Scoreboard from '../components/Scoreboard'
import PostMortemComparison from '../components/PostMortemComparison'
import Spinner from '../components/common/Spinner'
import ScreenBezel from '../components/common/ScreenBezel'
import { useSimulationStore, getAuthHeaders } from '../hooks/useSimulation'
import { API_BASE } from '../lib/constants'
import { getLanguageHeader } from '../lib/language'
import { playBootComplete, playError } from '../lib/sound'

async function completeIncident(incidentId: string) {
  const res = await fetch(`${API_BASE}/incidents/${incidentId}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders(), ...getLanguageHeader() },
  })
  if (!res.ok) throw new Error(`Complete failed: ${res.status}`)
  return res.json()
}

export default function ReportPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const startSimulation = useSimulationStore((state) => state.startSimulation)
  const incident = useSimulationStore((state) => state.incident)
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchReport = async () => {
    if (!incident) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await completeIncident(incident.incidentId)
      setReport(result)
      // resolved is undefined for older/mocked report shapes -- don't
      // play the failure tone in that case, just skip the cue entirely.
      if (result.resolved === false) {
        playError()
      } else if (result.resolved === true) {
        playBootComplete()
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : t('report.failedToGenerate')
      console.error('Failed to fetch report:', err)
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReport()
  }, [incident])

  const handleNextSimulation = () => {
    // Continue in the same scenario the analyst just completed, instead
    // of silently defaulting to silent_login_v1 regardless of what was
    // played (harmless when there was only one scenario, a real bug now
    // that there are two).
    startSimulation(incident?.scenarioId)
    navigate('/simulation')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary text-text-primary p-8 flex items-center justify-center">
        <Spinner label={t('report.generatingReport')} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="page min-h-screen bg-bg-primary text-text-primary p-6 max-w-4xl mx-auto space-y-6">
        <div className="border border-accent-danger rounded p-4 bg-accent-danger/10">
          <h2 className="text-sm font-semibold text-accent-danger mb-2">{t('report.failedToGenerate')}</h2>
          <p className="text-sm text-text-primary mb-4">{error}</p>
          <button
            onClick={fetchReport}
            disabled={loading}
            className="border border-accent-danger text-accent-danger px-4 py-2 text-xs uppercase tracking-wide hover:bg-accent-danger/10 transition-all disabled:opacity-50"
          >
            {loading ? t('report.retrying') : t('report.retry')}
          </button>
        </div>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="page min-h-screen bg-bg-primary text-text-primary p-6 max-w-4xl mx-auto space-y-6">
        <div className="border border-border-default rounded p-4">
          <p className="text-sm text-text-secondary">{t('report.noReportData')}</p>
        </div>
      </div>
    )
  }

  const idealChain: { step: number; action: string }[] = report.ideal_chain ?? []
  const yourChain: { step: number; action: string }[] = report.your_chain ?? []
  const stepCount = Math.max(idealChain.length, yourChain.length)
  const comparisonSteps = Array.from({ length: stepCount }, (_, i) => {
    const idealAction = idealChain[i]?.action
    const yourAction = yourChain[i]?.action
    const status: 'correct' | 'wrong' | 'missing' =
      yourAction && yourAction === idealAction ? 'correct' : yourAction ? 'wrong' : 'missing'
    return {
      step: i + 1,
      ideal: idealAction ?? t('postMortem.none'),
      yours: yourAction ?? t('postMortem.notDone'),
      status,
    }
  })

  return (
    <div className="page min-h-screen bg-bg-primary text-text-primary p-6 max-w-4xl mx-auto space-y-6">
      <Scoreboard
        finalScore={report.score}
        breakdown={[
          { label: t('scoreboard.detection'), value: report.categories?.detection_score },
          { label: t('scoreboard.decision'), value: report.categories?.decision_score },
          { label: t('scoreboard.response'), value: report.categories?.response_score },
        ]}
        outcome={report.outcome}
        resolved={report.resolved}
      />

      <PostMortemComparison steps={comparisonSteps} />

      <div>
        <h2 className="text-sm uppercase text-text-secondary mb-2">{t('report.feedback')}</h2>
        <ScreenBezel glow="info">
          <p className="p-4 text-sm leading-relaxed">{report.feedback}</p>
        </ScreenBezel>
      </div>

      <div className="flex justify-center gap-3">
        <button
          onClick={handleNextSimulation}
          className="border border-accent-success text-accent-success px-4 py-2 text-xs uppercase tracking-wide hover:bg-accent-success/10 transition-all"
        >
          {t('report.nextSimulation')}
        </button>
        <button
          onClick={() => navigate('/')}
          className="border border-border-default text-text-secondary px-4 py-2 text-xs uppercase tracking-wide hover:border-border-highlight transition-all"
        >
          {t('report.home')}
        </button>
      </div>
    </div>
  )
}
