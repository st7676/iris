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
    <div className="border border-border-default rounded p-4">
      <h2 className="text-sm uppercase text-text-secondary mb-3">Post-Mortem Walkthrough</h2>
      <table className="w-full text-xs font-mono">
        <thead>
          <tr className="text-accent-success uppercase text-left border-b border-border-default">
            <th className="py-1">Step</th>
            <th className="py-1">Ideal Chain</th>
            <th className="py-1">Your Chain</th>
            <th className="py-1">Status</th>
          </tr>
        </thead>
        <tbody>
          {steps.map((row) => (
            <tr key={row.step} className="border-b border-border-default">
              <td className="py-1">{row.step}</td>
              <td className="py-1">{row.ideal}</td>
              <td className="py-1">{row.yours}</td>
              <td className={`py-1 ${statusColor[row.status]}`}>{statusLabel[row.status]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
