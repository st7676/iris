interface SpinnerProps {
  label?: string
}

export default function Spinner({ label }: SpinnerProps) {
  return (
    <div className="flex items-center gap-2 text-text-secondary">
      <div className="w-4 h-4 border-2 border-border-highlight border-t-accent-success rounded-full animate-spin" />
      {label && <span className="text-xs uppercase">{label}</span>}
    </div>
  )
}
