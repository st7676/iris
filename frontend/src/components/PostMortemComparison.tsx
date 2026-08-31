import { useTranslation } from 'react-i18next'
import ScreenBezel from './common/ScreenBezel'
import { IconCheck, IconX } from './common/icons'

interface ComparisonStep {
  step: number
  ideal: string
  yours: string
  status: 'correct' | 'wrong' | 'missing'
}

interface PostMortemComparisonProps {
  steps: readonly ComparisonStep[]
}

const statusColor = {
  correct: 'text-accent-success',
  wrong: 'text-accent-danger',
  missing: 'text-accent-danger',
}

const statusIcon = {
  correct: IconCheck,
  wrong: IconX,
  missing: IconX,
}

export default function PostMortemComparison({ steps }: PostMortemComparisonProps) {
  const { t } = useTranslation()
  const statusText = {
    correct: t('postMortem.correct'),
    wrong: t('postMortem.wrong'),
    missing: t('postMortem.missing'),
  }

  return (
    <div>
      <h2 className="text-sm uppercase text-text-secondary mb-3">{t('postMortem.title')}</h2>
      <ScreenBezel glow="info">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="text-accent-success uppercase text-left border-b border-border-default">
              <th className="py-2 pl-4">{t('postMortem.step')}</th>
              <th className="py-2">{t('postMortem.idealChain')}</th>
              <th className="py-2">{t('postMortem.yourChain')}</th>
              <th className="py-2 pr-4">{t('postMortem.status')}</th>
            </tr>
          </thead>
          <tbody>
            {steps.map((row) => {
              const StatusIcon = statusIcon[row.status]
              return (
                <tr key={row.step} className="border-b border-border-default last:border-b-0">
                  <td className="py-2 pl-4">{row.step}</td>
                  <td className="py-2">{row.ideal}</td>
                  <td className="py-2">{row.yours}</td>
                  <td className={`py-2 pr-4 ${statusColor[row.status]}`}>
                    <span className="inline-flex items-center gap-1.5">
                      <StatusIcon className="shrink-0" />
                      {statusText[row.status]}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </ScreenBezel>
    </div>
  )
}
