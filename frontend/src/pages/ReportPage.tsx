const mockReport = {
  finalScore: 89,
  detection: 95,
  decision: 85,
  response: 90,
  steps: [
    { step: 1, ideal: 'Check Email Logs', yours: 'Check Email Logs', status: 'correct' },
    { step: 2, ideal: 'Check Auth Logs', yours: 'Check File Access', status: 'wrong' },
    { step: 3, ideal: 'Check Endpoint Logs', yours: 'Check Auth Logs', status: 'wrong' },
    { step: 4, ideal: 'Reset Password + MFA', yours: 'Reset Password + MFA', status: 'correct' },
    { step: 5, ideal: 'Isolate Device', yours: '(Not Done)', status: 'missing' },
  ],
  feedback:
    'You correctly prioritized the email logs first, which is excellent incident triage. However, you skipped authentication logs before checking file access. Always establish HOW the attacker gained access BEFORE assessing WHAT was compromised.',
}

const statusIcon = {
  correct: 'text-accent-success',
  wrong: 'text-accent-danger',
  missing: 'text-accent-danger',
}

export default function ReportPage() {
  return (
    <div className="min-h-screen bg-bg-primary text-text-primary p-6 max-w-4xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-lg uppercase tracking-widest text-text-secondary">
          Simulation Complete
        </h1>
        <p className="text-4xl font-bold text-accent-success mt-2">
          {mockReport.finalScore}%
        </p>
      </div>

      <div className="border border-border-default rounded p-4 space-y-3">
        <h2 className="text-sm uppercase text-text-secondary">Performance Breakdown</h2>
        {[
          { label: 'Detection', value: mockReport.detection },
          { label: 'Decision', value: mockReport.decision },
          { label: 'Response', value: mockReport.response },
        ].map((item) => (
          <div key={item.label}>
            <div className="flex justify-between text-xs mb-1">
              <span className="uppercase text-text-secondary">{item.label}</span>
              <span className="text-accent-success">{item.value}%</span>
            </div>
            <div className="h-2 bg-bg-tertiary rounded overflow-hidden">
              <div
                className="h-full bg-accent-success"
                style={{ width: `${item.value}%` }}
              />
            </div>
          </div>
        ))}
      </div>

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
            {mockReport.steps.map((row) => (
              <tr key={row.step} className="border-b border-border-default">
                <td className="py-1">{row.step}</td>
                <td className="py-1">{row.ideal}</td>
                <td className="py-1">{row.yours}</td>
                <td className={`py-1 ${statusIcon[row.status as keyof typeof statusIcon]}`}>
                  {row.status === 'correct' ? '✓ Correct' : row.status === 'wrong' ? '✗ Wrong' : '✗ Missing'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border border-border-default rounded p-4">
        <h2 className="text-sm uppercase text-text-secondary mb-2">Feedback</h2>
        <p className="text-sm leading-relaxed">{mockReport.feedback}</p>
      </div>

      <div className="flex justify-center gap-3">
        <button className="border border-accent-success text-accent-success px-4 py-2 text-xs uppercase tracking-wide hover:bg-accent-success/10 transition-all">
          Next Simulation
        </button>
        <button className="border border-border-default text-text-secondary px-4 py-2 text-xs uppercase tracking-wide hover:border-border-highlight transition-all">
          Home
        </button>
      </div>
    </div>
  )
}
