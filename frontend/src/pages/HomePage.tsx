import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import MetaBadge from '../components/common/MetaBadge'
import ScreenBezel from '../components/common/ScreenBezel'
import { IconClock, IconBot, IconTarget } from '../components/common/icons'
import { useSimulationStore } from '../hooks/useSimulation'
import { SCENARIOS } from '../lib/scenarios'
import { playClick } from '../lib/sound'

export default function HomePage() {
  const navigate = useNavigate()
  const { logout } = useSimulationStore()
  const { t } = useTranslation()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // Scenario choice goes to the briefing screen first, not straight into
  // the simulation -- startSimulation() is only called once the analyst
  // confirms they're ready there (see BriefingPage).
  const goToBriefing = (scenarioId: string) => {
    playClick()
    navigate(`/briefing/${scenarioId}`)
  }

  return (
    <div className="page min-h-screen bg-bg-primary p-4">
      <button
        onClick={handleLogout}
        className="absolute top-4 right-4 text-xs text-text-secondary border border-border-default px-3 py-1 hover:border-accent-danger hover:text-accent-danger transition-colors"
      >
        {t('home.logout')}
      </button>

      <div className="max-w-4xl mx-auto flex flex-col items-center py-12 text-center">
        <p className="text-xs uppercase tracking-[0.4em] text-accent-danger mb-4 animate-pulse">
          {t('home.incomingTransmission')}
        </p>

        <h1 className="briefing-glow font-display text-5xl sm:text-6xl tracking-widest text-accent-success">
          IRIS
        </h1>

        <p className="mt-4 max-w-xl text-lg text-text-primary leading-relaxed">
          {t('home.subtitle')}
          <span className="text-accent-danger"> {t('home.subtitleHighlight')}</span>
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <MetaBadge icon={<IconClock />} label={t('home.badgeDuration')} />
          <MetaBadge icon={<IconBot />} label={t('home.badgeAi')} />
          <MetaBadge icon={<IconTarget />} label={t('home.badgeTraining')} />
        </div>

        <p className="mt-10 font-display text-xs uppercase tracking-widest text-text-secondary">
          {t('home.openCaseFile')}
        </p>
        <div className="mt-4 grid w-full max-w-2xl gap-6 sm:grid-cols-2">
          {Object.values(SCENARIOS).map((scenario) => (
            <ScreenBezel
              key={scenario.id}
              glow="info"
              className="hover:-translate-y-1 hover:shadow-[0_14px_28px_rgba(0,0,0,0.55)] transition-transform"
            >
              <button
                onClick={() => goToBriefing(scenario.id)}
                className="relative z-10 w-full h-full p-5 pt-6 text-left hover:bg-bg-tertiary/60 transition-colors"
              >
                <span className="stamp border-accent-danger text-accent-danger text-glow-danger text-[10px]">
                  {t('home.caseFile')}
                </span>
                <p className="font-display mt-3 text-base">
                  {scenario.title}
                </p>
                <p className="mt-2 text-xs leading-relaxed opacity-80">{scenario.tagline}</p>
              </button>
            </ScreenBezel>
          ))}
        </div>

        <div className="mt-6 flex w-full max-w-2xl gap-4">
          <button
            onClick={() => navigate('/history')}
            className="flex-1 border border-border-default text-text-secondary py-2 px-4 uppercase tracking-wide text-sm hover:border-border-highlight transition-all"
          >
            {t('home.myHistory')}
          </button>
          <button
            onClick={() => navigate('/instructor-dashboard')}
            className="flex-1 border border-accent-warning text-accent-warning py-2 px-4 uppercase tracking-wide text-sm hover:bg-accent-warning/10 transition-all"
          >
            {t('home.instructorDashboard')}
          </button>
        </div>
      </div>
    </div>
  )
}
