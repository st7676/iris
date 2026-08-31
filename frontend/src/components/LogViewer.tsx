interface LogEntry {
  time: string
  source: string
  type: string
  details: string
}

interface LogViewerProps {
  logs: LogEntry[]
}

export default function LogViewer({ logs }: LogViewerProps) {
  return (
    <table className="w-full text-xs font-mono">
      <thead>
        <tr className="bg-bg-tertiary text-accent-success uppercase text-left">
          <th className="px-2 py-1">Time</th>
          <th className="px-2 py-1">Source</th>
          <th className="px-2 py-1">Type</th>
          <th className="px-2 py-1">Details</th>
        </tr>
      </thead>
      <tbody>
        {logs.map((log, index) => (
          <tr
            key={index}
            className="border-t border-border-default hover:bg-bg-tertiary transition-colors"
          >
            <td className="px-2 py-1 text-text-secondary">{log.time}</td>
            <td className="px-2 py-1">{log.source}</td>
            <td className="px-2 py-1">{log.type}</td>
            <td className="px-2 py-1">{log.details}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
