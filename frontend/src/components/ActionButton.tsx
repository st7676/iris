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
        ? 'border-border-default text-text-secondary hover:border-accent-primary hover:text-accent-primary'
        : 'border-accent-primary text-accent-primary hover:bg-accent-primary/10 hover:shadow-[0_0_10px_rgb(var(--glow-primary)/0.3)]'

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`border rounded px-3 py-2 text-xs uppercase tracking-wide transition-all disabled:opacity-50 disabled:cursor-not-allowed ${colorClasses}`}
    >
      {label}
    </button>
  )
}
