interface ActionButtonProps {
  label: string
  onClick?: () => void
  disabled?: boolean
  variant?: 'default' | 'danger' | 'secondary'
}

export default function ActionButton({ label, onClick, disabled, variant = 'default' }: ActionButtonProps) {
  const colorClasses =
    variant === 'danger'
      ? 'border-accent-danger text-accent-danger hover:bg-accent-danger/10 hover:shadow-[0_0_10px_rgb(var(--glow-danger)/0.4)]'
      : variant === 'secondary'
        ? 'border-text-secondary text-text-secondary hover:bg-text-secondary/10'
        : 'border-accent-success text-accent-success hover:bg-accent-success/10 hover:shadow-[0_0_10px_rgb(var(--glow-success)/0.4)]'

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`border px-3 py-2 text-xs uppercase tracking-wide transition-all disabled:opacity-50 disabled:cursor-not-allowed ${colorClasses}`}
    >
      {label}
    </button>
  )
}
