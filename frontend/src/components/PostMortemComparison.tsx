import ScreenBezel from './common/ScreenBezel'

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

const statusLabel = {
  correct: '✓ Correct',
  wrong: '✗ Wrong',
  missing: '✗ Missing',
}

export default function PostMortemComparison({ steps }: PostMortemComparisonProps) {
  return (
    <div>
      <h2 className="text-sm uppercase text-text-secondary mb-3">Post-Mortem Walkthrough</h2>
      <ScreenBezel glow="info">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="text-accent-success uppercase text-left border-b border-border-default">
              <th className="py-2 pl-4">Step</th>
              <th className="py-2">Ideal Chain</th>
              <th className="py-2">Your Chain</th>
              <th className="py-2 pr-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {steps.map((row) => (
              <tr key={row.step} className="border-b border-border-default last:border-b-0">
                <td className="py-2 pl-4">{row.step}</td>
                <td className="py-2">{row.ideal}</td>
                <td className="py-2">{row.yours}</td>
                <td className={`py-2 pr-4 ${statusColor[row.status]}`}>{statusLabel[row.status]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScreenBezel>
    </div>
  )
}
